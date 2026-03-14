"""
Tests for the community prompt library — Phase 03, Plan 01.

TDD RED phase: tests are written against the intended API surface of
library_service.py and the /api/library route. Both are empty stubs,
so every test that exercises the route or the service will FAIL —
confirming the tests are meaningful before implementation begins.

Tests:
  LIB-01  test_post_library_saves_prompt       — POST /api/library returns 200 + record with id
  LIB-02  test_post_library_validation         — POST /api/library missing fields returns 422
  LIB-03  test_get_library_returns_list        — GET /api/library returns list of PromptSummary
  LIB-04  test_get_library_category_filter     — GET /api/library?category=vibe_coding filters
  LIB-05  test_get_library_by_id               — GET /api/library/{id} returns PromptDetail
  LIB-06  test_get_library_by_id_not_found     — GET /api/library/{id} unknown id returns 404
  LIB-07  test_log_forge_event_inserts         — _log_forge_event inserts into forge_events
  LIB-08  test_log_forge_event_failure_swallowed — _log_forge_event exceptions do not propagate

Mocking strategy:
  Patch `backend.db.supabase_client.supabase_client` so no real network calls
  are made during tests.
"""

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx


# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

_SAMPLE_ROW = {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "title": "Expert Python REST API Prompt",
    "author_name": "Alice",
    "category": "vibe_coding",
    "original_input": "build a REST API in Python",
    "crafted_prompt": "You are a senior Python developer...",
    "crafted_result": "Here is the implementation...",
    "raw_result": "Sure, here is some code...",
    "total_latency_ms": 1234.5,
    "created_at": "2026-03-14T09:00:00+00:00",
}

_SAVE_BODY = {
    "title": "Expert Python REST API Prompt",
    "author_name": "Alice",
    "category": "vibe_coding",
    "original_input": "build a REST API in Python",
    "crafted_prompt": "You are a senior Python developer...",
    "crafted_result": "Here is the implementation...",
    "raw_result": "Sure, here is some code...",
    "total_latency_ms": 1234.5,
}


def _mock_supabase_insert(row: dict) -> MagicMock:
    """Build a mock Supabase client whose insert chain returns `row`."""
    mock_client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = [row]
    mock_client.table.return_value.insert.return_value.execute.return_value = execute_result
    return mock_client


def _mock_supabase_select(rows: list) -> MagicMock:
    """Build a mock Supabase client whose select+order chain returns `rows`."""
    mock_client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = rows
    (
        mock_client.table.return_value
        .select.return_value
        .order.return_value
        .execute.return_value
    ) = execute_result
    # Also wire the .eq filter branch (used when category is provided)
    (
        mock_client.table.return_value
        .select.return_value
        .order.return_value
        .eq.return_value
        .execute.return_value
    ) = execute_result
    return mock_client


def _mock_supabase_select_single(rows: list) -> MagicMock:
    """Build a mock Supabase client whose select+eq chain returns `rows`."""
    mock_client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = rows
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .execute.return_value
    ) = execute_result
    return mock_client


# ---------------------------------------------------------------------------
# LIB-01 — POST /api/library saves prompt and returns record with id
# ---------------------------------------------------------------------------


def test_post_library_saves_prompt():
    """POST /api/library with valid SavePromptRequest returns 200 and a record with id."""
    from backend.main import app

    mock_client = _mock_supabase_insert(_SAMPLE_ROW)

    with patch("backend.db.supabase_client.supabase_client", return_value=mock_client):
        with patch("backend.services.library_service.supabase_client", return_value=mock_client):
            import httpx as _httpx
            from httpx import ASGITransport
            response = asyncio.get_event_loop().run_until_complete(
                _httpx.AsyncClient(
                    transport=ASGITransport(app=app), base_url="http://test"
                ).post("/api/library", json=_SAVE_BODY)
            )

    assert response.status_code == 200, (
        f"Expected 200 from POST /api/library, got {response.status_code}: {response.text}"
    )
    data = response.json()
    assert "id" in data, f"Response must contain 'id' field, got: {data}"


# ---------------------------------------------------------------------------
# LIB-02 — POST /api/library validation (422 on missing required fields)
# ---------------------------------------------------------------------------


def test_post_library_validation_missing_title():
    """POST /api/library without title returns 422."""
    from backend.main import app

    body = {k: v for k, v in _SAVE_BODY.items() if k != "title"}
    response = asyncio.get_event_loop().run_until_complete(
        httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ).post("/api/library", json=body)
    )
    assert response.status_code == 422, (
        f"Expected 422 for missing title, got {response.status_code}"
    )


def test_post_library_validation_missing_author():
    """POST /api/library without author_name returns 422."""
    from backend.main import app

    body = {k: v for k, v in _SAVE_BODY.items() if k != "author_name"}
    response = asyncio.get_event_loop().run_until_complete(
        httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ).post("/api/library", json=body)
    )
    assert response.status_code == 422, (
        f"Expected 422 for missing author_name, got {response.status_code}"
    )


# ---------------------------------------------------------------------------
# LIB-03 — GET /api/library returns list of PromptSummary objects
# ---------------------------------------------------------------------------


def test_get_library_returns_list():
    """GET /api/library returns a JSON array of PromptSummary objects."""
    from backend.main import app

    mock_client = _mock_supabase_select([_SAMPLE_ROW])

    with patch("backend.services.library_service.supabase_client", return_value=mock_client):
        response = asyncio.get_event_loop().run_until_complete(
            httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ).get("/api/library")
        )

    assert response.status_code == 200, (
        f"Expected 200 from GET /api/library, got {response.status_code}: {response.text}"
    )
    data = response.json()
    assert isinstance(data, list), f"Response must be a list, got: {type(data)}"
    assert len(data) == 1
    assert "id" in data[0]
    assert "title" in data[0]
    assert "author_name" in data[0]
    assert "category" in data[0]
    assert "created_at" in data[0]


# ---------------------------------------------------------------------------
# LIB-04 — GET /api/library?category=vibe_coding filters by category
# ---------------------------------------------------------------------------


def test_get_library_category_filter():
    """GET /api/library?category=vibe_coding calls get_prompts with category='vibe_coding'."""
    from backend.main import app

    mock_client = _mock_supabase_select([_SAMPLE_ROW])

    with patch("backend.services.library_service.supabase_client", return_value=mock_client):
        with patch(
            "backend.services.library_service.get_prompts",
            new_callable=AsyncMock,
        ) as mock_get:
            from backend.models.library import PromptSummary
            mock_get.return_value = [
                PromptSummary(
                    id=_SAMPLE_ROW["id"],
                    title=_SAMPLE_ROW["title"],
                    author_name=_SAMPLE_ROW["author_name"],
                    category=_SAMPLE_ROW["category"],
                    created_at=datetime.fromisoformat(_SAMPLE_ROW["created_at"]),
                )
            ]
            response = asyncio.get_event_loop().run_until_complete(
                httpx.AsyncClient(
                    transport=httpx.ASGITransport(app=app), base_url="http://test"
                ).get("/api/library?category=vibe_coding")
            )

    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )
    # Verify the service was called with the category filter
    mock_get.assert_called_once_with(category="vibe_coding")


# ---------------------------------------------------------------------------
# LIB-05 — GET /api/library/{id} returns PromptDetail
# ---------------------------------------------------------------------------


def test_get_library_by_id():
    """GET /api/library/{id} returns the full PromptDetail for a known id."""
    from backend.main import app

    mock_client = _mock_supabase_select_single([_SAMPLE_ROW])
    prompt_id = _SAMPLE_ROW["id"]

    with patch("backend.services.library_service.supabase_client", return_value=mock_client):
        response = asyncio.get_event_loop().run_until_complete(
            httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ).get(f"/api/library/{prompt_id}")
        )

    assert response.status_code == 200, (
        f"Expected 200 from GET /api/library/{prompt_id}, "
        f"got {response.status_code}: {response.text}"
    )
    data = response.json()
    assert data["id"] == prompt_id
    assert "crafted_prompt" in data, "PromptDetail must include crafted_prompt"
    assert "original_input" in data, "PromptDetail must include original_input"


# ---------------------------------------------------------------------------
# LIB-06 — GET /api/library/{id} returns 404 for unknown id
# ---------------------------------------------------------------------------


def test_get_library_by_id_not_found():
    """GET /api/library/{id} with an unknown id returns 404."""
    from backend.main import app

    # Mock returns empty data list → service should raise 404
    mock_client = _mock_supabase_select_single([])
    unknown_id = "00000000-0000-0000-0000-000000000000"

    with patch("backend.services.library_service.supabase_client", return_value=mock_client):
        response = asyncio.get_event_loop().run_until_complete(
            httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ).get(f"/api/library/{unknown_id}")
        )

    assert response.status_code == 404, (
        f"Expected 404 for unknown id, got {response.status_code}: {response.text}"
    )


# ---------------------------------------------------------------------------
# LIB-07 — _log_forge_event inserts into forge_events table
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_log_forge_event_inserts():
    """_log_forge_event calls supabase_client().table('forge_events').insert().execute()."""
    from backend.services.forge_service import _log_forge_event
    from backend.models.forge import ForgeResponse, CallTiming

    mock_client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = [{}]
    mock_client.table.return_value.insert.return_value.execute.return_value = execute_result

    response = ForgeResponse(
        category="vibe_coding",
        crafted_prompt="Expert prompt text",
        crafted_result="Crafted result",
        raw_result="Raw result",
        call_timings=[
            CallTiming(call_name="detect_category", latency_ms=10.0),
            CallTiming(call_name="craft_prompt", latency_ms=20.0),
            CallTiming(call_name="execute_crafted", latency_ms=500.0),
            CallTiming(call_name="execute_raw", latency_ms=500.0),
        ],
        total_latency_ms=1030.0,
    )

    with patch(
        "backend.services.forge_service.supabase_client", return_value=mock_client
    ):
        await _log_forge_event("build a REST API", response)

    # Verify insert was called on the forge_events table
    mock_client.table.assert_called_with("forge_events")
    mock_client.table.return_value.insert.assert_called_once()
    insert_call_args = mock_client.table.return_value.insert.call_args[0][0]
    assert insert_call_args.get("category") == "vibe_coding"
    assert insert_call_args.get("input_text") == "build a REST API"
    assert insert_call_args.get("total_latency_ms") == 1030.0


# ---------------------------------------------------------------------------
# LIB-08 — _log_forge_event exceptions are swallowed (non-fatal)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_log_forge_event_failure_swallowed():
    """_log_forge_event exceptions must not propagate — forge request must never fail."""
    from backend.services.forge_service import _log_forge_event
    from backend.models.forge import ForgeResponse, CallTiming

    response = ForgeResponse(
        category="brainstorming",
        crafted_prompt="Expert brainstorm prompt",
        crafted_result="Brainstorm result",
        raw_result="Raw brainstorm result",
        call_timings=[
            CallTiming(call_name="detect_category", latency_ms=10.0),
            CallTiming(call_name="craft_prompt", latency_ms=20.0),
            CallTiming(call_name="execute_crafted", latency_ms=500.0),
            CallTiming(call_name="execute_raw", latency_ms=500.0),
        ],
        total_latency_ms=1030.0,
    )

    mock_client = MagicMock()
    mock_client.table.side_effect = Exception("Supabase is unreachable")

    with patch(
        "backend.services.forge_service.supabase_client", return_value=mock_client
    ):
        # Must NOT raise any exception
        await _log_forge_event("ideas for a mobile app", response)
