"""
Forge pipeline service — the 4-call IBM Granite pipeline.

Architecture rules (CLAUDE.md):
  - ALL AI calls go through granite_service.generate_text only
  - The pipeline makes EXACTLY 4 Granite calls per forge() invocation
  - Calls 3A (execute_crafted) and 3B (execute_raw) run via asyncio.gather() simultaneously
  - Prompt templates loaded from backend/prompts/*.txt — never hardcoded here
  - All secrets from config.py settings — never os.getenv() directly

Pipeline order:
  1. Call 1 — detect_category: classify the raw input
  2. Call 2 — craft_prompt: build expert prompt using category template
  3. Calls 3A + 3B — execute_crafted and execute_raw in parallel
  4. Return ForgeResponse with all fields populated
"""

import asyncio
import logging
import time
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks

from backend.config import settings
from backend.db.supabase_client import supabase_client
from backend.models.forge import CallTiming, ForgeRequest, ForgeResponse
from backend.services.granite_service import GraniteError, GraniteResponse, generate_text

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


_INJECTION_PATTERNS = [
    "ignore above", "ignore previous", "new instruction",
    "system prompt", "you are now", "disregard",
    "forget everything", "override",
]


def _sanitize_input(text: str) -> str:
    """Strip prompt-injection phrases from user input.

    Case-insensitive substring removal.  Logs a warning when any pattern
    is found so we have visibility into attempted injections.
    """
    original_len = len(text)
    lowered = text.lower()
    found = [p for p in _INJECTION_PATTERNS if p in lowered]
    if found:
        for pattern in found:
            # Case-insensitive replace
            import re
            text = re.sub(re.escape(pattern), "", text, flags=re.IGNORECASE)
        text = " ".join(text.split())  # collapse whitespace
        logger.warning(
            "Sanitized input (len %d→%d): removed %s",
            original_len, len(text), found,
        )
    return text


def _load_template(name: str) -> str:
    """Load a prompt template by filename from backend/prompts/.

    Resolves the path relative to this file so it works regardless of the
    working directory the process was started from.
    """
    template_path = Path(__file__).parent.parent / "prompts" / name
    return template_path.read_text(encoding="utf-8")


def _detect_category_from_text(text: str) -> str:
    """Parse the category from Granite's detect_category output.

    Uses substring matching (not equality) on the lowercased text.
    Priority order:
      1. vibe_coding / vibe coding / coding
      2. brainstorm
      3. qa / question / quality
      4. one_shot / one shot / document / write / draft / plan
      5. Default: one_shot (general-purpose catch-all)
    """
    lowered = text.lower()
    if "vibe_coding" in lowered or "vibe coding" in lowered or "coding" in lowered:
        return "vibe_coding"
    if "brainstorm" in lowered:
        return "brainstorming"
    if "qa" in lowered or "question" in lowered or "quality" in lowered:
        return "qa"
    if "one_shot" in lowered or "one shot" in lowered:
        return "one_shot"
    return "one_shot"


async def _log_forge_event(request_input: str, response: ForgeResponse) -> None:
    """Fire-and-forget: insert a forge_event row into Supabase. NEVER raises.

    Wraps the synchronous Supabase call in run_in_executor so it does not
    block the async event loop. The outer try/except ensures any Supabase
    failure (network error, bad creds, etc.) is silently swallowed — the
    forge response has already been returned to the caller.
    """
    try:
        logger.info(
            "forge_event: category=%s total_ms=%.0f input_len=%d",
            response.category,
            response.total_latency_ms,
            len(request_input),
        )

        def _insert():
            supabase_client().table("forge_events").insert(
                {
                    "input_text": request_input,
                    "category": response.category,
                    "total_latency_ms": response.total_latency_ms,
                }
            ).execute()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _insert)
    except Exception as exc:
        logger.warning("forge_event log failed (non-fatal): %s", exc)


# ---------------------------------------------------------------------------
# Public pipeline function
# ---------------------------------------------------------------------------


async def forge(request: ForgeRequest, background_tasks: Optional[BackgroundTasks] = None) -> ForgeResponse:
    """Execute the 4-call IBM Granite forge pipeline.

    1. Call 1 — detect_category: classify input into vibe_coding / brainstorming / qa
    2. Call 2 — craft_prompt: generate expert prompt using category-specific template
    3. Calls 3A + 3B — execute_crafted and execute_raw in parallel via asyncio.gather()
    4. Build and return ForgeResponse; schedule forge_event logging as background task

    Parameters
    ----------
    request:          Validated ForgeRequest with .input field.
    background_tasks: FastAPI BackgroundTasks for fire-and-forget logging.

    Returns
    -------
    ForgeResponse with category, crafted_prompt, crafted_result, raw_result,
    call_timings (4 entries), and total_latency_ms.

    Raises
    ------
    GraniteError if any Granite call fails.
    """
    pipeline_start = time.perf_counter()
    call_timings: list[CallTiming] = []

    # Sanitize user input before it reaches any template
    safe_input = _sanitize_input(request.input)

    # ------------------------------------------------------------------
    # Call 1: Detect category
    # ------------------------------------------------------------------
    detect_template = _load_template("detect_category.txt")
    detect_prompt = detect_template.format(input=safe_input)

    detect_response: GraniteResponse = await generate_text(
        detect_prompt,
        call_name="detect_category",
        max_tokens=20,
    )
    call_timings.append(CallTiming(call_name="detect_category", latency_ms=detect_response.latency_ms))

    category = _detect_category_from_text(detect_response.text)
    logger.debug("Detected category: %s", category)

    # ------------------------------------------------------------------
    # Call 2: Craft expert prompt using category-specific template
    # ------------------------------------------------------------------
    craft_template = _load_template(f"craft_{category}.txt")
    craft_prompt = craft_template.format(input=safe_input)

    craft_response: GraniteResponse = await generate_text(
        craft_prompt,
        call_name="craft_prompt",
        max_tokens=settings.max_tokens_craft,
    )
    call_timings.append(CallTiming(call_name="craft_prompt", latency_ms=craft_response.latency_ms))

    crafted_prompt = craft_response.text.strip()

    # ------------------------------------------------------------------
    # Calls 3A + 3B: Execute crafted prompt and raw input in parallel
    # ------------------------------------------------------------------
    execute_crafted_response, execute_raw_response = await asyncio.gather(
        generate_text(
            crafted_prompt,
            call_name="execute_crafted",
            max_tokens=settings.max_tokens_execute,
        ),
        generate_text(
            safe_input,
            call_name="execute_raw",
            max_tokens=settings.max_tokens_execute,
        ),
    )
    call_timings.append(CallTiming(call_name="execute_crafted", latency_ms=execute_crafted_response.latency_ms))
    call_timings.append(CallTiming(call_name="execute_raw", latency_ms=execute_raw_response.latency_ms))

    # ------------------------------------------------------------------
    # Build response
    # ------------------------------------------------------------------
    total_latency_ms = round((time.perf_counter() - pipeline_start) * 1000, 1)

    result = ForgeResponse(
        category=category,
        crafted_prompt=crafted_prompt,
        crafted_result=execute_crafted_response.text,
        raw_result=execute_raw_response.text,
        call_timings=call_timings,
        total_latency_ms=total_latency_ms,
    )

    # ------------------------------------------------------------------
    # Schedule fire-and-forget logging (never blocks the response)
    # ------------------------------------------------------------------
    if background_tasks is not None:
        background_tasks.add_task(_log_forge_event, request.input, result)

    return result
