from typing import Optional

from pydantic import BaseModel, Field


class AnatomySegment(BaseModel):
    """A single structural element within a prompt."""

    type: str  # role | context | constraints | output_format | quality_bar | task
    text: str


class AnatomyResult(BaseModel):
    """Result of anatomy analysis on a crafted prompt."""

    segments: list[AnatomySegment]
    quality_score: int = Field(ge=0, le=100)
    missing_elements: list[str]


class AnatomyRequest(BaseModel):
    """Request body for POST /api/anatomy."""

    crafted_prompt: str = Field(..., min_length=10, max_length=5000)


class DiagnosisItem(BaseModel):
    """Explanation of why a missing element matters."""

    element: str
    explanation: str


class XRayDiagnosis(BaseModel):
    """Full diagnosis of a user-supplied prompt."""

    segments: list[AnatomySegment]
    quality_score: int = Field(ge=0, le=100)
    missing_elements: list[str]
    diagnosis: list[DiagnosisItem]


class XRayRequest(BaseModel):
    """Request body for POST /api/xray."""

    prompt: str = Field(..., min_length=3, max_length=2000)


class XRayResponse(BaseModel):
    """Full X-Ray response: diagnosis + upgrade + execution comparison."""

    diagnosis: XRayDiagnosis
    upgraded_prompt: str
    original_result: str
    upgraded_result: str
    total_latency_ms: float


class ReExecuteRequest(BaseModel):
    """Request to re-execute a prompt with some segments removed."""

    prompt: str = Field(..., min_length=3, max_length=5000)
    disabled_segments: list[str] = Field(default_factory=list)
