"""
Pydantic models for the community prompt library.

Exports:
  - SavePromptRequest  — body for POST /api/library
  - PromptSummary      — item shape in GET /api/library list
  - PromptDetail       — full record from GET /api/library/{id}
"""
from datetime import datetime

from pydantic import BaseModel


class SavePromptRequest(BaseModel):
    """Request body for saving a forged prompt to the community library."""

    title: str
    author_name: str
    original_input: str
    category: str
    crafted_prompt: str
    crafted_result: str
    raw_result: str
    total_latency_ms: float


class PromptSummary(BaseModel):
    """Lightweight summary used in the GET /api/library list view."""

    id: str
    title: str
    author_name: str
    category: str
    upvotes: int = 0
    created_at: datetime


class PromptDetail(PromptSummary):
    """Full prompt record returned by GET /api/library/{id} and POST /api/library."""

    original_input: str
    crafted_prompt: str
    crafted_result: str
    raw_result: str
    total_latency_ms: float
