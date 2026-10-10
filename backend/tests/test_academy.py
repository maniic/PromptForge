"""
Tests for PromptForge Academy — curriculum integrity, grading engine,
technique detection, attempt pipeline, and coach fallbacks.

IBM Granite and Supabase are always mocked.
"""

import asyncio
import json
import re
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.models.forge import GraniteResponse
from backend.models.learn import Check
from backend.services import curriculum_service
from backend.services.grading_service import flesch_kincaid_grade, grade_output, run_check
from backend.services.granite_service import GraniteError
from backend.services.technique_service import detect_techniques

ALL_CHALLENGES = [
    curriculum_service.get_challenge(c.id)
    for t in curriculum_service.list_tracks()
    for c in t.challenges
]


@pytest.fixture(autouse=True)
def no_supabase(monkeypatch):
    """Attempt logging is fire-and-forget; never touch the network in tests."""
    monkeypatch.setattr("backend.services.progress_service.log_attempt", AsyncMock())


@pytest.fixture
def client():
    from backend.main import app

    return TestClient(app, raise_server_exceptions=False)


def _resp(text: str) -> GraniteResponse:
    return GraniteResponse(text=text, latency_ms=5.0)


def _golden_chat(challenge, judge_text='{"scores": []}'):
    """Mock chat(): attempt calls return each test case's golden output."""
    goldens = {f"attempt:{challenge.id}:{tc.id}": tc.golden_output for tc in challenge.test_cases}

    async def fake_chat(prompt, call_name="unknown", **kwargs):
        if call_name in goldens:
            return _resp(goldens[call_name])
        return _resp(judge_text)

    return fake_chat


# ---------------------------------------------------------------------------
# Curriculum integrity — every challenge must be passable and consistent
# ---------------------------------------------------------------------------


def test_curriculum_has_tracks_and_challenges():
    tracks = curriculum_service.list_tracks()
    assert len(tracks) >= 4
    assert len(ALL_CHALLENGES) >= 9


@pytest.mark.parametrize("challenge", ALL_CHALLENGES, ids=lambda c: c.id)
def test_golden_outputs_pass_every_check(challenge):
    for tc in challenge.test_cases:
        results = grade_output(tc.checks, tc.golden_output)
        failed = [f"{r.label}: {r.detail}" for r in results if not r.passed]
        assert not failed, f"{challenge.id}/{tc.id} golden output fails: {failed}"


@pytest.mark.parametrize("challenge", ALL_CHALLENGES, ids=lambda c: c.id)
def test_challenge_is_well_formed(challenge):
    assert curriculum_service.missing_variables(challenge.reference_prompt, challenge.variables) == []
    assert curriculum_service.missing_variables(challenge.starter_prompt, challenge.variables) == []
    assert any(tc.hidden for tc in challenge.test_cases), "needs at least one hidden test"
    assert any(not tc.hidden for tc in challenge.test_cases), "needs at least one visible test"
    for tc in challenge.test_cases:
        assert set(tc.vars) == set(challenge.variables)
        for check in tc.checks:
            if check.type == "regex":
                re.compile(check.value)


@pytest.mark.parametrize("challenge", ALL_CHALLENGES, ids=lambda c: c.id)
def test_naive_output_does_not_pass(challenge):
    """A chatty, unstructured answer must fail — otherwise the challenge teaches nothing."""
    naive = "Sure! Here is my answer to your request! I hope this helps you a lot with whatever you need today."
    for tc in challenge.test_cases:
        results = grade_output(tc.checks, naive)
        assert not all(r.passed for r in results), f"{challenge.id}/{tc.id} passes a naive answer"


# ---------------------------------------------------------------------------
# Grading engine
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "check, output, expected",
    [
        (Check(type="contains", value=["a", "B"], label=""), "A b c", True),
        (Check(type="contains", value="zzz", label=""), "abc", False),
        (Check(type="not_contains", value=["!"], label=""), "Hello!", False),
        (Check(type="equals", value="TSH-BLK-COT-XL", label=""), "  `TSH-BLK-COT-XL`. ", True),
        (Check(type="equals", value="NOT IN CONTEXT", label=""), "NOT IN CONTEXT. Sorry.", False),
        (Check(type="regex", value=r"\AANSWER\Z", label=""), "ANSWER\nmore", False),
        (Check(type="max_words", value=3, label=""), "one two three", True),
        (Check(type="max_words", value=3, label=""), "one two three four", False),
        (Check(type="min_words", value=2, label=""), "one", False),
        (Check(type="bullet_count", value=2, label=""), "- a\n* b\nplain", True),
        (Check(type="bullet_count", value=2, label=""), "1. a\n2) b\n3. c", False),
        (Check(type="max_words_per_line", value=3, label=""), "- a b c\n- a b c d", False),
        (Check(type="json_valid", label=""), '```json\n{"a": 1}\n```', True),
        (Check(type="json_valid", label=""), 'Here you go: {"a": 1}', False),
        (Check(type="json_keys", value=["a", "b"], label=""), '{"a": 1}', False),
        (Check(type="json_field", path="x.y", value="Hi", label=""), '{"x": {"y": "hi"}}', True),
        (Check(type="json_field", path="0.name", value="Ann", match="contains", label=""), '[{"name": "Ann Lee"}]', True),
        (Check(type="json_array_length", value=2, label=""), "[1, 2]", True),
        (Check(type="json_array_length", value=2, label=""), '{"a": 1}', False),
    ],
)
def test_run_check(check, output, expected):
    assert run_check(check, output).passed is expected


def test_failed_check_explains_why():
    result = run_check(Check(type="max_words", value=2, label="Short"), "one two three")
    assert not result.passed
    assert "3 words" in result.detail


def test_json_parse_error_reported_once():
    checks = [Check(type="json_valid", label="valid"), Check(type="json_keys", value=["a"], label="keys")]
    valid, keys = grade_output(checks, "Sure! Here's the JSON: {}")
    assert 'starts with "Sure!' in valid.detail
    assert keys.detail == "needs valid JSON first"


def test_reading_grade_level_separates_simple_from_complex():
    simple = "The cat sat on the mat. It was a sunny day. The cat was happy."
    complex_ = (
        "Photosynthetic organisms utilize chlorophyll-mediated photochemical reactions "
        "to synthesize carbohydrates from atmospheric carbon dioxide."
    )
    assert flesch_kincaid_grade(simple) < 4
    assert flesch_kincaid_grade(complex_) > 12


# ---------------------------------------------------------------------------
# Technique detection
# ---------------------------------------------------------------------------


def test_detect_techniques_on_strong_prompt():
    prompt = curriculum_service.get_challenge("action-items").reference_prompt
    detected = set(detect_techniques(prompt).detected)
    assert {"role", "output_format", "constraints", "examples", "delimiters", "variables"} <= detected


def test_detect_techniques_on_weak_prompt():
    report = detect_techniques("Summarize this review: {{review}}")
    assert report.detected == ["variables"]
    assert report.estimated_tokens > 0


def test_techniques_endpoint(client):
    response = client.post("/api/techniques", json={"prompt": "You are a tutor. Think step by step."})
    assert response.status_code == 200
    assert {"role", "reasoning"} <= set(response.json()["detected"])


# ---------------------------------------------------------------------------
# Curriculum API
# ---------------------------------------------------------------------------


def test_get_tracks(client):
    response = client.get("/api/tracks")
    assert response.status_code == 200
    data = response.json()
    assert data[0]["id"] == "foundations"
    assert data[0]["challenges"][0]["id"] == "clear-instructions"


def test_challenge_detail_hides_secrets(client):
    response = client.get("/api/challenges/grounding")
    assert response.status_code == 200
    body = response.text
    data = response.json()
    assert "reference_prompt" not in data
    assert "golden_output" not in body
    hidden = [tc for tc in data["test_cases"] if tc["hidden"]]
    assert hidden and all(tc["vars"] is None for tc in hidden)
    assert "mileage" not in body  # neither hidden inputs nor revealing ids may leak
    assert [tc["id"] for tc in hidden] == ["hidden-1", "hidden-2"]


def test_unknown_challenge_404(client):
    assert client.get("/api/challenges/nope").status_code == 404
    assert client.post("/api/challenges/nope/attempt", json={"prompt": "x" * 20}).status_code == 404


def test_solution_endpoint(client):
    response = client.get("/api/challenges/few-shot/solution")
    assert response.status_code == 200
    assert "TSH-BLU-COT-M" in response.json()["reference_prompt"]


def test_stats_returns_zeros_when_supabase_unavailable(client):
    with patch("backend.services.progress_service.supabase_client", side_effect=RuntimeError("down")):
        response = client.get("/api/challenges/few-shot/stats")
    assert response.status_code == 200
    assert response.json() == {"attempts": 0, "pass_rate": 0.0, "avg_score": 0.0}


# ---------------------------------------------------------------------------
# Attempt pipeline
# ---------------------------------------------------------------------------


def test_attempt_with_golden_outputs_scores_100(client):
    challenge = curriculum_service.get_challenge("few-shot")
    with patch("backend.services.learn_service.chat", side_effect=_golden_chat(challenge)):
        response = client.post(
            "/api/challenges/few-shot/attempt", json={"prompt": challenge.reference_prompt}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 100
    assert data["passed"] is True
    assert data["stars"] == 3
    assert data["judge_score"] is None  # few-shot has no rubric
    hidden = [r for r in data["test_results"] if r["hidden"]]
    assert hidden and all(r["output"] is None for r in hidden)


def test_attempt_blends_judge_score(client):
    challenge = curriculum_service.get_challenge("constraints")
    judge = json.dumps({"scores": [{"criterion": c, "score": 3, "reason": "ok"} for c in challenge.rubric]})
    with patch("backend.services.learn_service.chat", side_effect=_golden_chat(challenge, judge)):
        data = client.post(
            "/api/challenges/constraints/attempt", json={"prompt": challenge.reference_prompt}
        ).json()
    assert data["checks_score"] == 100
    assert data["judge_score"] == 50
    assert data["score"] == round(0.75 * 100 + 0.25 * 50)
    assert len(data["rubric_scores"]) == len(challenge.rubric)


def test_attempt_falls_back_to_checks_when_judge_output_is_garbage(client):
    challenge = curriculum_service.get_challenge("constraints")
    with patch("backend.services.learn_service.chat", side_effect=_golden_chat(challenge, "I think it's great")):
        data = client.post(
            "/api/challenges/constraints/attempt", json={"prompt": challenge.reference_prompt}
        ).json()
    assert data["judge_score"] is None
    assert data["score"] == 100


def test_attempt_with_chatty_outputs_fails(client):
    mock = AsyncMock(return_value=_resp("Sure! Here's a SKU for you: TSH-BLK-COT-XL. Let me know!"))
    with patch("backend.services.learn_service.chat", mock):
        data = client.post(
            "/api/challenges/few-shot/attempt", json={"prompt": "Make a SKU for {{product}}"}
        ).json()
    assert data["passed"] is False
    assert data["stars"] == 0
    assert data["score"] < 80


def test_attempt_rejects_prompt_missing_variable(client):
    mock = AsyncMock()
    with patch("backend.services.learn_service.chat", mock):
        response = client.post(
            "/api/challenges/grounding/attempt", json={"prompt": "Answer this question: {{question}}"}
        )
    assert response.status_code == 422
    assert "{{context}}" in response.json()["detail"]
    mock.assert_not_called()


def test_attempt_runs_test_cases_in_parallel(client):
    challenge = curriculum_service.get_challenge("grounding")  # 4 test cases

    async def slow_chat(prompt, call_name="unknown", **kwargs):
        await asyncio.sleep(0.2)
        return _resp("NOT IN CONTEXT")

    with patch("backend.services.learn_service.chat", side_effect=slow_chat):
        t0 = time.perf_counter()
        response = client.post(
            "/api/challenges/grounding/attempt", json={"prompt": challenge.reference_prompt}
        )
        elapsed = time.perf_counter() - t0
    assert response.status_code == 200
    assert elapsed < 0.6, f"test cases ran sequentially ({elapsed:.2f}s)"


def test_attempt_granite_error_returns_502(client):
    with patch("backend.services.learn_service.chat", AsyncMock(side_effect=GraniteError("down"))):
        response = client.post(
            "/api/challenges/few-shot/attempt", json={"prompt": "SKU for {{product}} please"}
        )
    assert response.status_code == 502


def test_attempt_substitutes_variables_into_prompt(client):
    challenge = curriculum_service.get_challenge("grounding")
    mock = AsyncMock(return_value=_resp("NOT IN CONTEXT"))
    with patch("backend.services.learn_service.chat", mock):
        client.post("/api/challenges/grounding/attempt", json={"prompt": challenge.reference_prompt})
    sent = [c.args[0] for c in mock.call_args_list]
    assert len(sent) == len(challenge.test_cases)
    assert all("{{" not in p for p in sent)
    assert any("pets" in p for p in sent)


# ---------------------------------------------------------------------------
# Coach
# ---------------------------------------------------------------------------


def _coach_body(**overrides):
    body = {
        "challenge_id": "grounding",
        "prompt": "{{context}} {{question}}",
        "hint_level": 2,
        "failed_checks": ["Responds exactly NOT IN CONTEXT"],
        "sample_output": "Yes, pets are allowed.",
        "score": 40,
    }
    body.update(overrides)
    return body


def test_coach_returns_granite_hint(client):
    reply = json.dumps({"diagnosis": "It guessed.", "hint": "Give it a fallback.", "question": "What if it's missing?"})
    mock = AsyncMock(return_value=_resp(reply))
    with patch("backend.services.learn_service.chat", mock):
        data = client.post("/api/coach", json=_coach_body()).json()
    assert data["source"] == "granite"
    assert data["hint"] == "Give it a fallback."
    sent = mock.call_args.args[0]
    assert "level 2" in sent and "Yes, pets are allowed." in sent


def test_coach_falls_back_to_authored_hint_on_bad_json(client):
    with patch("backend.services.learn_service.chat", AsyncMock(return_value=_resp("just do better"))):
        data = client.post("/api/coach", json=_coach_body(hint_level=3)).json()
    challenge = curriculum_service.get_challenge("grounding")
    assert data["source"] == "authored"
    assert data["hint"] == challenge.hints[2]


def test_coach_falls_back_on_granite_error(client):
    with patch("backend.services.learn_service.chat", AsyncMock(side_effect=GraniteError("down"))):
        response = client.post("/api/coach", json=_coach_body(hint_level=1))
    assert response.status_code == 200
    assert response.json()["source"] == "authored"


def test_coach_rejects_invalid_hint_level(client):
    assert client.post("/api/coach", json=_coach_body(hint_level=4)).status_code == 422


# ---------------------------------------------------------------------------
# granite_service.chat
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_uses_chat_endpoint(mock_granite_model, monkeypatch):
    import backend.services.granite_service as gs

    monkeypatch.setattr(gs, "_chat_supported", True)
    mock_granite_model.chat.return_value = {"choices": [{"message": {"content": "hi there"}}]}
    result = await gs.chat("Say hi", call_name="t")
    assert result.text == "hi there"
    messages = mock_granite_model.chat.call_args.kwargs["messages"]
    assert messages == [{"role": "user", "content": "Say hi"}]


@pytest.mark.asyncio
async def test_chat_falls_back_to_templated_generate(mock_granite_model, monkeypatch):
    import backend.services.granite_service as gs

    monkeypatch.setattr(gs, "_chat_supported", True)
    mock_granite_model.chat.side_effect = RuntimeError("chat not supported for model")
    mock_granite_model.generate_text.return_value = "fallback text"
    result = await gs.chat("Say hi", call_name="t")
    assert result.text == "fallback text"
    sent = mock_granite_model.generate_text.call_args.kwargs["prompt"]
    assert "<|start_of_role|>user<|end_of_role|>Say hi" in sent
    assert gs._chat_supported is False


@pytest.mark.asyncio
async def test_chat_stays_enabled_when_fallback_also_fails(mock_granite_model, monkeypatch):
    import backend.services.granite_service as gs

    monkeypatch.setattr(gs, "_chat_supported", True)
    mock_granite_model.chat.side_effect = RuntimeError("network")
    mock_granite_model.generate_text.side_effect = RuntimeError("network")
    with pytest.raises(GraniteError):
        await gs.chat("Say hi", call_name="t")
    assert gs._chat_supported is True
