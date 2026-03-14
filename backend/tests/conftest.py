"""
Shared test fixtures for PromptForge backend tests.

IMPORTANT: env vars are patched at module level (before any service import)
so that config.py's module-level `settings = get_settings()` never sees a
missing-var ValidationError during the test session.
"""
import os
import sys

# ---------------------------------------------------------------------------
# Patch env vars at module level — MUST happen before any backend import
# ---------------------------------------------------------------------------
_FAKE_ENV = {
    "WATSONX_API_KEY": "test-api-key",
    "WATSONX_PROJECT_ID": "test-project-id",
    "WATSONX_URL": "https://us-south.ml.cloud.ibm.com",
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key",
    "SUPABASE_SERVICE_KEY": "test-service-key",
}
for _k, _v in _FAKE_ENV.items():
    os.environ.setdefault(_k, _v)

# ---------------------------------------------------------------------------
# Now safe to import pytest and backend modules
# ---------------------------------------------------------------------------
import pytest
from unittest.mock import MagicMock, AsyncMock


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Ensure all required env vars are present for every test."""
    for key, value in _FAKE_ENV.items():
        monkeypatch.setenv(key, value)


@pytest.fixture
def mock_granite_model(monkeypatch):
    """
    Patch backend.services.granite_service._model with a MagicMock whose
    generate_text() method returns "Mocked Granite response".

    Also resets the _credentials singleton so tests start clean.
    """
    import backend.services.granite_service as gs

    mock_model = MagicMock()
    mock_model.generate_text.return_value = "Mocked Granite response"

    monkeypatch.setattr(gs, "_model", mock_model)
    monkeypatch.setattr(gs, "_credentials", MagicMock())

    return mock_model
