"""
IBM Granite service — the single gateway for ALL AI calls in PromptForge.

Architecture rules (CLAUDE.md):
  - ALL AI calls go through this module only
  - No direct env access — all config via `from backend.config import settings`
  - Singleton ModelInference to avoid re-authenticating on every call
  - asyncio.get_running_loop().run_in_executor wraps synchronous SDK calls
    so asyncio.gather() achieves true parallelism (IBM SDK is synchronous)

Exports: generate_text, chat, GraniteError, GraniteResponse
"""

import asyncio
import logging
import time
from typing import Optional

from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames

from backend.config import settings
from backend.models.forge import GraniteResponse  # re-exported for callers

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Public exception
# ---------------------------------------------------------------------------


class GraniteError(Exception):
    """Wraps all IBM SDK exceptions so callers stay decoupled from IBM internals."""


# ---------------------------------------------------------------------------
# Singleton state — lazily initialised on first generate_text call
# ---------------------------------------------------------------------------

_credentials: Optional[Credentials] = None
_model: Optional[ModelInference] = None


def _get_model() -> ModelInference:
    """Return (and lazily initialise) the singleton ModelInference instance."""
    global _credentials, _model

    if _model is None:
        _credentials = Credentials(
            url=settings.watsonx_url,
            api_key=settings.watsonx_api_key,
        )
        _model = ModelInference(
            model_id=settings.watsonx_model_id,
            credentials=_credentials,
            project_id=settings.watsonx_project_id,
            validate=False,  # Research Pitfall 5 — avoids double API call at startup
        )
        logger.debug("Granite singleton initialised (model_id=%s)", settings.watsonx_model_id)

    return _model


# ---------------------------------------------------------------------------
# Public async interface
# ---------------------------------------------------------------------------


async def generate_text(
    prompt: str,
    call_name: str = "unknown",
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
) -> GraniteResponse:
    """
    Async wrapper around the synchronous IBM SDK generate_text().

    Runs the SDK call in a thread-pool executor so that two concurrent
    awaits (e.g. via asyncio.gather) execute in parallel rather than
    sequentially.

    Parameters
    ----------
    prompt:      Text prompt to send to Granite.
    call_name:   Human-readable label used in error messages and logs.
    max_tokens:  Override for max new tokens (defaults to settings.max_tokens_craft).
    temperature: Optional sampling temperature.

    Returns
    -------
    GraniteResponse with .text (str) and .latency_ms (float).

    Raises
    ------
    GraniteError on timeout (> 30 s) or any SDK exception.
    """
    model = _get_model()

    # Build params dict
    params: dict = {
        GenTextParamsMetaNames.MAX_NEW_TOKENS: max_tokens or settings.max_tokens_craft,
        GenTextParamsMetaNames.REPETITION_PENALTY: 1.3,
    }
    if temperature is not None:
        params[GenTextParamsMetaNames.TEMPERATURE] = temperature

    loop = asyncio.get_running_loop()

    t0 = time.perf_counter()
    try:
        text: str = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: model.generate_text(prompt=prompt, params=params),
            ),
            timeout=90.0,
        )
    except asyncio.TimeoutError:
        raise GraniteError(
            f"Granite call timed out ({call_name}): exceeded 90s"
        )
    except Exception as exc:
        raise GraniteError(
            f"Granite call failed ({call_name}): {exc}"
        ) from exc

    latency_ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.debug("Granite %s completed in %.0f ms", call_name, latency_ms)

    return GraniteResponse(text=text, latency_ms=latency_ms)


# Flipped to False the first time the deployment rejects the chat endpoint,
# so later calls go straight to the templated generate_text fallback.
_chat_supported = True


def _granite_chat_template(prompt: str, system: Optional[str]) -> str:
    """Render a single-turn conversation in Granite's native chat format."""
    turns = []
    if system:
        turns.append(f"<|start_of_role|>system<|end_of_role|>{system}<|end_of_text|>")
    turns.append(f"<|start_of_role|>user<|end_of_role|>{prompt}<|end_of_text|>")
    turns.append("<|start_of_role|>assistant<|end_of_role|>")
    return "\n".join(turns)


async def chat(
    prompt: str,
    call_name: str = "unknown",
    max_tokens: int = 400,
    temperature: float = 0.0,
    system: Optional[str] = None,
) -> GraniteResponse:
    """
    Run `prompt` as a user turn through Granite's instruction-tuned chat format.

    Used by PromptForge Academy so a learner's prompt is executed exactly the
    way a real watsonx.ai application would run it. Falls back to
    generate_text with Granite's chat template if the deployment does not
    expose the chat endpoint for this model.

    Raises GraniteError on timeout or SDK failure.
    """
    global _chat_supported

    if not _chat_supported:
        return await generate_text(
            _granite_chat_template(prompt, system),
            call_name=call_name,
            max_tokens=max_tokens,
            temperature=temperature or None,
        )

    model = _get_model()
    messages = [{"role": "system", "content": system}] if system else []
    messages.append({"role": "user", "content": prompt})
    params = {"max_tokens": max_tokens, "temperature": temperature}

    loop = asyncio.get_running_loop()
    t0 = time.perf_counter()
    try:
        response: dict = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: model.chat(messages=messages, params=params)),
            timeout=90.0,
        )
        text = response["choices"][0]["message"]["content"] or ""
    except asyncio.TimeoutError:
        raise GraniteError(f"Granite chat timed out ({call_name}): exceeded 90s")
    except Exception as exc:
        logger.warning("Granite chat unavailable (%s), falling back to generate_text: %s", call_name, exc)
        fallback = await generate_text(
            _granite_chat_template(prompt, system),
            call_name=call_name,
            max_tokens=max_tokens,
            temperature=temperature or None,
        )
        _chat_supported = False  # only once the fallback is proven to work
        return fallback

    latency_ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.debug("Granite chat %s completed in %.0f ms", call_name, latency_ms)
    return GraniteResponse(text=text, latency_ms=latency_ms)
