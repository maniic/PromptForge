"""
Learning analytics — anonymous attempt logging and per-challenge stats.

Every attempt is logged fire-and-forget to Supabase so the curriculum can be
tuned from real data (which challenges are too hard, where hints are needed).
Nothing here may ever fail a learner's request.

Exports: log_attempt, get_stats
"""

import asyncio
import logging

from backend.db.supabase_client import supabase_client
from backend.models.learn import ChallengeStats

logger = logging.getLogger(__name__)


async def _run_sync(fn):
    return await asyncio.get_running_loop().run_in_executor(None, fn)


async def log_attempt(
    challenge_id: str,
    score: int,
    passed: bool,
    hints_used: int,
    prompt_tokens: int,
) -> None:
    """Insert one attempt row. NEVER raises."""
    row = {
        "challenge_id": challenge_id,
        "score": score,
        "passed": passed,
        "hints_used": hints_used,
        "prompt_tokens": prompt_tokens,
    }
    try:
        await _run_sync(lambda: supabase_client().table("attempts").insert(row).execute())
    except Exception as exc:
        logger.warning("attempt log failed (non-fatal): %s", exc)


async def get_stats(challenge_id: str) -> ChallengeStats:
    """Aggregate community stats for a challenge. Returns zeros if unavailable."""
    try:
        resp = await _run_sync(
            lambda: supabase_client()
            .table("attempts")
            .select("score, passed")
            .eq("challenge_id", challenge_id)
            .limit(5000)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:
        logger.warning("attempt stats unavailable: %s", exc)
        rows = []

    if not rows:
        return ChallengeStats(attempts=0, pass_rate=0.0, avg_score=0.0)
    return ChallengeStats(
        attempts=len(rows),
        pass_rate=round(sum(bool(r.get("passed")) for r in rows) / len(rows), 3),
        avg_score=round(sum(r.get("score") or 0 for r in rows) / len(rows), 1),
    )
