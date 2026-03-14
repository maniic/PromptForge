"""
Anatomy + X-Ray router — endpoints for prompt structural analysis and upgrade.

Endpoints:
  POST /api/anatomy     — Parse crafted prompt into color-coded segments
  POST /api/xray        — Diagnose, upgrade, and compare a user prompt
  POST /api/re-execute  — Re-execute prompt with segments toggled off
"""

import logging

from fastapi import APIRouter, HTTPException

from backend.models.anatomy import (
    AnatomyRequest,
    AnatomyResult,
    ReExecuteRequest,
    XRayRequest,
    XRayResponse,
)
from backend.services import anatomy_service
from backend.services.granite_service import GraniteError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/anatomy", response_model=AnatomyResult)
async def anatomy(request: AnatomyRequest) -> AnatomyResult:
    """Parse a crafted prompt into structural anatomy segments."""
    try:
        return await anatomy_service.analyze_anatomy(request.crafted_prompt)
    except GraniteError as exc:
        logger.error("Anatomy analysis failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Granite error: {exc}")


@router.post("/api/xray", response_model=XRayResponse)
async def xray(request: XRayRequest) -> XRayResponse:
    """Diagnose a prompt, upgrade it, and compare execution results."""
    try:
        return await anatomy_service.upgrade_and_compare(
            request.prompt,
            missing_elements=[],
        )
    except GraniteError as exc:
        logger.error("X-Ray pipeline failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Granite error: {exc}")


@router.post("/api/re-execute")
async def re_execute(request: ReExecuteRequest) -> dict:
    """Re-execute a prompt with some anatomy segments removed."""
    try:
        result = await anatomy_service.re_execute_without_segments(
            request.prompt,
            request.disabled_segments,
        )
        return {"result": result}
    except GraniteError as exc:
        logger.error("Re-execution failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Granite error: {exc}")
