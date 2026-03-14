# Phase 1: IBM Integration - Research

**Researched:** 2026-03-13
**Domain:** IBM watsonx.ai Python SDK, FastAPI lifespan, asyncio executor patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use the official `ibm-watsonx-ai` Python SDK — handles auth token refresh, model params, endpoint routing
- Singleton client initialized once at module level, reused across all requests (SDK handles token refresh internally)
- Single model ID from `config.py` (`ibm/granite-13b-instruct-v2`) used for ALL Granite calls — no per-call model override
- `generate_text()` accepts per-call parameters (max_tokens, temperature) with defaults from config — needed since detect (short) vs execute (long) have different needs
- Make a real lightweight Granite API call at startup (e.g., "Say hello" with max_tokens=5) to verify credentials work
- If validation fails, server exits immediately with `sys.exit(1)` and clear error message — fail fast per INFRA-05
- Log response latency on success: "IBM Granite verified in {X}ms" — gives confidence during demo prep
- Validation runs in FastAPI lifespan event (startup), before any requests are accepted
- Use `asyncio.get_event_loop().run_in_executor(None, ...)` to wrap sync SDK calls for parallel execution
- Single async entry point only: callers always use `await granite.generate_text()` — run_in_executor wrapping is internal
- `generate_text()` tracks and returns call latency (wall time in ms) — captured at service level for UX-05 IBM API Calls panel
- Return type is a Pydantic model: `GraniteResponse(text='...', latency_ms=2340)` — consistent with Pydantic-first codebase
- No retry logic — fail fast on error
- Wrap SDK exceptions in a custom `GraniteError` exception — decouples callers from SDK internals
- 30s per-call timeout — generous enough for slow responses, prevents hanging during demo
- Error messages include human-readable text + call name: e.g., "Granite call failed (detect_category): Invalid API key"

### Claude's Discretion
- Exact SDK initialization parameters beyond what's in config.py
- Thread pool executor size (default None = OS decides)
- Logging format and verbosity beyond the startup validation message

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-05 | IBM watsonx.ai credentials validated at server startup (fail fast, not mid-demo) | FastAPI lifespan context manager pattern; sys.exit(1) called before yield; lightweight probe call ("Say hello", max_tokens=5) validates real credentials |
</phase_requirements>

---

## Summary

Phase 1 produces `backend/services/granite_service.py` — the single gateway for all IBM Granite calls in the application. All other backend phases (2 through 9) depend on this service being correct. The service wraps the synchronous `ibm-watsonx-ai` Python SDK in async-compatible code, exposes a single `generate_text()` coroutine, and validates credentials at server startup with fail-fast behavior.

The IBM SDK (`ibm-watsonx-ai` v1.5.3) is synchronous-only. FastAPI is async. Bridging these requires `run_in_executor` (or Starlette's `run_in_threadpool`) to prevent blocking the event loop. Two simultaneous calls wrapped in `asyncio.gather()` achieve true parallel execution because each runs in a separate thread while the event loop remains free.

The critical implementation risk is the lifespan startup exit: raising an exception in FastAPI's lifespan context manager causes `uvicorn` to print "Application startup failed. Exiting." and stop the server — which is the correct behavior for INFRA-05. Calling `sys.exit(1)` inside a lifespan also works but produces a `SystemExit` traceback. Both approaches halt the server before serving requests; the exception-raise approach is cleaner for hackathon output.

**Primary recommendation:** Implement `granite_service.py` as a module-level singleton pattern — create `Credentials` and `ModelInference` objects at import time (or in a module-level `_init()` called from lifespan), wrap all `generate_text` calls with `asyncio.get_event_loop().run_in_executor(None, ...)`, and raise `GraniteError` on any SDK exception.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ibm-watsonx-ai | 1.5.3 (Feb 2026) | IBM Granite SDK — auth, token refresh, model inference | Official IBM SDK; handles IAM token refresh automatically; Python 3.11 compatible |
| fastapi | current in venv | Web framework; lifespan events for startup validation | Project-locked stack |
| pydantic | v2 (via FastAPI) | GraniteResponse return type | Project uses Pydantic-first pattern (see forge.py) |
| starlette | bundled with FastAPI | `run_in_threadpool` helper for sync-to-async bridging | Simpler than raw `run_in_executor`; integrated with FastAPI executor |
| pytest | latest | Test framework | Project has `tests/` directory with `test_granite.py` stub |
| pytest-asyncio | latest | Test async coroutines | Required for testing `async def generate_text()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| asyncio (stdlib) | Python 3.11 | `asyncio.gather()` for parallel calls | Callers (Phase 2) use `asyncio.gather(generate_text(a), generate_text(b))` |
| concurrent.futures (stdlib) | Python 3.11 | ThreadPoolExecutor backing run_in_executor | Implicit when executor=None (OS-managed pool) |
| time (stdlib) | Python 3.11 | Wall-clock latency measurement | `time.perf_counter()` for sub-millisecond precision |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `run_in_executor(None, ...)` | `starlette.concurrency.run_in_threadpool` | `run_in_threadpool` is cleaner Starlette-native; `run_in_executor` is what CONTEXT.md locked — use `run_in_executor` |
| `asyncio.to_thread()` | `run_in_executor(None, ...)` | `asyncio.to_thread` is Python 3.9+ sugar for same thing; either works, `run_in_executor` preferred per decision |
| Raise exception in lifespan | `sys.exit(1)` in lifespan | Both halt uvicorn before serving; exception raise is cleaner (no `SystemExit` traceback); `sys.exit(1)` is what CONTEXT.md specified — use it |

**Installation:**
```bash
pip install ibm-watsonx-ai pytest pytest-asyncio
```

---

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── config.py               # Settings (already exists, complete)
├── main.py                 # FastAPI app + lifespan event (stub — needs implementation)
├── services/
│   └── granite_service.py  # Singleton ModelInference + async generate_text (stub — core deliverable)
├── models/
│   └── forge.py            # Add GraniteResponse Pydantic model here
└── tests/
    ├── conftest.py          # Shared fixtures: mock ModelInference, env patching
    └── test_granite.py     # Unit + integration tests for granite_service
```

### Pattern 1: Module-Level Singleton with Lifespan Validation

**What:** `ModelInference` instantiated once at module level; lifespan calls a probe `generate_text` to validate credentials before any request is served.

**When to use:** Single model, single project — no per-request reconfiguration needed. Token refresh is internal to SDK.

**Example:**
```python
# Source: ibm.github.io/watsonx-ai-python-sdk/v1.5.2/fm_model_inference.html
# backend/services/granite_service.py

from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

from backend.config import settings

class GraniteError(Exception):
    """Wraps all IBM SDK exceptions. Decouples callers from SDK internals."""
    pass

# Module-level singleton — instantiated once, reused forever
_credentials: Credentials | None = None
_model: ModelInference | None = None

def _get_model() -> ModelInference:
    global _credentials, _model
    if _model is None:
        _credentials = Credentials(
            url=settings.watsonx_url,
            api_key=settings.watsonx_api_key,
        )
        _model = ModelInference(
            model_id=settings.watsonx_model_id,
            credentials=_credentials,
            project_id=settings.watsonx_project_id,
        )
    return _model
```

### Pattern 2: Async Wrapper with run_in_executor

**What:** The SDK's synchronous `generate_text` is wrapped in `asyncio.get_event_loop().run_in_executor(None, ...)` so it runs in a thread pool without blocking the event loop. Callers get a coroutine they can `await` or combine with `asyncio.gather()`.

**When to use:** Every single Granite call in the codebase. Never call SDK `generate_text` directly from async code.

**Example:**
```python
# Source: Starlette concurrency docs + asyncio stdlib
import asyncio
import time
from pydantic import BaseModel

class GraniteResponse(BaseModel):
    text: str
    latency_ms: float

async def generate_text(
    prompt: str,
    call_name: str = "unknown",
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> GraniteResponse:
    model = _get_model()

    params = {
        GenParams.MAX_NEW_TOKENS: max_tokens or settings.max_tokens_craft,
    }
    if temperature is not None:
        params[GenParams.TEMPERATURE] = temperature

    loop = asyncio.get_event_loop()
    start = time.perf_counter()
    try:
        text = await asyncio.wait_for(
            loop.run_in_executor(
                None,  # default ThreadPoolExecutor
                lambda: model.generate_text(prompt=prompt, params=params),
            ),
            timeout=30.0,  # 30s per CONTEXT.md decision
        )
    except asyncio.TimeoutError:
        raise GraniteError(f"Granite call timed out ({call_name}): exceeded 30s")
    except Exception as exc:
        raise GraniteError(f"Granite call failed ({call_name}): {exc}") from exc

    latency_ms = (time.perf_counter() - start) * 1000
    return GraniteResponse(text=text, latency_ms=round(latency_ms, 1))
```

### Pattern 3: FastAPI Lifespan Startup Validation

**What:** On server startup, make a real but cheap probe call to IBM. If it fails, call `sys.exit(1)` with a human-readable error before any requests are accepted.

**When to use:** `main.py` lifespan configuration. Runs exactly once per server start.

**Example:**
```python
# Source: fastapi.tiangolo.com/advanced/events/
# backend/main.py
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from backend.services import granite_service

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — validate IBM credentials before accepting requests
    try:
        response = await granite_service.generate_text(
            prompt="Say hello.",
            call_name="startup_probe",
            max_tokens=5,
        )
        logger.info(f"IBM Granite verified in {response.latency_ms:.0f}ms")
    except granite_service.GraniteError as exc:
        logger.error(f"IBM Granite startup validation failed: {exc}")
        sys.exit(1)
    yield
    # Shutdown — nothing to clean up for SDK

app = FastAPI(lifespan=lifespan)
```

### Pattern 4: Parallel Execution via asyncio.gather

**What:** Two `generate_text` calls run simultaneously because each executes in a separate thread (via executor), while `asyncio.gather` schedules them concurrently on the event loop.

**When to use:** Phase 2 forge pipeline — Calls 3A (crafted) and 3B (raw) per CLAUDE.md rule #3.

**Example (for Phase 2 planner reference):**
```python
# Source: asyncio stdlib docs
crafted_result, raw_result = await asyncio.gather(
    granite_service.generate_text(crafted_prompt, "execute_crafted", max_tokens=settings.max_tokens_execute),
    granite_service.generate_text(raw_input, "execute_raw", max_tokens=settings.max_tokens_execute),
)
# Total wall time ≈ 1 call, not 2 — proven by tests
```

### Anti-Patterns to Avoid

- **Calling model.generate_text() directly in async context without executor:** Blocks the event loop; all other requests stall for 2–10 seconds per Granite call.
- **Creating a new ModelInference per request:** Re-authenticates each time (slow IAM token fetch); ignores connection pooling; wastes memory.
- **Using os.getenv() directly in granite_service.py:** Violates CLAUDE.md architecture rule. Use `settings.watsonx_api_key` from `config.py` only.
- **Hardcoding model_id or project_id in service code:** Violates CLAUDE.md rule #6 (all secrets from config.py settings).
- **Installing ibm-watson-machine-learning instead of ibm-watsonx-ai:** Wrong package — causes immediate `ImportError` on import. The correct package is `ibm-watsonx-ai`.
- **Calling `asyncio.get_event_loop()` from outside an async context:** Use `asyncio.get_running_loop()` inside async functions (Python 3.10+ preferred pattern), or `asyncio.get_event_loop()` if the loop is guaranteed running.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IAM token refresh | Custom OAuth token refresh logic | `ibm-watsonx-ai` Credentials class | SDK refreshes automatically; IAM tokens expire hourly; hand-rolled code will fail after 60 minutes mid-demo |
| Async HTTP to IBM | httpx/aiohttp calls to watsonx REST API | `ibm-watsonx-ai` ModelInference | REST API requires IAM token, exact URL construction, version parameter, content-type headers — SDK handles all |
| Retry logic | Custom exponential backoff | Nothing (no retry per CONTEXT.md) | Hackathon scope; retry adds 200+ lines of state machine complexity |
| Executor thread pool management | Custom ThreadPoolExecutor | `run_in_executor(None, ...)` | Default executor is OS-managed, properly sized, shared with FastAPI internals |
| Parameter validation | Custom max_tokens range checks | Pydantic in GraniteResponse + SDK | SDK raises on invalid params; Pydantic catches malformed responses |

**Key insight:** The IBM SDK abstracts 6+ layers of IAM complexity. Any attempt to replace it with raw HTTP will introduce auth bugs that only appear after 60 minutes of demo runtime.

---

## Common Pitfalls

### Pitfall 1: Wrong Package Name
**What goes wrong:** `pip install ibm-watson-machine-learning` installs an older/different package. `from ibm_watsonx_ai import ...` throws `ModuleNotFoundError`.
**Why it happens:** IBM has had multiple Python packages across generations (generative-ai, watson-machine-learning, watsonx-ai). The names look similar.
**How to avoid:** The correct command is `pip install ibm-watsonx-ai`. Verify with `pip show ibm-watsonx-ai`.
**Warning signs:** `ImportError: No module named 'ibm_watsonx_ai'` despite having installed something.

### Pitfall 2: Blocking the Event Loop
**What goes wrong:** Calling `model.generate_text(...)` directly inside `async def` without executor. The event loop stalls during the 2–8 second IBM API call. `asyncio.gather()` runs calls sequentially instead of parallel.
**Why it happens:** IBM SDK is synchronous. `async def` does not make synchronous calls non-blocking.
**How to avoid:** Always use `loop.run_in_executor(None, lambda: model.generate_text(...))`. Test parallelism with wall-clock timing assertions.
**Warning signs:** Two calls in `asyncio.gather()` take 2x the time of one call.

### Pitfall 3: asyncio.TimeoutError Not Caught
**What goes wrong:** `asyncio.wait_for` raises `asyncio.TimeoutError` which is NOT a subclass of the IBM SDK's exception types. If only SDK exceptions are caught, timeout propagates as unhandled.
**Why it happens:** `asyncio.TimeoutError` is separate from `concurrent.futures.TimeoutError` and SDK exceptions.
**How to avoid:** Catch `asyncio.TimeoutError` separately before the general `Exception` catch, then re-raise as `GraniteError`.
**Warning signs:** Unhandled `asyncio.TimeoutError` traceback during 30s probe calls in poor connectivity.

### Pitfall 4: sys.exit(1) in Lifespan Produces Traceback
**What goes wrong:** `sys.exit(1)` raises `SystemExit` which uvicorn logs as a traceback before exiting. The message is technically correct but visually noisy.
**Why it happens:** `sys.exit()` is implemented as `raise SystemExit(code)`.
**How to avoid:** This is acceptable per CONTEXT.md decision. For cleaner output, an alternative is `raise RuntimeError("IBM credentials invalid: ...")` which uvicorn logs as "Application startup failed. Exiting." without a traceback. Either satisfies INFRA-05 — use `sys.exit(1)` per the locked decision.
**Warning signs:** Unexpected exit during demo (means credentials actually failed — not a code bug).

### Pitfall 5: ModelInference validate=True on Startup
**What goes wrong:** `ModelInference(validate=True)` (the default) makes a model-validation API call at construction time. This adds a second API call on top of the probe call, doubling startup time.
**Why it happens:** `validate=True` is the default; it hits IBM's model catalog to confirm the model ID exists.
**How to avoid:** Set `validate=False` — the probe call already confirms connectivity. If the model ID is wrong, the probe call will fail with a clear error.
**Warning signs:** Startup takes 5+ seconds even before the probe call completes.

### Pitfall 6: config.py settings Loaded Too Early
**What goes wrong:** `from backend.config import settings` at module level fails in test environments where `.env` file is missing (Pydantic ValidationError on import).
**Why it happens:** `Settings()` is eager — it reads env vars immediately at import time.
**How to avoid:** In tests, patch environment variables before importing the service, or use `monkeypatch` with pytest. Add test fixtures that set `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL` before importing.
**Warning signs:** `pydantic_core.ValidationError` when running `pytest` without a `.env` file.

---

## Code Examples

Verified patterns from official sources:

### Full SDK Initialization
```python
# Source: ibm.github.io/watsonx-ai-python-sdk/v1.5.2/fm_model_inference.html
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

credentials = Credentials(
    url="https://us-south.ml.cloud.ibm.com",  # from settings.watsonx_url
    api_key="<api-key>",                        # from settings.watsonx_api_key
)
model = ModelInference(
    model_id="ibm/granite-13b-instruct-v2",    # from settings.watsonx_model_id
    credentials=credentials,
    project_id="<project-id>",                  # from settings.watsonx_project_id
    validate=False,                             # avoid double-startup API call
)
```

### generate_text with Parameters
```python
# Source: ibm.github.io/watsonx-ai-python-sdk/v1.4.11/fm_model.html
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

params = {
    GenParams.MAX_NEW_TOKENS: 200,
    GenParams.TEMPERATURE: 0.7,
}
text: str = model.generate_text(prompt="Your prompt here", params=params)
```

### GenTextParamsMetaNames Available Constants
```python
# Source: ibm.github.io/watsonx-ai-python-sdk/v1.4.11/fm_model.html
GenParams.DECODING_METHOD    # 'greedy' or 'sample'
GenParams.TEMPERATURE        # float 0.0–2.0
GenParams.TOP_P              # float 0.0–1.0
GenParams.TOP_K              # int 1–100
GenParams.MAX_NEW_TOKENS     # int (stop criterion)
GenParams.MIN_NEW_TOKENS     # int
GenParams.RANDOM_SEED        # int for reproducibility
GenParams.REPETITION_PENALTY # float 1.0–2.0
GenParams.STOP_SEQUENCES     # list of strings (up to 6)
GenParams.TIME_LIMIT         # int milliseconds
GenParams.TRUNCATE_INPUT_TOKENS  # int
```

### Timing a Synchronous Call (for latency_ms)
```python
# Source: Python stdlib docs
import time

start = time.perf_counter()
result = some_blocking_call()
elapsed_ms = (time.perf_counter() - start) * 1000
```

### Pytest Fixture for Mocking the SDK
```python
# Source: pytest docs + Starlette test patterns
import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture
def mock_granite_model(monkeypatch):
    """Prevents real IBM API calls during unit tests."""
    mock = MagicMock()
    mock.generate_text.return_value = "Mocked Granite response"
    monkeypatch.setattr(
        "backend.services.granite_service._model", mock
    )
    return mock

@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Provides fake credentials so config.py loads without .env file."""
    monkeypatch.setenv("WATSONX_API_KEY", "test-key")
    monkeypatch.setenv("WATSONX_PROJECT_ID", "test-project")
    monkeypatch.setenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
    monkeypatch.setenv("SUPABASE_URL", "https://fake.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "fake-anon")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "fake-service")
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ibm-watson-machine-learning` package | `ibm-watsonx-ai` package | 2023 rebranding | Wrong package = ImportError; must use new package name |
| `@app.on_event("startup")` decorator | `lifespan` context manager parameter | FastAPI ~0.93 (2023) | `on_event` is deprecated but still works; use `lifespan` for new code |
| Manual IAM token fetch + refresh | Automatic via `Credentials` class | Since initial SDK release | Do not manage tokens manually |
| `asyncio.get_event_loop()` (Python <3.10) | `asyncio.get_running_loop()` (Python 3.10+) | Python 3.10 (2021) | `get_event_loop()` may emit deprecation warning; use `get_running_loop()` inside async functions |
| `asyncio.coroutine` + `yield from` | `async def` + `await` | Python 3.5 (2015) | Irrelevant — all new code uses async/await |

**Deprecated/outdated:**
- `@app.on_event("startup")`: Deprecated since FastAPI 0.93. Works but generates deprecation warning. Use `lifespan` parameter.
- `ibm-watson-machine-learning`: Older SDK, different import paths (`from ibm_watson_machine_learning...`). Do not install.
- `ibm-generative-ai` (Tech Preview SDK): Separate experimental package. Not the production SDK.

---

## Open Questions

1. **IBM SDK thread safety for singleton ModelInference**
   - What we know: Official docs do not explicitly document thread safety. Multiple community implementations (including a production MCP server from April 2025) use a singleton pattern without issues.
   - What's unclear: Whether `generate_text` has internal shared mutable state that could race under high concurrency.
   - Recommendation: Use the singleton pattern as decided — for hackathon load (1-2 concurrent users), thread safety is not a practical concern. If issues arise, create one ModelInference per request (slower but isolated).

2. **Exact IBM SDK exception types on auth failure**
   - What we know: SDK raises Python exceptions on failure; docs do not enumerate specific types (e.g., `ApiRequestFailure`, `WMLClientError`).
   - What's unclear: Whether a missing API key raises `ValueError` (at construction) vs an HTTP error (at first call).
   - Recommendation: Catch broad `Exception` in `generate_text` and wrap in `GraniteError`. The startup probe call will surface the real exception type during development.

3. **granite-13b-instruct-v2 latency range**
   - What we know: No official latency benchmarks found for this specific model. Granite 4.0 claims "2x faster inference." Hackathon network conditions vary.
   - What's unclear: Whether 30s timeout is generous or tight for max_tokens_execute=800.
   - Recommendation: 30s is conservative and appropriate. Log latency on every call during development to establish a baseline.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (version TBD — not yet in requirements.txt) |
| Config file | none — see Wave 0 gaps |
| Quick run command | `cd backend && source venv/bin/activate && pytest tests/test_granite.py -v` |
| Full suite command | `cd backend && source venv/bin/activate && pytest -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-05 | Startup validation calls IBM and exits on bad credentials | integration (mocked) | `pytest tests/test_granite.py::test_startup_validation_fails_on_bad_credentials -x` | Wave 0 |
| INFRA-05 | `generate_text()` returns `GraniteResponse` with text and latency | unit (mocked) | `pytest tests/test_granite.py::test_generate_text_returns_granite_response -x` | Wave 0 |
| INFRA-05 | Two parallel `generate_text()` calls complete in ~1x latency, not 2x | integration (mocked with delay) | `pytest tests/test_granite.py::test_parallel_calls_are_concurrent -x` | Wave 0 |
| INFRA-05 | SDK exceptions are wrapped in `GraniteError` | unit (mocked) | `pytest tests/test_granite.py::test_sdk_exception_wrapped_as_granite_error -x` | Wave 0 |
| INFRA-05 | Timeout after 30s raises `GraniteError` | unit (mocked with sleep) | `pytest tests/test_granite.py::test_generate_text_timeout -x` | Wave 0 |
| INFRA-05 | No `os.getenv()` calls in granite_service.py | static (grep) | `grep -r "os.getenv" backend/services/granite_service.py \|\| true` | manual |

### Sampling Rate
- **Per task commit:** `cd backend && source venv/bin/activate && pytest tests/test_granite.py -v`
- **Per wave merge:** `cd backend && source venv/bin/activate && pytest -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_granite.py` — covers all INFRA-05 behaviors (file exists as empty stub)
- [ ] `backend/tests/conftest.py` — shared `mock_env_vars` and `mock_granite_model` fixtures (file exists as empty stub)
- [ ] Framework install: `pip install pytest pytest-asyncio` — not yet in requirements.txt
- [ ] `backend/requirements.txt` — currently empty; needs all dependencies listed
- [ ] `backend/main.py` — lifespan event implementation (currently empty stub)

---

## Sources

### Primary (HIGH confidence)
- `ibm.github.io/watsonx-ai-python-sdk/v1.5.2/fm_model_inference.html` — ModelInference constructor, generate_text signature, connection defaults
- `ibm.github.io/watsonx-ai-python-sdk/v1.4.11/fm_model.html` — GenTextParamsMetaNames constants (confirmed against v1.5.2 navigation)
- `pypi.org/project/ibm-watsonx-ai/` — version 1.5.3, Python 3.11 requirement, installation command
- `fastapi.tiangolo.com/advanced/events/` — lifespan context manager pattern, asynccontextmanager usage

### Secondary (MEDIUM confidence)
- `sentry.io/answers/fastapi-difference-between-run-in-executor-and-run-in-threadpool/` — run_in_executor vs run_in_threadpool comparison; recommends run_in_threadpool but run_in_executor is equivalent
- `dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-model-parameters.html` — decoding parameter ranges (temperature 0.0–2.0, top_k 1–100, max_tokens, stop_sequences)
- WebSearch result confirming IBM SDK handles IAM token refresh automatically (multiple sources agree)
- FastAPI GitHub discussions #8069, #13878 — startup exception behavior confirmed: exception in lifespan → "Application startup failed. Exiting."

### Tertiary (LOW confidence)
- Latency estimates for granite-13b-instruct-v2 — no official benchmarks found; 30s timeout is based on team decision, not verified benchmarks
- SDK thread safety for singleton pattern — not documented; inferred from community examples showing singleton usage

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via PyPI and official IBM SDK docs
- Architecture: HIGH — SDK API verified; FastAPI lifespan pattern verified; executor pattern verified
- Pitfalls: HIGH — wrong package name confirmed in STATE.md; blocking event loop is well-documented asyncio behavior; timeout exception type is stdlib fact
- Test patterns: MEDIUM — framework choices verified; specific IBM SDK exception types LOW (not documented officially)

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable SDK, 30-day window; verify ibm-watsonx-ai patch version before Phase 1 start)
