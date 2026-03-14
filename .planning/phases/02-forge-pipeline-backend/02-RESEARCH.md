# Phase 2: Forge Pipeline Backend - Research

**Researched:** 2026-03-14
**Domain:** FastAPI route/service layer, asyncio.gather pipeline, prompt template loading, Pydantic models, BackgroundTasks fire-and-forget
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | User can type a rough idea (3-1000 chars) and submit it for forging | ForgeRequest Pydantic model with Field(min_length=3, max_length=1000); FastAPI raises 422 automatically on violation |
| PIPE-02 | System auto-detects prompt category (vibe_coding, brainstorming, qa) via Granite Call 1 | detect_category.txt template + granite_service.generate_text call_name="detect_category"; response parsed to one of three enum values |
| PIPE-03 | System crafts an expert one-shot prompt (200-400 words) using category-specific template via Granite Call 2 | craft_{category}.txt loaded from backend/prompts/; formatted with user input; generate_text call_name="craft_prompt" with max_tokens=settings.max_tokens_craft |
| PIPE-04 | System executes crafted prompt AND raw input simultaneously via asyncio.gather (Calls 3A + 3B) | asyncio.gather(generate_text(crafted, "execute_crafted"), generate_text(raw_input, "execute_raw")) — already proven parallel by Phase 1 tests |
| PIPE-07 | System logs forge events to Supabase asynchronously (fire-and-forget, never fails the request) | FastAPI BackgroundTasks — add_task(log_forge_event, ...) runs after response is sent; supabase-py client for DB insert; try/except swallows all errors |
</phase_requirements>

---

## Summary

Phase 2 builds `POST /api/forge` — the core demo path. It wires together four components that are already partially scaffolded: `granite_service.py` (Phase 1, complete), `forge_service.py` (empty stub), `routers/forge.py` (empty stub), and the prompt templates in `backend/prompts/` (empty stubs). The output is a curl-testable endpoint returning a fully-populated `ForgeResponse` JSON.

The pipeline executes exactly four Granite calls in a fixed order: (1) detect category, (2) craft expert prompt, (3A+3B) execute crafted and raw simultaneously via `asyncio.gather`, followed by a fire-and-forget Supabase log. The architectural constraint that matters most for planning is call ordering — calls 3A and 3B are the only parallel pair; calls 1 and 2 are strictly sequential because each depends on the output of the previous.

The biggest design decisions for this phase are the prompt templates themselves (content quality determines before/after drama) and the response parsing for category detection (Granite-13b is not a JSON model — extracting a structured category from natural-language output requires a deterministic parsing strategy). All other implementation details (Pydantic models, router wiring, BackgroundTasks) are standard FastAPI patterns with well-understood mechanics.

**Primary recommendation:** Implement `forge_service.py` as a single async `forge()` function that executes the 4-call pipeline, and keep `routers/forge.py` thin (validation + BackgroundTasks injection only). Write prompt templates first — the templates drive everything else.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastapi | current in venv | Router, dependency injection, BackgroundTasks, 422 auto-validation | Project-locked; already installed |
| pydantic v2 | bundled with FastAPI | ForgeRequest / ForgeResponse models with field validation | Project-locked; pydantic-first codebase pattern |
| asyncio (stdlib) | Python 3.11 | asyncio.gather for parallel calls 3A+3B | Proven parallel in Phase 1 tests |
| backend.services.granite_service | Phase 1 | All four Granite calls go through generate_text() | Architecture rule #1 in CLAUDE.md |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pathlib (stdlib) | Python 3.11 | Load prompt templates from backend/prompts/*.txt | Cleaner than os.path; resolves relative paths from service file location |
| supabase-py | already in requirements.txt | fire-and-forget forge_events insert | Phase 3 owns Supabase setup; Phase 2 needs a stub that doesn't crash when Supabase unavailable |
| httpx | current in venv | FastAPI TestClient (async test support) | Already in requirements.txt from Phase 1 |
| pytest-asyncio | current in venv | Test async forge() function | Already installed from Phase 1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FastAPI BackgroundTasks | asyncio.create_task | BackgroundTasks is FastAPI-native, tied to response lifecycle, runs after response sent — correct for fire-and-forget. asyncio.create_task is fine too but requires explicit event loop awareness |
| pathlib.Path(__file__).parent / "prompts" | pkg_resources or importlib.resources | pathlib is simpler, zero dependencies, works correctly when running from backend/ directory |
| Deterministic string parsing for category | LLM JSON output | Granite-13b does not reliably emit valid JSON. Keyword matching on the text response is more robust for hackathon use. |

**Installation:**

No new dependencies needed — all required libraries are already in requirements.txt from Phase 1.

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 adds)
```
backend/
├── config.py                     # Already complete
├── main.py                       # Add: include forge router
├── models/
│   └── forge.py                  # Add: ForgeRequest, ForgeResponse, CallTiming
├── prompts/
│   ├── detect_category.txt       # WRITE: category detection prompt template
│   ├── craft_vibe_coding.txt     # WRITE: crafting template for vibe_coding
│   ├── craft_brainstorming.txt   # WRITE: crafting template for brainstorming
│   └── craft_qa.txt              # WRITE: crafting template for qa
├── services/
│   ├── granite_service.py        # Already complete (Phase 1)
│   └── forge_service.py          # WRITE: forge() pipeline function
├── routers/
│   ├── health.py                 # Already complete (Phase 1)
│   └── forge.py                  # WRITE: POST /api/forge route
└── tests/
    ├── conftest.py               # Already complete (Phase 1) — extend if needed
    └── test_forge.py             # WRITE: all PIPE-01..PIPE-04, PIPE-07 tests
```

### Pattern 1: Pydantic Request/Response Models
**What:** ForgeRequest validates input at the boundary; ForgeResponse carries all pipeline outputs. FastAPI generates 422 automatically when ForgeRequest validation fails.
**When to use:** Every route. This is the project's pydantic-first pattern.
**Example:**
```python
# backend/models/forge.py
from pydantic import BaseModel, Field
from typing import Optional

class ForgeRequest(BaseModel):
    input: str = Field(..., min_length=3, max_length=1000)

class CallTiming(BaseModel):
    call_name: str
    latency_ms: float

class ForgeResponse(BaseModel):
    category: str                  # "vibe_coding" | "brainstorming" | "qa"
    crafted_prompt: str
    crafted_result: str
    raw_result: str
    call_timings: list[CallTiming]
    total_latency_ms: float
```

Note: `anatomy_segments` is intentionally excluded from Phase 2 — that belongs to Phase 6 (PIPE-06). Do not implement anatomy parsing here.

### Pattern 2: forge_service.py — Sequential + Parallel Pipeline
**What:** A single async `forge()` function that runs the 4-call pipeline in order. Only calls 3A and 3B are parallel via asyncio.gather.
**When to use:** Called by the router. Never call granite_service directly from routers.
**Example:**
```python
# backend/services/forge_service.py
import asyncio
import time
from pathlib import Path
from backend.services.granite_service import generate_text, GraniteError, GraniteResponse
from backend.models.forge import ForgeRequest, ForgeResponse, CallTiming
from backend.config import settings

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

def _load_template(name: str) -> str:
    return (_PROMPTS_DIR / name).read_text(encoding="utf-8")

def _detect_category_from_text(text: str) -> str:
    """Parse Granite response to one of three categories."""
    text_lower = text.lower()
    if "vibe_coding" in text_lower or "vibe coding" in text_lower or "coding" in text_lower:
        return "vibe_coding"
    if "brainstorm" in text_lower:
        return "brainstorming"
    if "qa" in text_lower or "question" in text_lower or "quality" in text_lower:
        return "qa"
    return "brainstorming"  # safe default

async def forge(request: ForgeRequest) -> ForgeResponse:
    t_total = time.perf_counter()
    timings: list[CallTiming] = []

    # Call 1: detect category
    detect_template = _load_template("detect_category.txt")
    detect_prompt = detect_template.format(input=request.input)
    r1: GraniteResponse = await generate_text(
        detect_prompt, call_name="detect_category", max_tokens=20
    )
    timings.append(CallTiming(call_name="detect_category", latency_ms=r1.latency_ms))
    category = _detect_category_from_text(r1.text)

    # Call 2: craft expert prompt
    craft_template = _load_template(f"craft_{category}.txt")
    craft_prompt = craft_template.format(input=request.input)
    r2: GraniteResponse = await generate_text(
        craft_prompt, call_name="craft_prompt", max_tokens=settings.max_tokens_craft
    )
    timings.append(CallTiming(call_name="craft_prompt", latency_ms=r2.latency_ms))
    crafted_prompt = r2.text.strip()

    # Calls 3A + 3B: execute simultaneously
    r3a, r3b = await asyncio.gather(
        generate_text(crafted_prompt, "execute_crafted", max_tokens=settings.max_tokens_execute),
        generate_text(request.input, "execute_raw", max_tokens=settings.max_tokens_execute),
    )
    timings.append(CallTiming(call_name="execute_crafted", latency_ms=r3a.latency_ms))
    timings.append(CallTiming(call_name="execute_raw", latency_ms=r3b.latency_ms))

    total_ms = round((time.perf_counter() - t_total) * 1000, 1)

    return ForgeResponse(
        category=category,
        crafted_prompt=crafted_prompt,
        crafted_result=r3a.text.strip(),
        raw_result=r3b.text.strip(),
        call_timings=timings,
        total_latency_ms=total_ms,
    )
```

### Pattern 3: Router with BackgroundTasks (fire-and-forget)
**What:** The router receives the request, calls forge_service.forge(), adds Supabase logging as a BackgroundTask (runs after response is sent), then returns the response immediately. The background task never fails the request — all exceptions are swallowed.
**When to use:** POST /api/forge. This is the correct FastAPI pattern for PIPE-07.
**Example:**
```python
# backend/routers/forge.py
from fastapi import APIRouter, BackgroundTasks, HTTPException
from backend.models.forge import ForgeRequest, ForgeResponse
from backend.services import forge_service
from backend.services.granite_service import GraniteError
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

async def _log_forge_event(request_input: str, response: ForgeResponse) -> None:
    """Fire-and-forget: log to Supabase. NEVER raises — swallows all errors."""
    try:
        # Phase 3 will implement the real Supabase call.
        # For Phase 2, this is a no-op stub that satisfies PIPE-07 semantics.
        logger.info(
            "forge_event: category=%s total_ms=%.0f",
            response.category,
            response.total_latency_ms,
        )
    except Exception as exc:
        logger.warning("forge_event log failed (non-fatal): %s", exc)

@router.post("/api/forge", response_model=ForgeResponse)
async def forge(request: ForgeRequest, background_tasks: BackgroundTasks) -> ForgeResponse:
    try:
        result = await forge_service.forge(request)
    except GraniteError as exc:
        logger.error("Forge pipeline failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Granite error: {exc}")

    background_tasks.add_task(_log_forge_event, request.input, result)
    return result
```

### Pattern 4: Prompt Template Design for Reliable Category Detection
**What:** detect_category.txt must instruct Granite to output ONLY one of the three category tokens. The shorter and more constrained the instruction, the more reliable the output parsing.
**When to use:** Always. Granite-13b is an instruct model, not a JSON model.

Template strategy for `detect_category.txt`:
```
Classify the following user input into exactly one category.
Categories: vibe_coding, brainstorming, qa
Output only the category name, nothing else.

Input: {input}
Category:
```

Template strategy for `craft_{category}.txt` (example for vibe_coding):
```
You are an expert prompt engineer specializing in coding tasks.
Transform the rough idea below into an expert one-shot prompt (200-400 words).
The prompt must include: a clear role definition, specific task constraints,
expected output format, and quality criteria.

Rough idea: {input}

Expert prompt:
```

### Anti-Patterns to Avoid

- **Calling granite_service directly from forge.py router:** Violates CLAUDE.md architecture rule #1. Router must go through forge_service only.
- **Running calls 3A and 3B sequentially instead of asyncio.gather:** Doubles wall time from ~5s to ~10s. The CLAUDE.md rule #3 is explicit: "MUST run via asyncio.gather()".
- **Parsing Granite category output as JSON:** Granite-13b does not reliably output valid JSON for simple classification. Keyword matching on the text response is more robust.
- **Hardcoding prompt templates as Python strings:** Violates CLAUDE.md rule #5. Templates MUST be in `backend/prompts/*.txt` files.
- **Raising exceptions from the BackgroundTask log function:** PIPE-07 requires fire-and-forget — any exception in `_log_forge_event` must be caught and logged, never propagated.
- **Blocking the router on Supabase:** Supabase insert must be `background_tasks.add_task(...)`, not `await supabase.insert(...)` in the route handler.
- **Using os.getenv() directly in forge_service.py:** Violates CLAUDE.md rule #7. Use `from backend.config import settings`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request validation (3-1000 chars) | Custom length checks | Pydantic Field(min_length=3, max_length=1000) | FastAPI auto-raises 422 with descriptive error; zero boilerplate |
| Background task execution | asyncio.create_task + manual exception handling | FastAPI BackgroundTasks | Tied to response lifecycle; framework manages task execution; already integrated |
| Async template loading | Custom file cache / async file I/O | pathlib.Path.read_text() (sync, tiny files) | Template files are <2KB; sync read in async context is negligible; no caching needed for hackathon |
| HTTP error responses | Custom JSON error formatting | FastAPI HTTPException(status_code=502, detail=...) | Framework formats error consistently; clients (frontend) can rely on shape |
| Parallel execution | Manual thread management | asyncio.gather() on top of the Phase 1 run_in_executor pattern | Already proven parallel in Phase 1 test_parallel_calls_are_concurrent |

**Key insight:** FastAPI's BackgroundTasks is the correct fire-and-forget primitive — it runs after the response is sent, is framework-managed, and requires zero asyncio machinery from the service layer.

---

## Common Pitfalls

### Pitfall 1: Category Detection Returns Unexpected Text
**What goes wrong:** Granite returns "The category is: brainstorming" or "brainstorming." (with period) instead of the bare token. String equality check `text == "brainstorming"` fails; default category is applied.
**Why it happens:** Instruct models add explanatory text even when told not to. Granite-13b is more verbose than GPT-4.
**How to avoid:** Use `in` substring matching and `.lower()` normalization rather than equality. Test all three categories with real Granite output during development.
**Warning signs:** All inputs detected as the default ("brainstorming") regardless of content.

### Pitfall 2: Template File Not Found
**What goes wrong:** `_load_template(f"craft_{category}.txt")` raises FileNotFoundError at runtime. Server returns 500.
**Why it happens:** `Path(__file__).parent.parent / "prompts"` resolves correctly only when running with the backend package structure. If run from a different working directory, resolution may differ.
**How to avoid:** Resolve template path relative to `__file__` (the service module), not the working directory. Verify with a unit test that loads each of the four templates.
**Warning signs:** FileNotFoundError traceback mentioning prompts/ directory.

### Pitfall 3: asyncio.gather Exception Propagation
**What goes wrong:** If call 3A (execute_crafted) raises GraniteError, asyncio.gather re-raises it and call 3B result is lost. The route returns 502 even though the raw result succeeded.
**Why it happens:** asyncio.gather default behavior: raises the first exception, cancels remaining tasks (Python 3.11 behavior).
**How to avoid:** For hackathon, the current behavior is acceptable — if any Granite call fails, the pipeline fails cleanly. If resilience is needed later, use `asyncio.gather(..., return_exceptions=True)`. Document this as known behavior.
**Warning signs:** "execute_raw" call consistently succeeds but user sees 502 because "execute_crafted" failed.

### Pitfall 4: Supabase Import Crashes forge_service at Startup
**What goes wrong:** Importing supabase-py at module level in forge_service.py or the log function causes an ImportError or ConnectionError if the Supabase client isn't configured yet (Phase 3 is not complete).
**Why it happens:** supabase-py may attempt to initialize a connection on import or client creation.
**How to avoid:** For Phase 2, make the `_log_forge_event` function a stub that only logs (no actual Supabase call). The Supabase insert is wired in Phase 3. This keeps Phase 2 self-contained.
**Warning signs:** Server startup failure due to supabase import errors.

### Pitfall 5: Missing max_tokens_execute from config.py
**What goes wrong:** Execution calls (3A, 3B) use `settings.max_tokens_craft` (500) instead of `settings.max_tokens_execute` (800). Results are truncated.
**Why it happens:** config.py defines both; forge_service must use the correct one per call type.
**How to avoid:** Calls 1 and 2 use `max_tokens_craft`; calls 3A and 3B use `max_tokens_execute`. Verify by checking `settings.max_tokens_execute = 800` is used in the generate_text calls.
**Warning signs:** Crafted prompt results appear cut off mid-sentence.

### Pitfall 6: Router Not Registered in main.py
**What goes wrong:** POST /api/forge returns 404 even though forge.py router is implemented correctly. Server starts without error.
**Why it happens:** `app.include_router(forge.router)` line is missing from main.py.
**How to avoid:** Add `from backend.routers import forge` and `app.include_router(forge.router)` to main.py as part of the router implementation task.
**Warning signs:** curl returns {"detail":"Not Found"} with status 404.

---

## Code Examples

Verified patterns from official sources:

### ForgeRequest with automatic 422 validation
```python
# Source: FastAPI docs — https://fastapi.tiangolo.com/tutorial/body/
from pydantic import BaseModel, Field

class ForgeRequest(BaseModel):
    input: str = Field(..., min_length=3, max_length=1000)
# FastAPI raises HTTP 422 automatically — no manual check needed
```

### asyncio.gather for parallel Granite calls
```python
# Source: Phase 1 research + Python asyncio docs
# Proven parallel by test_parallel_calls_are_concurrent in tests/test_granite.py
crafted_result, raw_result = await asyncio.gather(
    generate_text(crafted_prompt, "execute_crafted", max_tokens=settings.max_tokens_execute),
    generate_text(request.input, "execute_raw", max_tokens=settings.max_tokens_execute),
)
# Wall time ≈ single call time (not additive)
```

### FastAPI BackgroundTasks pattern
```python
# Source: FastAPI docs — https://fastapi.tiangolo.com/tutorial/background-tasks/
from fastapi import BackgroundTasks

@router.post("/api/forge")
async def forge(request: ForgeRequest, background_tasks: BackgroundTasks):
    result = await forge_service.forge(request)
    background_tasks.add_task(log_event, request.input, result)
    return result  # Response sent before log_event runs
```

### Template loading with pathlib (relative to module)
```python
# Source: Python stdlib pathlib docs
from pathlib import Path

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

def _load_template(name: str) -> str:
    return (_PROMPTS_DIR / name).read_text(encoding="utf-8")

# Usage:
template = _load_template("craft_vibe_coding.txt")
prompt = template.format(input=user_input)
```

### Mocking forge_service in router tests
```python
# Source: FastAPI TestClient + pytest patterns
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from backend.main import app
from backend.models.forge import ForgeResponse, CallTiming

client = TestClient(app)

def test_post_forge_returns_forge_response():
    mock_response = ForgeResponse(
        category="brainstorming",
        crafted_prompt="Expert prompt...",
        crafted_result="Crafted output...",
        raw_result="Raw output...",
        call_timings=[
            CallTiming(call_name="detect_category", latency_ms=500.0),
            CallTiming(call_name="craft_prompt", latency_ms=600.0),
            CallTiming(call_name="execute_crafted", latency_ms=700.0),
            CallTiming(call_name="execute_raw", latency_ms=700.0),
        ],
        total_latency_ms=1900.0,
    )
    with patch("backend.services.forge_service.generate_text", new_callable=AsyncMock) as mock_gt:
        # Call 1: detect
        # Call 2: craft
        # Calls 3A+3B: execute (gather returns two results)
        mock_gt.side_effect = [
            GraniteResponse(text="brainstorming", latency_ms=500.0),
            GraniteResponse(text="Expert crafted prompt text", latency_ms=600.0),
            GraniteResponse(text="Crafted output", latency_ms=700.0),
            GraniteResponse(text="Raw output", latency_ms=700.0),
        ]
        response = client.post("/api/forge", json={"input": "Help me brainstorm startup ideas"})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "brainstorming"
    assert "crafted_prompt" in data
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@app.on_event("startup")` | `lifespan` context manager | FastAPI 0.93 (2023) | Already using lifespan from Phase 1 |
| Sequential Granite calls | asyncio.gather for parallel pairs | From Phase 1 design | 2x speedup for calls 3A+3B — critical for demo latency |
| Pydantic v1 `class Config` | Pydantic v2 `model_config = ConfigDict(...)` | Pydantic v2 (2023) | config.py already uses ConfigDict with extra="ignore" |
| Background tasks with raw asyncio | FastAPI BackgroundTasks | FastAPI 0.x | Framework-managed, no manual event loop needed |

**Deprecated/outdated:**
- `@app.on_event("startup"/"shutdown")`: Still works but generates DeprecationWarning. Phase 1 already uses lifespan correctly — do not revert.
- Pydantic v1 validators (`@validator`): Use `@field_validator` in v2. Not needed for Phase 2 models but worth knowing.

---

## Open Questions

1. **Granite-13b category detection reliability**
   - What we know: Granite-13b-instruct-v2 is an instruction-following model. Category detection with constrained output instructions should work but has not been tested with real API calls yet.
   - What's unclear: Whether "Output only the category name" is respected, or whether Granite adds surrounding text. This determines how robust the parsing must be.
   - Recommendation: Write the parser defensively (substring matching, .lower(), safe default). Validate all three categories with real Granite calls during task execution.

2. **Crafted prompt word count enforcement (200-400 words)**
   - What we know: Setting max_tokens_craft=500 (in config.py) gives an upper bound. The prompt template must ask for 200-400 words explicitly. Granite may still produce shorter output.
   - What's unclear: Whether Granite-13b respects word count instructions reliably enough to pass the PIPE-03 success criterion.
   - Recommendation: Add explicit word count instruction in the craft templates. Validate actual output length during real API testing. If Granite falls short, the template can be revised without changing service code.

3. **Supabase stub vs real client for Phase 2**
   - What we know: PIPE-07 requires fire-and-forget logging. Phase 3 owns the Supabase schema. Phase 2 needs PIPE-07 to be satisfied.
   - What's unclear: Whether a log-only stub in `_log_forge_event` satisfies the PIPE-07 success criterion or whether actual Supabase connectivity is required.
   - Recommendation: Implement `_log_forge_event` as a no-op stub that logs to the Python logger for Phase 2. The BackgroundTasks wiring (the fire-and-forget mechanism) is what Phase 2 tests. Phase 3 replaces the log call with a real Supabase insert. Document this explicitly in the plan.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (already installed from Phase 1) |
| Config file | none — uses conftest.py for fixtures |
| Quick run command | `cd backend && source venv/bin/activate && pytest tests/test_forge.py -v` |
| Full suite command | `cd backend && source venv/bin/activate && pytest -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Input < 3 chars returns 422 | unit | `pytest tests/test_forge.py::test_forge_rejects_short_input -x` | Wave 0 |
| PIPE-01 | Input > 1000 chars returns 422 | unit | `pytest tests/test_forge.py::test_forge_rejects_long_input -x` | Wave 0 |
| PIPE-01 | Valid input (3-1000 chars) accepted | unit | `pytest tests/test_forge.py::test_forge_accepts_valid_input -x` | Wave 0 |
| PIPE-02 | "vibe_coding" input detected as vibe_coding | unit (mocked) | `pytest tests/test_forge.py::test_category_detection_vibe_coding -x` | Wave 0 |
| PIPE-02 | "brainstorming" input detected as brainstorming | unit (mocked) | `pytest tests/test_forge.py::test_category_detection_brainstorming -x` | Wave 0 |
| PIPE-02 | "qa" input detected as qa | unit (mocked) | `pytest tests/test_forge.py::test_category_detection_qa -x` | Wave 0 |
| PIPE-03 | ForgeResponse.crafted_prompt is non-empty string | unit (mocked) | `pytest tests/test_forge.py::test_crafted_prompt_populated -x` | Wave 0 |
| PIPE-04 | Both execute_crafted and execute_raw in call_timings | unit (mocked) | `pytest tests/test_forge.py::test_parallel_calls_both_present -x` | Wave 0 |
| PIPE-04 | Calls 3A+3B complete in parallel (wall time < 1 call) | integration (mocked delay) | `pytest tests/test_forge.py::test_execute_calls_are_parallel -x` | Wave 0 |
| PIPE-07 | forge_event log does not block HTTP response | unit (BackgroundTasks) | `pytest tests/test_forge.py::test_log_event_is_background -x` | Wave 0 |
| PIPE-07 | Supabase log failure does not fail the request | unit (stub raises) | `pytest tests/test_forge.py::test_log_event_failure_is_swallowed -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && source venv/bin/activate && pytest tests/test_forge.py -v`
- **Per wave merge:** `cd backend && source venv/bin/activate && pytest -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`. Manual curl test required per success criterion 1.

### Wave 0 Gaps
- [ ] `backend/tests/test_forge.py` — covers all PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-07 behaviors (file exists as empty 1-line stub)
- [ ] `backend/prompts/detect_category.txt` — prompt template (file exists as empty stub)
- [ ] `backend/prompts/craft_vibe_coding.txt` — prompt template (file exists as empty stub)
- [ ] `backend/prompts/craft_brainstorming.txt` — prompt template (file exists as empty stub)
- [ ] `backend/prompts/craft_qa.txt` — prompt template (file exists as empty stub)
- [ ] `backend/models/forge.py` — add ForgeRequest, ForgeResponse, CallTiming models (currently only has GraniteResponse)
- [ ] `backend/services/forge_service.py` — main pipeline implementation (empty stub)
- [ ] `backend/routers/forge.py` — POST /api/forge route (empty stub)
- [ ] `backend/main.py` — add `app.include_router(forge.router)` (currently only includes health router)

---

## Sources

### Primary (HIGH confidence)
- FastAPI BackgroundTasks docs — https://fastapi.tiangolo.com/tutorial/background-tasks/ — fire-and-forget pattern, add_task signature
- FastAPI request body / Pydantic validation — https://fastapi.tiangolo.com/tutorial/body/ — ForgeRequest Field constraints, automatic 422 behavior
- Phase 1 RESEARCH.md — asyncio.gather parallel pattern, run_in_executor, GraniteResponse model — already verified and proven in test_parallel_calls_are_concurrent
- Phase 1 granite_service.py (implemented) — generate_text signature, GraniteError, GraniteResponse — source of truth for service interface
- CLAUDE.md architecture rules — pipeline order, 4-call constraint, asyncio.gather requirement, template file location

### Secondary (MEDIUM confidence)
- Python asyncio.gather docs — return_exceptions behavior, exception propagation semantics
- pathlib.Path resolution pattern — relative-to-__file__ for template loading (standard Python practice)
- Pydantic v2 Field docs — min_length/max_length for string validation

### Tertiary (LOW confidence)
- Granite-13b-instruct-v2 category detection reliability — untested with real API; defensive parsing recommended
- Crafted prompt word count adherence — depends on template quality and Granite behavior; validate during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed from Phase 1; no new dependencies needed
- Architecture (pipeline order, asyncio.gather, BackgroundTasks): HIGH — patterns verified against FastAPI docs and Phase 1 implementation
- Prompt template content: MEDIUM — templates must be written and tested with real Granite responses; content quality is unknown until live testing
- Category detection parsing: MEDIUM — defensive strategy is sound; exact Granite output format unknown until tested
- Pitfalls: HIGH — derived from Phase 1 decisions, FastAPI docs, and known asyncio behaviors

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable libraries; prompt template quality may require iteration during Phase 2 execution)
