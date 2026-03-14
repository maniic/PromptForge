"""
Tests for backend/services/granite_service.py — INFRA-05.

Covers:
  - generate_text returns GraniteResponse(text, latency_ms)
  - SDK exceptions are wrapped as GraniteError with call_name in message
  - Timeout > 30 s raises GraniteError with "timed out" in message
  - Two concurrent generate_text calls via asyncio.gather complete in
    parallel (wall time roughly equal to 1 call, not 2)
  - Startup probe failure triggers sys.exit(1) in lifespan
  - No os.getenv() calls exist anywhere in granite_service.py
"""
import asyncio
import sys
import time
import os

import pytest
import pytest_asyncio
from unittest.mock import MagicMock, patch, AsyncMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _import_service():
    """Fresh import helper (avoids stale cached singleton state)."""
    import backend.services.granite_service as gs
    return gs


# ---------------------------------------------------------------------------
# Test 1: generate_text returns GraniteResponse
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_text_returns_granite_response(mock_granite_model):
    """generate_text() should return GraniteResponse with str text and float latency."""
    from backend.services.granite_service import generate_text, GraniteResponse

    result = await generate_text(prompt="Hello", call_name="test_call", max_tokens=10)

    assert isinstance(result, GraniteResponse), f"Expected GraniteResponse, got {type(result)}"
    assert isinstance(result.text, str), "result.text must be str"
    assert isinstance(result.latency_ms, float), "result.latency_ms must be float"
    assert result.text == "Mocked Granite response"


# ---------------------------------------------------------------------------
# Test 2: SDK exception wrapped as GraniteError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sdk_exception_wrapped_as_granite_error(mock_granite_model):
    """When the SDK raises an arbitrary Exception, generate_text must raise GraniteError."""
    from backend.services.granite_service import generate_text, GraniteError

    mock_granite_model.generate_text.side_effect = Exception("IBM SDK exploded")

    with pytest.raises(GraniteError) as exc_info:
        await generate_text(prompt="fail me", call_name="sdk_error_test", max_tokens=10)

    assert "sdk_error_test" in str(exc_info.value), (
        f"call_name 'sdk_error_test' should be in error message, got: {exc_info.value}"
    )


# ---------------------------------------------------------------------------
# Test 3: Timeout raises GraniteError with "timed out"
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_text_timeout(mock_granite_model):
    """When SDK blocks longer than the 30 s timeout, a GraniteError with 'timed out' is raised."""
    from backend.services.granite_service import generate_text, GraniteError

    async def _slow_executor(loop, fn, *args, **kwargs):
        await asyncio.sleep(35)  # beyond 30 s timeout
        return "too late"

    import backend.services.granite_service as gs

    # Patch asyncio.wait_for to simulate a timeout immediately
    original_wait_for = asyncio.wait_for

    async def _raise_timeout(coro, timeout):
        raise asyncio.TimeoutError()

    with patch("backend.services.granite_service.asyncio") as mock_asyncio:
        mock_asyncio.get_running_loop.return_value = MagicMock()
        mock_asyncio.TimeoutError = asyncio.TimeoutError
        mock_asyncio.wait_for = _raise_timeout

        with pytest.raises(GraniteError) as exc_info:
            await generate_text(prompt="slow", call_name="timeout_test", max_tokens=10)

    assert "timed out" in str(exc_info.value).lower(), (
        f"Expected 'timed out' in error message, got: {exc_info.value}"
    )


# ---------------------------------------------------------------------------
# Test 4: Two concurrent calls complete in parallel
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_parallel_calls_are_concurrent(monkeypatch):
    """
    Two generate_text calls with a ~0.5 s mock delay each should complete in
    < 1.0 s total when run via asyncio.gather (i.e., they overlap).
    """
    import backend.services.granite_service as gs
    from backend.services.granite_service import generate_text

    # Make the model's generate_text block for 0.5 s to simulate real I/O
    def _slow_generate(prompt, params):
        time.sleep(0.5)
        return "parallel response"

    mock_model = MagicMock()
    mock_model.generate_text.side_effect = _slow_generate
    monkeypatch.setattr(gs, "_model", mock_model)
    monkeypatch.setattr(gs, "_credentials", MagicMock())

    start = time.perf_counter()
    results = await asyncio.gather(
        generate_text(prompt="call A", call_name="parallel_A", max_tokens=10),
        generate_text(prompt="call B", call_name="parallel_B", max_tokens=10),
    )
    elapsed = time.perf_counter() - start

    assert len(results) == 2
    assert elapsed < 1.0, (
        f"Two 0.5 s calls should complete in < 1.0 s when parallel, took {elapsed:.2f} s"
    )


# ---------------------------------------------------------------------------
# Test 5: Startup probe failure triggers sys.exit(1)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_startup_validation_fails_on_bad_credentials(monkeypatch):
    """
    When generate_text raises GraniteError during the startup probe,
    the lifespan context manager must call sys.exit(1).
    """
    from backend.services.granite_service import GraniteError
    import backend.main as app_module
    from contextlib import asynccontextmanager

    # Patch generate_text to raise GraniteError
    async def _bad_probe(*args, **kwargs):
        raise GraniteError("Invalid credentials (startup_probe)")

    monkeypatch.setattr(
        "backend.services.granite_service.generate_text",
        _bad_probe,
    )

    exit_called_with = []

    def _capture_exit(code):
        exit_called_with.append(code)
        raise SystemExit(code)

    monkeypatch.setattr(sys, "exit", _capture_exit)

    # Re-import main to get fresh lifespan reference after monkeypatching
    import importlib
    importlib.reload(app_module)

    # Run the lifespan startup
    with pytest.raises(SystemExit) as exc_info:
        async with app_module.lifespan(app_module.app):
            pass  # should not reach here

    assert exc_info.value.code == 1, f"Expected sys.exit(1), got sys.exit({exc_info.value.code})"


# ---------------------------------------------------------------------------
# Test 6: No os.getenv() in granite_service.py
# ---------------------------------------------------------------------------

def test_no_os_getenv_in_service():
    """granite_service.py must not call os.getenv() directly — config via settings only."""
    service_path = os.path.join(
        os.path.dirname(__file__),
        "..", "services", "granite_service.py"
    )
    service_path = os.path.abspath(service_path)

    with open(service_path, "r") as f:
        source = f.read()

    assert "os.getenv" not in source, (
        "granite_service.py must not use os.getenv() — use 'from backend.config import settings'"
    )
