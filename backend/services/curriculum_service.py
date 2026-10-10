"""
Curriculum service — loads and serves PromptForge Academy challenges.

Challenges are data, not code: each lives in backend/curriculum/challenges/
as JSON and is validated against the Challenge model on first load. Adding
a lesson never requires touching Python.

Exports: list_tracks, get_challenge, public_detail, public_test_ids,
         render_prompt, missing_variables, ChallengeNotFound
"""

import json
import re
from functools import lru_cache
from pathlib import Path

from backend.models.learn import (
    Challenge,
    ChallengeDetail,
    ChallengeSummary,
    PublicTestCase,
    Track,
    TrackDef,
)

_CURRICULUM_DIR = Path(__file__).parent.parent / "curriculum"
_VAR_RE = re.compile(r"\{\{\s*(\w+)\s*\}\}")


class ChallengeNotFound(KeyError):
    """Raised when a challenge id does not exist in the curriculum."""


@lru_cache()
def _load() -> tuple[list[TrackDef], dict[str, Challenge]]:
    tracks = [
        TrackDef.model_validate(t)
        for t in json.loads((_CURRICULUM_DIR / "tracks.json").read_text(encoding="utf-8"))
    ]
    challenges: dict[str, Challenge] = {}
    for path in sorted((_CURRICULUM_DIR / "challenges").glob("*.json")):
        challenge = Challenge.model_validate_json(path.read_text(encoding="utf-8"))
        challenges[challenge.id] = challenge

    for track in tracks:
        for cid in track.challenges:
            if cid not in challenges:
                raise ValueError(f"Track '{track.id}' references unknown challenge '{cid}'")
    return tracks, challenges


def list_tracks() -> list[Track]:
    tracks, challenges = _load()
    return [
        Track(
            id=t.id,
            title=t.title,
            description=t.description,
            challenges=[
                ChallengeSummary(
                    id=c.id, title=c.title, technique=c.technique, difficulty=c.difficulty
                )
                for c in (challenges[cid] for cid in t.challenges)
            ],
        )
        for t in tracks
    ]


def get_challenge(challenge_id: str) -> Challenge:
    _, challenges = _load()
    if challenge_id not in challenges:
        raise ChallengeNotFound(challenge_id)
    return challenges[challenge_id]


def public_test_ids(challenge: Challenge) -> list[str]:
    """Test ids as shown to learners. Hidden ids are masked so they can't hint at the input."""
    ids, hidden_n = [], 0
    for tc in challenge.test_cases:
        if tc.hidden:
            hidden_n += 1
            ids.append(f"hidden-{hidden_n}")
        else:
            ids.append(tc.id)
    return ids


def public_detail(challenge: Challenge) -> ChallengeDetail:
    """Strip golden outputs, reference solution, and hidden test inputs."""
    return ChallengeDetail(
        id=challenge.id,
        track=challenge.track,
        title=challenge.title,
        technique=challenge.technique,
        difficulty=challenge.difficulty,
        brief=challenge.brief,
        lesson=challenge.lesson,
        variables=challenge.variables,
        starter_prompt=challenge.starter_prompt,
        test_cases=[
            PublicTestCase(
                id=public_id,
                hidden=tc.hidden,
                vars=None if tc.hidden else tc.vars,
                checks=[c.label for c in tc.checks],
            )
            for tc, public_id in zip(challenge.test_cases, public_test_ids(challenge))
        ],
        rubric=challenge.rubric,
        pass_score=challenge.pass_score,
    )


def missing_variables(prompt: str, variables: list[str]) -> list[str]:
    """Variables the challenge supplies that the prompt never references."""
    used = set(_VAR_RE.findall(prompt))
    return [v for v in variables if v not in used]


def render_prompt(prompt: str, values: dict[str, str]) -> str:
    """Substitute {{var}} placeholders. Unknown placeholders are left as-is."""
    return _VAR_RE.sub(lambda m: values.get(m.group(1), m.group(0)), prompt)
