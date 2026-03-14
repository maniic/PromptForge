# Testing Patterns

**Analysis Date:** 2026-03-13

## Test Framework

**Runner:**
- pytest (Python backend testing)
- Config: no pytest.ini found; default pytest discovery used
- Invoked via: `cd backend && source venv/bin/activate && pytest -v`

**Assertion Library:**
- pytest built-in assertions

**Run Commands:**
```bash
cd backend && source venv/bin/activate && pytest -v              # Run all tests with verbose output
cd backend && source venv/bin/activate && pytest -v --watch     # Watch mode (requires pytest-watch)
cd backend && source venv/bin/activate && pytest --cov          # Coverage report (requires pytest-cov)
```

## Test File Organization

**Location:**
- Co-located in `backend/tests/` directory separate from source code
- Test files mirror domain structure: `test_forge.py`, `test_granite.py` correspond to `services/forge_service.py`, `services/granite_service.py`

**Naming:**
- `test_*.py` prefix for all test files
- `conftest.py` for shared fixtures and configuration

**Structure:**
```
backend/
├── tests/
│   ├── conftest.py        # Shared fixtures, mocking setup
│   ├── test_forge.py      # Tests for forge service/router
│   ├── test_granite.py    # Tests for granite service
│   └── [other test files]
├── services/
├── routers/
├── models/
└── ...
```

## Test Structure

**Suite Organization:**

The codebase provides a `conftest.py` file for centralized test configuration. Tests should follow this structure:

```python
# test_forge.py
import pytest
from backend.models.forge import ForgeRequest, ForgeResponse
from backend.services.forge_service import forge

@pytest.fixture
def valid_forge_request():
    """Fixture for a valid ForgeRequest."""
    return ForgeRequest(
        raw_input="Make me a habit tracker app",
        category="vibe_coding"
    )

def test_forge_returns_response_with_results(valid_forge_request):
    """Test that forge returns ForgeResponse with populated results."""
    response = forge(valid_forge_request)
    assert isinstance(response, ForgeResponse)
    assert response.crafted_prompt is not None
    assert response.good_result is not None
    assert response.bad_result is not None

def test_forge_crafted_prompt_is_substantial(valid_forge_request):
    """Test that crafted_prompt is 150+ words (not just repeating input)."""
    response = forge(valid_forge_request)
    word_count = len(response.crafted_prompt.split())
    assert word_count >= 150, f"Expected 150+ words, got {word_count}"
```

**Patterns:**
- **Setup pattern:** Fixtures in `conftest.py` for shared test data and mocks
- **Teardown pattern:** Use `@pytest.fixture` with `yield` for cleanup (e.g., temporary files, database connections)
- **Assertion pattern:** Clear assertions with helpful error messages; use `assert ... , f"message: {value}"`

## Mocking

**Framework:** `unittest.mock` (Python standard library)

**Patterns:**

Mocking Granite API calls (required for unit tests):

```python
# tests/conftest.py
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_granite_api():
    """Mock the IBM watsonx.ai Granite API."""
    with patch('backend.services.granite_service.GraniteAPI') as mock:
        mock.generate = AsyncMock(return_value={
            "result": {
                "generated_text": "Mocked granite response"
            }
        })
        yield mock

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for library operations."""
    with patch('backend.services.library_service.SupabaseClient') as mock:
        mock.insert = AsyncMock(return_value={"id": "test-id"})
        yield mock
```

**What to Mock:**
- External API calls (IBM watsonx.ai Granite service — never real calls in tests)
- Database operations (Supabase — mock insert/query/update)
- File I/O (prompt templates — mock file reads)
- Environment dependencies (services external to the function under test)

**What NOT to Mock:**
- Pydantic model validation (test real validation behavior)
- Internal service logic (test actual forge pipeline, category detection)
- Configuration loading (test with real config.py or test settings)
- Router request/response handling (test actual FastAPI routes)

## Fixtures and Factories

**Test Data:**

```python
# tests/conftest.py
import pytest
from backend.models.forge import ForgeRequest, ForgeResponse

@pytest.fixture
def valid_forge_request():
    """Valid ForgeRequest for vibe_coding."""
    return ForgeRequest(
        raw_input="Make me a habit tracker app",
        category="vibe_coding"
    )

@pytest.fixture
def valid_forge_request_brainstorming():
    """Valid ForgeRequest for brainstorming."""
    return ForgeRequest(
        raw_input="I want to start a side business",
        category="brainstorming"
    )

def forge_request_factory(raw_input="test input", category="vibe_coding"):
    """Factory for creating ForgeRequest with custom values."""
    return ForgeRequest(raw_input=raw_input, category=category)
```

**Location:**
- All fixtures in `backend/tests/conftest.py`
- Factories in conftest.py or specific test files if only used there
- Import fixtures by name (pytest auto-discovers conftest.py)

## Coverage

**Requirements:** Not currently enforced; coverage reports available via pytest-cov

**View Coverage:**
```bash
cd backend && source venv/bin/activate && pytest --cov=backend --cov-report=html
# Opens coverage/index.html in browser
```

**Target Areas:**
- All service functions (forge_service, granite_service, library_service) should have >80% coverage
- All routes (forge, library, health) should be tested
- Error paths must be tested (invalid requests, API failures, etc.)

## Test Types

**Unit Tests:**
- Scope: Test individual functions/methods in isolation
- Approach: Use mocks for all external dependencies
- Location: `test_*.py` files
- Examples: Test category detection, prompt validation, response formatting

**Integration Tests:**
- Scope: Test service layers working together (e.g., forge_service calling granite_service)
- Approach: Mock only external APIs (Granite, Supabase), test real service orchestration
- Location: Can be in same `test_*.py` files with `@pytest.mark.integration`
- Examples: Full forge pipeline, library save-and-retrieve

**E2E Tests:**
- Framework: Not used in current phase (frontend testing via Cypress/Playwright would be added later)
- Status: Acceptance criteria focus on manual testing and API verification

## Common Patterns

**Async Testing:**

```python
# tests/test_forge.py
import pytest
import asyncio

@pytest.mark.asyncio
async def test_forge_concurrent_execution(mock_granite_api):
    """Test that calls 3A and 3B run concurrently via asyncio.gather()."""
    request = ForgeRequest(raw_input="test", category="vibe_coding")

    # Should complete in time equivalent to longest call, not sum of both
    start = asyncio.get_event_loop().time()
    response = await forge_service.forge_async(request)
    elapsed = asyncio.get_event_loop().time() - start

    # If running sequentially would take 2+ seconds, concurrent should be ~1 second
    assert elapsed < 1.5, f"Forge took {elapsed}s; concurrent execution may not be working"

@pytest.fixture
def event_loop():
    """Provide event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
```

**Error Testing:**

```python
# tests/test_forge.py
def test_forge_raises_on_invalid_category():
    """Test that ForgeRequest rejects invalid category."""
    with pytest.raises(ValueError):  # or pydantic.ValidationError
        ForgeRequest(raw_input="test", category="invalid_category")

def test_forge_returns_422_on_missing_raw_input(client):
    """Test that POST /api/forge returns 422 for missing raw_input."""
    response = client.post("/api/forge", json={"category": "vibe_coding"})
    assert response.status_code == 422
    assert "raw_input" in response.json()["detail"][0]["loc"]

@pytest.mark.asyncio
async def test_forge_does_not_fail_on_supabase_error(mock_granite_api, mock_supabase):
    """Test that forge returns result even if library logging fails."""
    mock_supabase.insert.side_effect = Exception("Database connection error")

    request = ForgeRequest(raw_input="test", category="vibe_coding")
    response = await forge_service.forge_async(request)

    # Should still return successful response despite database error
    assert response.good_result is not None
    # Error logged but not raised
```

## Critical Acceptance Criteria for Tests

Per `docs/acceptance.md`, these MUST be verifiable:

1. **All 4 Granite calls are REAL** (not stubs) — tests must verify actual API calls
   - Mock Granite but verify `mock_granite_api.call_count == 4` per forge request
   - Include latency assertions to ensure calls are being made

2. **good_result is visibly richer/longer than bad_result**
   - Test: `len(response.good_result) > len(response.bad_result)`

3. **crafted_prompt is 150+ words**
   - Test: `len(response.crafted_prompt.split()) >= 150`

4. **Calls 3A and 3B run simultaneously**
   - Test: Use time measurements or `asyncio.gather()` verification

---

*Testing analysis: 2026-03-13*
