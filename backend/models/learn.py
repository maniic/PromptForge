"""
Pydantic models for PromptForge Academy — the prompt engineering learning loop.

A challenge is a mini "prompt engineering unit test suite":
  - The learner writes a prompt template containing {{variables}}
  - Each TestCase fills those variables and runs the prompt on IBM Granite
  - Deterministic Checks grade every output; an optional rubric is scored
    by Granite-as-judge
  - A Socratic coach turns failures into hints (never full answers)

Internal models (Challenge, TestCase) carry hidden data such as golden
outputs and reference solutions. Public models (ChallengeDetail,
PublicTestCase) are what the API returns.
"""

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

CheckType = Literal[
    "contains",
    "not_contains",
    "equals",
    "regex",
    "max_words",
    "min_words",
    "bullet_count",
    "max_words_per_line",
    "json_valid",
    "json_keys",
    "json_field",
    "json_array_length",
    "max_grade_level",
]


# ---------------------------------------------------------------------------
# Curriculum (internal)
# ---------------------------------------------------------------------------


class Check(BaseModel):
    """One deterministic assertion against a model output."""

    type: CheckType
    label: str
    value: Any = None
    path: Optional[str] = None  # json_field: dotted path, e.g. "contact.name"
    match: Literal["equals", "contains"] = "equals"  # json_field comparison mode


class TestCase(BaseModel):
    """A single input the learner's prompt must handle."""

    __test__ = False  # stop pytest from collecting this as a test class

    id: str
    vars: dict[str, str]
    checks: list[Check]
    hidden: bool = False
    golden_output: str  # an output that passes every check — keeps challenges honest


class Lesson(BaseModel):
    summary: str
    why_it_matters: str
    weak_example: str
    strong_example: str


class Challenge(BaseModel):
    id: str
    track: str
    title: str
    technique: str
    difficulty: Literal["beginner", "intermediate", "advanced"]
    brief: str
    lesson: Lesson
    variables: list[str]
    starter_prompt: str
    test_cases: list[TestCase]
    rubric: list[str] = Field(default_factory=list)
    pass_score: int = 80
    hints: list[str] = Field(min_length=3, max_length=3)
    reference_prompt: str


class TrackDef(BaseModel):
    id: str
    title: str
    description: str
    challenges: list[str]


# ---------------------------------------------------------------------------
# Public API shapes
# ---------------------------------------------------------------------------


class ChallengeSummary(BaseModel):
    id: str
    title: str
    technique: str
    difficulty: str


class Track(BaseModel):
    id: str
    title: str
    description: str
    challenges: list[ChallengeSummary]


class PublicTestCase(BaseModel):
    id: str
    hidden: bool
    vars: Optional[dict[str, str]]  # None when hidden
    checks: list[str]  # human-readable check labels


class ChallengeDetail(BaseModel):
    id: str
    track: str
    title: str
    technique: str
    difficulty: str
    brief: str
    lesson: Lesson
    variables: list[str]
    starter_prompt: str
    test_cases: list[PublicTestCase]
    rubric: list[str]
    pass_score: int


class SolutionResponse(BaseModel):
    challenge_id: str
    reference_prompt: str


class ChallengeStats(BaseModel):
    attempts: int
    pass_rate: float
    avg_score: float


# ---------------------------------------------------------------------------
# Attempt (run + grade)
# ---------------------------------------------------------------------------


class AttemptRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=4000)
    hints_used: int = Field(default=0, ge=0, le=3)
    # "run": visible tests only, no judge, not logged — a quick feedback loop.
    # "submit": every test (hidden included), judged, scored, and logged.
    mode: Literal["run", "submit"] = "submit"


class CheckResult(BaseModel):
    label: str
    passed: bool
    detail: str = ""


class TestCaseResult(BaseModel):
    __test__ = False

    id: str
    hidden: bool
    output: Optional[str]  # None when hidden
    checks: list[CheckResult]
    passed: bool


class CriterionScore(BaseModel):
    criterion: str
    score: int = Field(ge=1, le=5)
    reason: str = ""


class TechniqueReport(BaseModel):
    detected: list[str]
    estimated_tokens: int
    word_count: int


class AttemptResponse(BaseModel):
    challenge_id: str
    mode: Literal["run", "submit"] = "submit"
    score: int = Field(ge=0, le=100)
    passed: bool
    stars: int = Field(ge=0, le=3)
    checks_score: int
    judge_score: Optional[int]
    test_results: list[TestCaseResult]
    rubric_scores: list[CriterionScore]
    techniques: TechniqueReport
    latency_ms: float


# ---------------------------------------------------------------------------
# Coach + technique detection
# ---------------------------------------------------------------------------


class CoachRequest(BaseModel):
    challenge_id: str
    prompt: str = Field(..., min_length=1, max_length=4000)
    hint_level: int = Field(default=1, ge=1, le=3)
    failed_checks: list[str] = Field(default_factory=list, max_length=30)
    sample_output: str = Field(default="", max_length=2000)
    score: int = Field(default=0, ge=0, le=100)


class CoachResponse(BaseModel):
    hint_level: int
    diagnosis: str
    hint: str
    question: str
    source: Literal["granite", "authored"]


class TechniqueRequest(BaseModel):
    prompt: str = Field(..., max_length=4000)
