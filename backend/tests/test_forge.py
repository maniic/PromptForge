"""
Tests for the forge pipeline — PIPE-01 through PIPE-07.

TDD RED phase: these tests are written against the *intended* API surface of
forge_service.py and the /api/forge route.  Both are empty stubs today, so
every test that exercises the route or the service should FAIL — confirming
the tests are meaningful before implementation begins in Plan 02.

Mocking strategy:
  Patch `backend.services.forge_service.generate_text` (the name as it will
  be imported inside forge_service, not the original granite_service module).
  Each test that exercises the full pipeline provides a side_effect list of 4
  GraniteResponse objects:
    [0] detect_category call  → returns a category string
    [1] craft_prompt call     → returns the crafted expert prompt
    [2] execute_crafted call  → returns result for crafted prompt
    [3] execute_raw call      → returns result for raw input

Phase 1 tests (test_granite.py) must continue to pass — do NOT modify conftest.py.
"""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_responses(*texts: str) -> list:
    """Build a list of GraniteResponse objects for mock side_effect."""
    from backend.models.forge import GraniteResponse
    return [GraniteResponse(text=t, latency_ms=10.0) for t in texts]


# ---------------------------------------------------------------------------
# PIPE-01 — Pydantic request validation (422 on invalid input)
# ---------------------------------------------------------------------------

def test_forge_rejects_short_input():
    """POST /api/forge with a 2-char input must return 422 (PIPE-01)."""
    from backend.main import app

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post("/api/forge", json={"input": "ab"})
    assert response.status_code == 422, (
        f"Expected 422 for short input, got {response.status_code}"
    )


def test_forge_rejects_long_input():
    """POST /api/forge with a 1001-char input must return 422 (PIPE-01)."""
    from backend.main import app

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post("/api/forge", json={"input": "x" * 1001})
    assert response.status_code == 422, (
        f"Expected 422 for long input, got {response.status_code}"
    )


def test_forge_accepts_valid_input():
    """POST /api/forge with valid input must return 200 with ForgeResponse shape (PIPE-01)."""
    from backend.main import app

    responses = _make_responses(
        "vibe_coding",
        "You are a senior Python developer...",
        "Crafted result text",
        "Raw result text",
    )

    with patch("backend.services.forge_service.generate_text", new_callable=AsyncMock) as mock_gt:
        mock_gt.side_effect = responses
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post("/api/forge", json={"input": "build a REST API in Python"})

    assert response.status_code == 200, (
        f"Expected 200 for valid input, got {response.status_code}: {response.text}"
    )
    data = response.json()
    assert "category" in data
    assert "crafted_prompt" in data
    assert "crafted_result" in data
    assert "raw_result" in data
    assert "call_timings" in data
    assert "total_latency_ms" in data


# ---------------------------------------------------------------------------
# PIPE-02 — Category detection parsing
# ---------------------------------------------------------------------------

def test_category_detection_vibe_coding():
    """_detect_category_from_text parses 'vibe_coding' from Granite output (PIPE-02)."""
    from backend.services.forge_service import _detect_category_from_text

    assert _detect_category_from_text("vibe_coding") == "vibe_coding"
    assert _detect_category_from_text("The category is: vibe_coding.") == "vibe_coding"


def test_category_detection_brainstorming():
    """_detect_category_from_text parses 'brainstorming' from Granite output (PIPE-02)."""
    from backend.services.forge_service import _detect_category_from_text

    assert _detect_category_from_text("brainstorming") == "brainstorming"
    assert _detect_category_from_text("Category: brainstorming\n") == "brainstorming"


def test_category_detection_qa():
    """_detect_category_from_text parses 'qa' from Granite output (PIPE-02)."""
    from backend.services.forge_service import _detect_category_from_text

    assert _detect_category_from_text("qa") == "qa"
    assert _detect_category_from_text("The answer is: qa") == "qa"


def test_category_detection_default():
    """_detect_category_from_text defaults to 'one_shot' on ambiguous text (PIPE-02)."""
    from backend.services.forge_service import _detect_category_from_text

    assert _detect_category_from_text("I'm not sure") == "one_shot"
    assert _detect_category_from_text("") == "one_shot"
    assert _detect_category_from_text("unknown_category") == "one_shot"


# ---------------------------------------------------------------------------
# PIPE-03 — Crafted prompt is populated
# ---------------------------------------------------------------------------

def test_crafted_prompt_populated():
    """ForgeResponse.crafted_prompt must be a non-empty string (PIPE-03)."""
    from backend.main import app

    responses = _make_responses(
        "brainstorming",
        "You are an innovation strategist with 15 years experience...",
        "Crafted result for ideas",
        "Raw result for ideas",
    )

    with patch("backend.services.forge_service.generate_text", new_callable=AsyncMock) as mock_gt:
        mock_gt.side_effect = responses
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post("/api/forge", json={"input": "give me ideas for a startup"})

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data["crafted_prompt"], str)
    assert len(data["crafted_prompt"]) > 0, "crafted_prompt must not be empty"


# ---------------------------------------------------------------------------
# PIPE-04 — Parallel execution calls
# ---------------------------------------------------------------------------

def test_parallel_calls_both_present():
    """call_timings must contain both 'execute_crafted' and 'execute_raw' entries (PIPE-04)."""
    from backend.main import app

    responses = _make_responses(
        "qa",
        "You are a senior research analyst...",
        "Crafted Q&A result",
        "Raw Q&A result",
    )

    with patch("backend.services.forge_service.generate_text", new_callable=AsyncMock) as mock_gt:
        mock_gt.side_effect = responses
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post("/api/forge", json={"input": "how does TCP/IP work"})

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    call_names = [t["call_name"] for t in data["call_timings"]]
    assert "execute_crafted" in call_names, f"'execute_crafted' missing from call_timings: {call_names}"
    assert "execute_raw" in call_names, f"'execute_raw' missing from call_timings: {call_names}"


@pytest.mark.asyncio
async def test_execute_calls_are_parallel():
    """
    With mocked 0.5 s delay on execute calls, total wall time must be < 1.2 s
    — proving asyncio.gather parallelism (PIPE-04).
    """
    from backend.services.forge_service import forge
    from backend.models.forge import GraniteResponse

    call_count = 0

    async def _timed_generate(prompt: str, call_name: str = "unknown", **kwargs) -> GraniteResponse:
        nonlocal call_count
        call_count += 1
        if call_name in ("execute_crafted", "execute_raw"):
            await asyncio.sleep(0.5)
        return GraniteResponse(text=f"response_{call_name}", latency_ms=500.0)

    with patch("backend.services.forge_service.generate_text", side_effect=_timed_generate):
        from backend.models.forge import ForgeRequest
        from fastapi import BackgroundTasks

        req = ForgeRequest(input="write a Python script to parse JSON")
        bg = BackgroundTasks()

        start = time.perf_counter()
        result = await forge(req, bg)
        elapsed = time.perf_counter() - start

    assert elapsed < 1.2, (
        f"Two 0.5 s execute calls should complete in < 1.2 s when parallel, took {elapsed:.2f} s"
    )


# ---------------------------------------------------------------------------
# PIPE-07 — BackgroundTasks logging
# ---------------------------------------------------------------------------

def test_log_event_is_background():
    """BackgroundTasks.add_task must be called with the log function (PIPE-07)."""
    from backend.main import app

    responses = _make_responses(
        "vibe_coding",
        "Expert prompt text",
        "Crafted result",
        "Raw result",
    )

    with patch("backend.services.forge_service.generate_text", new_callable=AsyncMock) as mock_gt:
        mock_gt.side_effect = responses

        with patch("fastapi.BackgroundTasks.add_task") as mock_add_task:
            client = TestClient(app, raise_server_exceptions=False)
            response = client.post("/api/forge", json={"input": "build a sorting algorithm"})

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    assert mock_add_task.called, "BackgroundTasks.add_task must be called for logging"


def test_log_event_failure_is_swallowed():
    """
    If the log function raises an exception, /api/forge must still return 200 (PIPE-07).
    The forge request must never fail due to a logging error.
    """
    from backend.main import app

    responses = _make_responses(
        "brainstorming",
        "Expert prompt for ideas",
        "Crafted ideas result",
        "Raw ideas result",
    )

    with patch("backend.services.forge_service.generate_text", new_callable=AsyncMock) as mock_gt:
        mock_gt.side_effect = responses

        with patch(
            "backend.services.forge_service._log_forge_event",
            side_effect=Exception("Supabase is down"),
        ):
            client = TestClient(app, raise_server_exceptions=False)
            response = client.post("/api/forge", json={"input": "ideas for a mobile app"})

    assert response.status_code == 200, (
        f"Request must return 200 even if logging fails, got {response.status_code}: {response.text}"
    )
