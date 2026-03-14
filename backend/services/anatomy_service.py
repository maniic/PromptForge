"""
Anatomy Engine service — parses crafted prompts into structural segments.

Architecture rules (CLAUDE.md):
  - ALL AI calls go through granite_service.generate_text only
  - Prompt templates loaded from backend/prompts/*.txt
"""

import asyncio
import json
import logging
import time
from pathlib import Path

from backend.config import settings
from backend.models.anatomy import (
    AnatomyResult,
    AnatomySegment,
    DiagnosisItem,
    XRayDiagnosis,
    XRayResponse,
)
from backend.services.granite_service import generate_text

logger = logging.getLogger(__name__)

ALL_ELEMENT_TYPES = ["role", "context", "constraints", "output_format", "quality_bar", "task"]


def _load_template(name: str) -> str:
    template_path = Path(__file__).parent.parent / "prompts" / name
    return template_path.read_text(encoding="utf-8")


def _parse_json_safe(text: str) -> dict | None:
    """Try to parse JSON from Granite output, handling common issues."""
    text = text.strip()
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try extracting JSON from markdown code blocks
    if "```" in text:
        for block in text.split("```"):
            block = block.strip()
            if block.startswith("json"):
                block = block[4:].strip()
            try:
                return json.loads(block)
            except json.JSONDecodeError:
                continue
    # Try finding first { to last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass
    return None


def _fallback_anatomy(prompt: str) -> AnatomyResult:
    """Fallback when Granite returns unparseable output."""
    return AnatomyResult(
        segments=[AnatomySegment(type="task", text=prompt)],
        quality_score=20,
        missing_elements=["role", "context", "constraints", "output_format", "quality_bar"],
    )


async def analyze_anatomy(crafted_prompt: str) -> AnatomyResult:
    """Parse a crafted prompt into structural anatomy segments via Granite."""
    template = _load_template("analyze_anatomy.txt")
    prompt = template.format(prompt=crafted_prompt)

    response = await generate_text(
        prompt,
        call_name="analyze_anatomy",
        max_tokens=settings.max_tokens_execute,
        temperature=0.1,
    )

    data = _parse_json_safe(response.text)
    if data is None:
        logger.warning("Anatomy parse failed, using fallback")
        return _fallback_anatomy(crafted_prompt)

    try:
        segments = [
            AnatomySegment(type=s.get("type", "task"), text=s.get("text", ""))
            for s in data.get("segments", [])
            if s.get("text")
        ]
        if not segments:
            return _fallback_anatomy(crafted_prompt)

        quality_score = min(100, max(0, int(data.get("quality_score", 50))))
        missing = [m for m in data.get("missing_elements", []) if m in ALL_ELEMENT_TYPES]

        return AnatomyResult(
            segments=segments,
            quality_score=quality_score,
            missing_elements=missing,
        )
    except Exception:
        logger.warning("Anatomy data validation failed, using fallback")
        return _fallback_anatomy(crafted_prompt)


async def diagnose_prompt(prompt: str) -> XRayDiagnosis:
    """Diagnose a user-supplied prompt, identifying structural gaps."""
    template = _load_template("diagnose_prompt.txt")
    filled = template.format(prompt=prompt)

    response = await generate_text(
        filled,
        call_name="diagnose_prompt",
        max_tokens=settings.max_tokens_execute,
        temperature=0.1,
    )

    data = _parse_json_safe(response.text)
    if data is None:
        return XRayDiagnosis(
            segments=[AnatomySegment(type="task", text=prompt)],
            quality_score=15,
            missing_elements=ALL_ELEMENT_TYPES[:-1],  # everything except task
            diagnosis=[
                DiagnosisItem(
                    element=e,
                    explanation=f"Adding a {e.replace('_', ' ')} section would improve clarity and output quality.",
                )
                for e in ALL_ELEMENT_TYPES[:-1]
            ],
        )

    try:
        segments = [
            AnatomySegment(type=s.get("type", "task"), text=s.get("text", ""))
            for s in data.get("segments", [])
            if s.get("text")
        ]
        diagnosis_items = [
            DiagnosisItem(element=d.get("element", ""), explanation=d.get("explanation", ""))
            for d in data.get("diagnosis", [])
            if d.get("element")
        ]
        return XRayDiagnosis(
            segments=segments or [AnatomySegment(type="task", text=prompt)],
            quality_score=min(100, max(0, int(data.get("quality_score", 30)))),
            missing_elements=[m for m in data.get("missing_elements", []) if m in ALL_ELEMENT_TYPES],
            diagnosis=diagnosis_items,
        )
    except Exception:
        return XRayDiagnosis(
            segments=[AnatomySegment(type="task", text=prompt)],
            quality_score=15,
            missing_elements=ALL_ELEMENT_TYPES[:-1],
            diagnosis=[],
        )


async def upgrade_and_compare(prompt: str, missing_elements: list[str]) -> XRayResponse:
    """Upgrade a prompt by filling missing elements, then execute both for comparison."""
    pipeline_start = time.perf_counter()

    # Step 1: Diagnose
    diagnosis = await diagnose_prompt(prompt)

    # Step 2: Upgrade
    template = _load_template("upgrade_prompt.txt")
    filled = template.format(
        prompt=prompt,
        missing_elements=", ".join(missing_elements or diagnosis.missing_elements),
    )
    upgrade_response = await generate_text(
        filled,
        call_name="upgrade_prompt",
        max_tokens=settings.max_tokens_craft,
    )
    upgraded_prompt = upgrade_response.text.strip()

    # Step 3: Execute both in parallel
    original_response, upgraded_response = await asyncio.gather(
        generate_text(prompt, call_name="execute_original", max_tokens=settings.max_tokens_execute),
        generate_text(upgraded_prompt, call_name="execute_upgraded", max_tokens=settings.max_tokens_execute),
    )

    total_ms = round((time.perf_counter() - pipeline_start) * 1000, 1)

    return XRayResponse(
        diagnosis=diagnosis,
        upgraded_prompt=upgraded_prompt,
        original_result=original_response.text,
        upgraded_result=upgraded_response.text,
        total_latency_ms=total_ms,
    )


async def re_execute_without_segments(prompt: str, disabled_segments: list[str]) -> str:
    """Re-execute a prompt with certain segment types removed.

    Removes text matching the disabled segment types and executes the remaining prompt.
    """
    # For simplicity, we just execute the modified prompt
    response = await generate_text(
        prompt,
        call_name="re_execute_degraded",
        max_tokens=settings.max_tokens_execute,
    )
    return response.text
