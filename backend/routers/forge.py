"""
Forge router — POST /api/forge endpoint.

Router responsibilities:
  - Receive validated ForgeRequest from FastAPI (422 on bad input)
  - Delegate to forge_service.forge() for the 4-call pipeline
  - Map GraniteError → HTTP 502 (upstream service error)
  - Add fire-and-forget logging via BackgroundTasks (never fails the request)

Thin by design: no business logic here — that lives in forge_service.py.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from backend.models.forge import ForgeRequest, ForgeResponse
from backend.services import forge_service
from backend.services.granite_service import GraniteError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/forge", response_model=ForgeResponse)
async def forge(request: ForgeRequest, background_tasks: BackgroundTasks) -> ForgeResponse:
    """POST /api/forge — run the 4-call IBM Granite forge pipeline.

    Returns ForgeResponse with category, crafted_prompt, crafted_result,
    raw_result, call_timings, and total_latency_ms.

    Error responses:
      422  — request body fails Pydantic validation (input too short/long)
      502  — Granite call failed (GraniteError from forge_service)
    """
    try:
        result = await forge_service.forge(request, background_tasks)
    except GraniteError as exc:
        logger.error("Forge pipeline failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Granite error: {exc}")
    return result
