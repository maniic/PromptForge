"""
Academy router — the prompt engineering learning loop.

Endpoints:
  GET  /api/tracks                         — curriculum tracks with challenge summaries
  GET  /api/challenges/{id}                — challenge brief, lesson, public test cases
  GET  /api/challenges/{id}/solution       — reference prompt (UI reveals after pass / effort)
  GET  /api/challenges/{id}/stats          — community attempt stats
  POST /api/challenges/{id}/attempt        — run + grade the learner's prompt on Granite
  POST /api/coach                          — Socratic hint at level 1-3
  POST /api/techniques                     — static technique detection (no AI call)
  GET  /api/roadmaps                       — roadmap summaries (for the roadmap picker)
  GET  /api/roadmaps/{id}                  — full roadmap: sections, concept and challenge nodes

Thin by design: logic lives in learn_service / curriculum_service.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from backend.models.learn import (
    AttemptRequest,
    AttemptResponse,
    ChallengeDetail,
    ChallengeStats,
    Roadmap,
    RoadmapSummary,
    CoachRequest,
    CoachResponse,
    SolutionResponse,
    TechniqueReport,
    TechniqueRequest,
    Track,
)
from backend.services import curriculum_service, learn_service, progress_service
from backend.services.curriculum_service import ChallengeNotFound, RoadmapNotFound
from backend.services.granite_service import GraniteError
from backend.services.learn_service import PromptValidationError
from backend.services.technique_service import detect_techniques

logger = logging.getLogger(__name__)
router = APIRouter(tags=["academy"])


def _challenge_or_404(challenge_id: str):
    try:
        return curriculum_service.get_challenge(challenge_id)
    except ChallengeNotFound:
        raise HTTPException(status_code=404, detail=f"Challenge '{challenge_id}' not found")


@router.get("/api/tracks", response_model=list[Track])
async def get_tracks() -> list[Track]:
    return curriculum_service.list_tracks()


@router.get("/api/challenges/{challenge_id}", response_model=ChallengeDetail)
async def get_challenge(challenge_id: str) -> ChallengeDetail:
    return curriculum_service.public_detail(_challenge_or_404(challenge_id))


@router.get("/api/challenges/{challenge_id}/solution", response_model=SolutionResponse)
async def get_solution(challenge_id: str) -> SolutionResponse:
    challenge = _challenge_or_404(challenge_id)
    return SolutionResponse(challenge_id=challenge.id, reference_prompt=challenge.reference_prompt)


@router.get("/api/challenges/{challenge_id}/stats", response_model=ChallengeStats)
async def get_stats(challenge_id: str) -> ChallengeStats:
    _challenge_or_404(challenge_id)
    return await progress_service.get_stats(challenge_id)


@router.post("/api/challenges/{challenge_id}/attempt", response_model=AttemptResponse)
async def attempt(
    challenge_id: str, request: AttemptRequest, background_tasks: BackgroundTasks
) -> AttemptResponse:
    _challenge_or_404(challenge_id)
    try:
        return await learn_service.run_attempt(challenge_id, request, background_tasks)
    except PromptValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except GraniteError as exc:
        logger.error("Attempt failed for %s: %s", challenge_id, exc)
        raise HTTPException(status_code=502, detail=f"Granite error: {exc}")


@router.post("/api/coach", response_model=CoachResponse)
async def coach(request: CoachRequest) -> CoachResponse:
    _challenge_or_404(request.challenge_id)
    return await learn_service.coach(request)


@router.post("/api/techniques", response_model=TechniqueReport)
async def techniques(request: TechniqueRequest) -> TechniqueReport:
    return detect_techniques(request.prompt)


@router.get("/api/roadmaps", response_model=list[RoadmapSummary])
async def get_roadmaps() -> list[RoadmapSummary]:
    return curriculum_service.list_roadmaps()


@router.get("/api/roadmaps/{roadmap_id}", response_model=Roadmap)
async def get_roadmap(roadmap_id: str) -> Roadmap:
    try:
        return curriculum_service.get_roadmap(roadmap_id)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail=f"Roadmap '{roadmap_id}' not found")
