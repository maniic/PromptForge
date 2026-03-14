"""
Community prompt library service.

Architecture rules (CLAUDE.md):
  - Community library ops via library_service.py only (rule 6)
  - All secrets from config.py settings — never os.getenv() directly

Exports:
  - save_prompt(req)           — insert into prompts table, return PromptDetail
  - get_prompts(category=None) — select all or filtered by category, return list[PromptSummary]
  - get_prompt_by_id(id)       — select by id, raise 404 if missing, return PromptDetail

All Supabase calls are synchronous (supabase-py v2) and wrapped in
run_in_executor to avoid blocking the async event loop.
"""

import asyncio
import logging
from typing import Optional

from fastapi import HTTPException

from backend.db.supabase_client import supabase_client
from backend.models.library import PromptDetail, PromptSummary, SavePromptRequest

logger = logging.getLogger(__name__)

_SUMMARY_COLUMNS = "id, title, author_name, category, created_at"
_SUMMARY_COLUMNS_WITH_UPVOTES = "id, title, author_name, category, upvotes, created_at"


async def _run_sync(fn):
    """Run a synchronous callable in the default executor (thread pool)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn)


async def save_prompt(req: SavePromptRequest) -> PromptDetail:
    """Insert a forged prompt into the community library.

    Parameters
    ----------
    req: SavePromptRequest — validated body from POST /api/library

    Returns
    -------
    PromptDetail — the saved record including generated id and created_at.
    """
    data = req.model_dump()

    def _insert():
        return supabase_client().table("prompts").insert(data).execute()

    resp = await _run_sync(_insert)
    return PromptDetail.model_validate(resp.data[0])


async def get_prompts(category: Optional[str] = None) -> list[PromptSummary]:
    """Fetch community prompts sorted newest-first.

    Parameters
    ----------
    category: Optional[str] — if provided, filter by exact category match

    Returns
    -------
    list[PromptSummary] — summary rows (no full prompt content)
    """
    def _select():
        # Try with upvotes column first, fall back to without
        try:
            query = (
                supabase_client()
                .table("prompts")
                .select(_SUMMARY_COLUMNS_WITH_UPVOTES)
                .order("created_at", desc=True)
            )
            if category is not None:
                query = query.eq("category", category)
            return query.execute()
        except Exception:
            query = (
                supabase_client()
                .table("prompts")
                .select(_SUMMARY_COLUMNS)
                .order("created_at", desc=True)
            )
            if category is not None:
                query = query.eq("category", category)
            return query.execute()

    resp = await _run_sync(_select)
    rows = resp.data
    # Gracefully handle missing upvotes column (pre-migration)
    for row in rows:
        row.setdefault("upvotes", 0)
    return [PromptSummary.model_validate(row) for row in rows]


async def get_prompt_by_id(prompt_id: str) -> PromptDetail:
    """Fetch a single prompt by its UUID.

    Parameters
    ----------
    prompt_id: str — UUID of the prompt record

    Returns
    -------
    PromptDetail — full record

    Raises
    ------
    HTTPException(404) if no record with that id exists.
    """
    def _select():
        return (
            supabase_client()
            .table("prompts")
            .select("*")
            .eq("id", prompt_id)
            .execute()
        )

    resp = await _run_sync(_select)
    if not resp.data:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptDetail.model_validate(resp.data[0])


async def upvote_prompt(prompt_id: str) -> dict:
    """Increment the upvotes column by 1 for a given prompt.

    Parameters
    ----------
    prompt_id: str — UUID of the prompt to upvote

    Returns
    -------
    dict — {"status": "upvoted", "upvotes": <new_count>}

    Raises
    ------
    HTTPException(404) if no record with that id exists.
    """
    def _upvote():
        # First check if prompt exists
        check = (
            supabase_client()
            .table("prompts")
            .select("id")
            .eq("id", prompt_id)
            .execute()
        )
        if not check.data:
            return None
        # Try to read current upvotes (column may not exist pre-migration)
        try:
            vote_check = (
                supabase_client()
                .table("prompts")
                .select("upvotes")
                .eq("id", prompt_id)
                .execute()
            )
            current = (vote_check.data[0].get("upvotes") or 0) if vote_check.data else 0
        except Exception:
            current = 0
        result = (
            supabase_client()
            .table("prompts")
            .update({"upvotes": current + 1})
            .eq("id", prompt_id)
            .execute()
        )
        return result.data[0] if result.data else check.data[0]

    try:
        row = await _run_sync(_upvote)
    except Exception as exc:
        logger.warning("Upvote failed (upvotes column may not exist): %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Upvote unavailable — run the schema migration first"
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"status": "upvoted", "upvotes": row.get("upvotes", 0)}
