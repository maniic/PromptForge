"""
PromptForge Academy learning loop — run, grade, coach.

Architecture rules (CLAUDE.md):
  - ALL AI calls go through granite_service only
  - Test-case executions run concurrently via asyncio.gather()
  - Prompt templates loaded from backend/prompts/*.txt
  - Settings from config.py only

Attempt pipeline:
  1. Validate that the learner's prompt references every challenge variable
  2. Render the prompt once per test case and execute ALL of them in
     parallel on IBM Granite (N calls, one round trip)
  3. Grade every output with deterministic checks (grading_service)
  4. If the challenge has a rubric, one Granite-as-judge call scores it
  5. Blend scores, award stars, log the attempt (fire-and-forget)

Coach: one on-demand Granite call that returns a Socratic hint at the
requested level. Falls back to the challenge's authored hints whenever
Granite fails or returns unparseable output, so the learner always gets help.
"""

import asyncio
import logging
import re
import time
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks

from backend.config import settings
from backend.models.learn import (
    AttemptRequest,
    AttemptResponse,
    Challenge,
    CoachRequest,
    CoachResponse,
    CriterionScore,
    TestCaseResult,
)
from backend.services import progress_service
from backend.services.anatomy_service import _parse_json_safe
from backend.services.curriculum_service import (
    get_challenge,
    missing_variables,
    public_test_ids,
    render_prompt,
)
from backend.services.grading_service import grade_output
from backend.services.granite_service import GraniteError, chat
from backend.services.technique_service import TECHNIQUE_LABELS, detect_techniques

logger = logging.getLogger(__name__)

CHECKS_WEIGHT = 0.75  # deterministic checks dominate; the judge refines


class PromptValidationError(ValueError):
    """The learner's prompt can't be run as written (e.g. a variable is unused)."""


def _load_template(name: str) -> str:
    return (Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _clean(text: str) -> str:
    return re.sub(r"<\|[^|>]+\|>", "", text).strip()


def _stars(score: int, passed: bool) -> int:
    if not passed:
        return 0
    return 1 + int(score >= 90) + int(score >= 97)


# ---------------------------------------------------------------------------
# Attempt
# ---------------------------------------------------------------------------


async def _judge(challenge: Challenge, outputs: list[str]) -> list[CriterionScore]:
    """Granite-as-judge over all outputs. Returns [] if the judge is unusable."""
    template = _load_template("judge_rubric.txt")
    rendered_outputs = "\n".join(
        f'<output test="{tc.id}">\n{out[:1500]}\n</output>'
        for tc, out in zip(challenge.test_cases, outputs)
    )
    criteria = "\n".join(f"{i}. {c}" for i, c in enumerate(challenge.rubric, start=1))
    prompt = template.format(brief=challenge.brief, outputs=rendered_outputs, criteria=criteria)

    try:
        response = await chat(prompt, call_name="judge_rubric", max_tokens=settings.max_tokens_judge)
    except GraniteError as exc:
        logger.warning("Judge call failed, scoring on checks only: %s", exc)
        return []

    data = _parse_json_safe(_clean(response.text))
    raw_scores = data.get("scores") if isinstance(data, dict) else None
    if not isinstance(raw_scores, list):
        logger.warning("Judge returned unparseable output, scoring on checks only")
        return []

    scores: list[CriterionScore] = []
    for criterion, item in zip(challenge.rubric, raw_scores):
        try:
            value = min(5, max(1, int(item.get("score", 1))))
        except (TypeError, ValueError, AttributeError):
            return []
        scores.append(CriterionScore(criterion=criterion, score=value, reason=str(item.get("reason", ""))[:300]))
    return scores if len(scores) == len(challenge.rubric) else []


async def run_attempt(
    challenge_id: str,
    request: AttemptRequest,
    background_tasks: Optional[BackgroundTasks] = None,
) -> AttemptResponse:
    """Execute the learner's prompt against every test case and grade it.

    Raises ChallengeNotFound, PromptValidationError, or GraniteError.
    """
    challenge = get_challenge(challenge_id)
    missing = missing_variables(request.prompt, challenge.variables)
    if missing:
        names = ", ".join("{{" + m + "}}" for m in missing)
        raise PromptValidationError(
            f"Your prompt never uses {names}, so the model would never see that input. "
            "Add the placeholder where the data should go."
        )

    started = time.perf_counter()
    submit = request.mode == "submit"
    cases = [
        (tc, public_id)
        for tc, public_id in zip(challenge.test_cases, public_test_ids(challenge))
        if submit or not tc.hidden
    ]

    responses = await asyncio.gather(
        *(
            chat(
                render_prompt(request.prompt, tc.vars),
                call_name=f"attempt:{challenge.id}:{tc.id}",
                max_tokens=settings.max_tokens_attempt,
            )
            for tc, _ in cases
        )
    )
    outputs = [_clean(r.text) for r in responses]

    test_results: list[TestCaseResult] = []
    passed_checks = total_checks = 0
    for (tc, public_id), output in zip(cases, outputs):
        results = grade_output(tc.checks, output)
        passed_checks += sum(r.passed for r in results)
        total_checks += len(results)
        test_results.append(
            TestCaseResult(
                id=public_id,
                hidden=tc.hidden,
                output=None if tc.hidden else output,
                checks=results,
                passed=all(r.passed for r in results),
            )
        )
    checks_score = round(100 * passed_checks / total_checks) if total_checks else 0

    rubric_scores = await _judge(challenge, outputs) if submit and challenge.rubric else []
    judge_score: Optional[int] = None
    if rubric_scores:
        avg = sum(s.score for s in rubric_scores) / len(rubric_scores)
        judge_score = round((avg - 1) / 4 * 100)
        score = round(CHECKS_WEIGHT * checks_score + (1 - CHECKS_WEIGHT) * judge_score)
    else:
        score = checks_score

    passed = submit and score >= challenge.pass_score
    techniques = detect_techniques(request.prompt)

    result = AttemptResponse(
        challenge_id=challenge.id,
        mode=request.mode,
        score=score,
        passed=passed,
        stars=_stars(score, passed),
        checks_score=checks_score,
        judge_score=judge_score,
        test_results=test_results,
        rubric_scores=rubric_scores,
        techniques=techniques,
        latency_ms=round((time.perf_counter() - started) * 1000, 1),
    )

    if submit and background_tasks is not None:
        background_tasks.add_task(
            progress_service.log_attempt,
            challenge_id=challenge.id,
            score=score,
            passed=passed,
            hints_used=request.hints_used,
            prompt_tokens=techniques.estimated_tokens,
        )
    return result


# ---------------------------------------------------------------------------
# Coach
# ---------------------------------------------------------------------------


def _authored_hint(challenge: Challenge, request: CoachRequest) -> CoachResponse:
    if request.failed_checks:
        diagnosis = f"{len(request.failed_checks)} check(s) failed, starting with: \"{request.failed_checks[0]}\"."
    else:
        diagnosis = "Your prompt passes the checks. Can you make it shorter or more robust?"
    return CoachResponse(
        hint_level=request.hint_level,
        diagnosis=diagnosis,
        hint=challenge.hints[request.hint_level - 1],
        question="Which of the failing checks does your prompt explicitly address right now?",
        source="authored",
    )


async def coach(request: CoachRequest) -> CoachResponse:
    """Return a Socratic hint. Never raises GraniteError — falls back to authored hints."""
    challenge = get_challenge(request.challenge_id)
    detected = detect_techniques(request.prompt).detected

    prompt = _load_template("coach.txt").format(
        title=challenge.title,
        brief=challenge.brief,
        technique=challenge.technique,
        lesson=challenge.lesson.summary,
        prompt=request.prompt,
        detected=", ".join(TECHNIQUE_LABELS[d] for d in detected) or "none",
        score=request.score,
        failed_checks="\n".join(f"- {c}" for c in request.failed_checks) or "- none",
        sample_output=request.sample_output or "(not run yet)",
        hint_level=request.hint_level,
    )

    try:
        response = await chat(
            prompt, call_name="coach", max_tokens=settings.max_tokens_coach, temperature=0.3
        )
    except GraniteError as exc:
        logger.warning("Coach call failed, using authored hint: %s", exc)
        return _authored_hint(challenge, request)

    data = _parse_json_safe(_clean(response.text))
    if not isinstance(data, dict) or not all(isinstance(data.get(k), str) and data[k].strip() for k in ("diagnosis", "hint")):
        logger.warning("Coach returned unparseable output, using authored hint")
        return _authored_hint(challenge, request)

    return CoachResponse(
        hint_level=request.hint_level,
        diagnosis=data["diagnosis"].strip()[:600],
        hint=data["hint"].strip()[:600],
        question=str(data.get("question", "")).strip()[:300],
        source="granite",
    )
