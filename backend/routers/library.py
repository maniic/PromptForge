"""
Library REST router — community prompt library endpoints.

Routes:
  POST /api/library           — save a forged prompt, return PromptDetail
  GET  /api/library           — list community prompts (newest-first), optional ?category= filter
  GET  /api/library/{id}      — get full prompt detail or 404

Architecture rules (CLAUDE.md):
  - Thin router: no business logic here — delegate entirely to library_service
  - Community library ops via library_service.py only (rule 6)
"""

from typing import Optional

from fastapi import APIRouter

from backend.models.library import PromptDetail, PromptSummary, SavePromptRequest
from backend.services import library_service

router = APIRouter(prefix="/api/library", tags=["library"], redirect_slashes=False)


@router.post("", response_model=PromptDetail)
async def post_library(req: SavePromptRequest) -> PromptDetail:
    """Save a forged prompt to the community library."""
    return await library_service.save_prompt(req)


@router.get("", response_model=list[PromptSummary])
async def get_library(category: Optional[str] = None) -> list[PromptSummary]:
    """Return community prompts, newest-first. Optionally filter by ?category=."""
    return await library_service.get_prompts(category=category)


@router.get("/{prompt_id}", response_model=PromptDetail)
async def get_library_by_id(prompt_id: str) -> PromptDetail:
    """Return full prompt detail for the given id, or 404 if not found."""
    return await library_service.get_prompt_by_id(prompt_id)


@router.post("/{prompt_id}/upvote")
async def upvote_prompt(prompt_id: str) -> dict:
    """Increment the upvote count for a community prompt."""
    return await library_service.upvote_prompt(prompt_id)
