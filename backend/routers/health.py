"""Health check endpoint — demo-critical path per CLAUDE.md."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Return service health status. Always responds 200 OK if server is running."""
    return {"status": "ok"}
