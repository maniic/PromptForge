# Phase 3: Supabase + Community Library - Research

**Researched:** 2026-03-14
**Domain:** supabase-py v2 (sync client), FastAPI integration, PostgreSQL schema via Supabase Dashboard/SQL
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- `prompts` table: id (uuid, default gen_random_uuid()), title (text, required), author_name (text, required), category (text — vibe_coding/brainstorming/qa), original_input (text), crafted_prompt (text), crafted_result (text), raw_result (text), total_latency_ms (float), created_at (timestamptz, default now())
- `forge_events` table: id (uuid), input_text (text), category (text), total_latency_ms (float), created_at (timestamptz, default now()) — analytics only, not user-facing
- No upvote column yet — keep schema minimal for hackathon
- Indexes: prompts(category), prompts(created_at DESC) for browsing queries
- Explicit user action only — not auto-save
- POST /api/library accepts SavePromptRequest(title, author_name, forge_response fields) and returns the saved record
- GET /api/library returns all prompts sorted by created_at DESC; optional ?category= filter; no pagination
- Response is a list of PromptSummary objects (id, title, author_name, category, created_at) for list view
- GET /api/library/{id} returns full prompt detail
- Sync Supabase client via `supabase-py` (already in requirements.txt)
- Client singleton in `backend/db/supabase_client.py` initialized with supabase_url + supabase_service_key from config.py
- Service key (not anon key) — no RLS for hackathon
- All DB operations in `library_service.py` only
- 3 seed prompts (one per category), pre-inserted via a seed script — run manually or at startup in dev
- Replace `_log_forge_event` stub in forge_service.py with real Supabase insert — fire-and-forget, try/except, never fail the forge
- Log to forge_events: input_text, category, total_latency_ms, created_at

### Claude's Discretion

- Exact Supabase client initialization approach (sync vs async — pick what works cleanly)
- Whether seed data is a standalone script or a service function
- Test strategy details (mock Supabase client in tests)
- Error message formatting for library endpoints

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-02 | Supabase schema deployed (prompts table + forge_events table + indexes) | Schema DDL verified against supabase-py v2 capabilities; SQL migration pattern documented |
| LIB-01 | User can save a crafted prompt to the community library with title and author name | POST /api/library → insert pattern via supabase-py sync client verified; APIResponse.data[0] returns saved record |
| LIB-02 | Library is pre-loaded with seed data (at least 3 example prompts across categories) | Seed script pattern and demo-quality seed content strategy documented |
</phase_requirements>

---

## Summary

This phase wires the Supabase community library: schema creation, client singleton, library CRUD service, two new endpoints (POST /api/library, GET /api/library, GET /api/library/{id}), upgrading the `_log_forge_event` stub in forge_service.py to perform real inserts, and seeding 3 demo-quality prompts.

The critical technical choice is **sync vs async Supabase client**. `supabase-py` 2.28.2 (installed) ships both. The **sync client** (`create_client`) is the right pick for this project: it initializes synchronously (no `await` needed at module load), and the only place it runs in an async context is `_log_forge_event` (fire-and-forget), which should be wrapped in `run_in_executor` for correct asyncio behavior. Library endpoint handlers are thin wrappers that can call the sync client safely from a thread pool via `run_in_executor`, keeping the same pattern established by the IBM SDK. The async client (`acreate_client`) requires an `await` at construction time — making module-level singleton initialization awkward in FastAPI.

All query patterns (`insert`, `select`, `eq`, `order`, `execute`) are verified against the installed supabase-py 2.28.2 source. The `APIResponse.data` field returns a `List[dict]`. Mocking for tests is straightforward: replace the singleton with a `MagicMock` whose `.table().insert().execute()` chain returns a mock `APIResponse`.

**Primary recommendation:** Use sync `create_client` singleton; wrap every DB call in `asyncio.get_event_loop().run_in_executor(None, ...)` before awaiting inside async handlers and `_log_forge_event`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supabase-py | 2.28.2 (installed) | Python Supabase client | Already in requirements.txt; confirmed in venv |
| postgrest | 2.28.2 (installed) | Query builder under supabase-py | Installed automatically as supabase dep |
| FastAPI BackgroundTasks | (bundled with FastAPI) | Fire-and-forget logging | Already used in forge_service.py |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest + unittest.mock | installed | Test library endpoints with mocked Supabase client | All unit tests for library_service and router |
| asyncio.get_event_loop().run_in_executor | stdlib | Bridge sync Supabase calls into async FastAPI handlers | Every DB call inside an async function |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sync client + run_in_executor | Async client (acreate_client) | Async client requires `await` at construction time, so module-level singleton must be built in lifespan; adds complexity for small gain |
| Direct supabase-py | raw httpx to PostgREST | Direct httpx bypasses all the ORM sugar with no benefit |

**Installation:** Already installed. No additional packages needed.

---

## Architecture Patterns

### Recommended File Structure (changes to existing layout)

```
backend/
├── db/
│   ├── __init__.py
│   └── supabase_client.py    # Singleton — supabase_client() returns Client
├── models/
│   ├── forge.py              # Existing — no changes needed
│   └── library.py            # NEW — SavePromptRequest, PromptSummary, PromptDetail
├── services/
│   ├── forge_service.py      # MODIFY — replace _log_forge_event stub
│   └── library_service.py    # FILL IN — save_prompt, get_prompts, get_prompt_by_id
├── routers/
│   └── library.py            # FILL IN — POST /api/library, GET /api/library, GET /api/library/{id}
├── scripts/
│   └── seed_library.py       # NEW — inserts 3 demo seed prompts
└── main.py                   # MODIFY — register library router
```

### Pattern 1: Sync Client Singleton

**What:** Module-level singleton created once at import time.
**When to use:** Always — never instantiate the client inside service functions.
**Example:**
```python
# backend/db/supabase_client.py
# Source: supabase-py 2.28.2 create_client signature verified against installed source
from supabase import create_client, Client
from backend.config import settings

_client: Client | None = None

def supabase_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_key,
        )
    return _client
```

### Pattern 2: Sync DB Call Wrapped for Async Context

**What:** Use `run_in_executor` to run blocking supabase-py `.execute()` calls without blocking the event loop.
**When to use:** Every DB call from an `async def` function.
**Example:**
```python
# Source: asyncio.run_in_executor stdlib pattern; supabase sync .execute() verified as blocking
import asyncio
from functools import partial

async def _run_sync(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(fn, *args, **kwargs))

# Usage inside an async service function:
def _do_insert(data: dict) -> dict:
    resp = supabase_client().table("prompts").insert(data).execute()
    return resp.data[0]

saved = await _run_sync(_do_insert, row_dict)
```

### Pattern 3: Query Chain (insert, select, filter, order)

**What:** supabase-py v2 fluent builder — always ends with `.execute()`.
**When to use:** All CRUD operations.
**Example:**
```python
# Source: postgrest SyncRequestBuilder/SyncSelectRequestBuilder source verified in venv

# INSERT and return saved row
resp = client.table("prompts").insert(row_dict).execute()
saved_row = resp.data[0]  # dict; APIResponse.data is List[dict]

# SELECT all, sorted
resp = client.table("prompts").select("*").order("created_at", desc=True).execute()
rows = resp.data  # List[dict]

# SELECT filtered by category
resp = (
    client.table("prompts")
    .select("id, title, author_name, category, created_at")
    .eq("category", "vibe_coding")
    .order("created_at", desc=True)
    .execute()
)

# SELECT single row by id
resp = client.table("prompts").select("*").eq("id", prompt_id).execute()
if not resp.data:
    raise HTTPException(status_code=404, detail="Prompt not found")
row = resp.data[0]
```

### Pattern 4: Fire-and-Forget forge_events Insert

**What:** Replace the logging stub with a real insert; wrap in try/except; never raise.
**When to use:** `_log_forge_event` in forge_service.py — unchanged function signature.
**Example:**
```python
# Source: existing forge_service.py _log_forge_event pattern; Supabase insert pattern above
async def _log_forge_event(request_input: str, response: ForgeResponse) -> None:
    try:
        def _insert():
            supabase_client().table("forge_events").insert({
                "input_text": request_input,
                "category": response.category,
                "total_latency_ms": response.total_latency_ms,
            }).execute()
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _insert)
    except Exception as exc:
        logger.warning("forge_event log failed (non-fatal): %s", exc)
```

### Pattern 5: Mocking for Tests

**What:** Replace the singleton function so unit tests never hit real Supabase.
**When to use:** All tests for library_service and library router.
**Example:**
```python
# Source: established conftest.py monkeypatch pattern from Phase 2
from unittest.mock import MagicMock, patch
from postgrest import APIResponse

def _mock_response(data: list) -> APIResponse:
    m = MagicMock(spec=APIResponse)
    m.data = data
    return m

# In test:
mock_client = MagicMock()
mock_client.table.return_value.insert.return_value.execute.return_value = _mock_response([saved_row])

with patch("backend.db.supabase_client.supabase_client", return_value=mock_client):
    # call library_service function
```

### Anti-Patterns to Avoid

- **Creating a new client per request:** Never call `create_client()` inside service functions — it re-initializes auth/session on every call. Use the singleton.
- **Calling `.execute()` directly in an async handler without run_in_executor:** The sync client's `.execute()` makes a blocking httpx call. This stalls the event loop and breaks concurrent requests.
- **Catching only `Exception` at the router layer:** Let library_service raise `ValueError` or `HTTPException`; catch at router to map to 400/404/500. Never swallow errors in the router.
- **Hardcoding seed data in migration SQL:** Use a Python seed script that calls `library_service.save_prompt()` so seed data goes through the same validation path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query builder / ORM | Custom SQL string builder | supabase-py `.table().select().eq().execute()` | Already installed, handles parameterization, avoids SQL injection |
| UUID generation | Custom UUID logic in Python | `gen_random_uuid()` as PostgreSQL column default | DB-side UUIDs are globally unique, no application-layer collision risk |
| Response serialization | Manual dict construction | Pydantic model `.model_validate(row)` | Type safety, auto-validation, consistent with established forge.py patterns |

**Key insight:** The entire CRUD layer for this phase is ~20 lines of supabase-py calls. Custom query construction would add zero value.

---

## Common Pitfalls

### Pitfall 1: Blocking Event Loop with Sync Client

**What goes wrong:** Calling `supabase_client().table(...).execute()` directly inside `async def` blocks the asyncio event loop, serializing all concurrent requests.
**Why it happens:** supabase-py sync client's `.execute()` is a synchronous httpx call — verified in postgrest source (`def execute(self) -> APIResponse`).
**How to avoid:** Always wrap sync DB calls in `run_in_executor` when called from async context.
**Warning signs:** Route response times suddenly sequential under load; pytest-asyncio tests hanging.

### Pitfall 2: Missing `original_input` Field in SavePromptRequest

**What goes wrong:** `prompts` schema has `original_input` column but the ForgeResponse doesn't include the raw user input — it must be passed separately via SavePromptRequest.
**Why it happens:** ForgeResponse only contains the derived fields (crafted_prompt, crafted_result, raw_result). The original text that produced them is not stored in the response.
**How to avoid:** SavePromptRequest must include `original_input: str` as an explicit field alongside `title` and `author_name`. The frontend will pass this from the input field's value.
**Warning signs:** `original_input` column is NULL for all saved prompts.

### Pitfall 3: APIResponse.data Is a List, Not a Dict

**What goes wrong:** Accessing `resp.data` directly as a dict raises `AttributeError` or type errors.
**Why it happens:** Even for single-row inserts, supabase-py returns `APIResponse.data: List[dict]`.
**How to avoid:** Always use `resp.data[0]` for single-row results. Validate `resp.data` is non-empty before indexing.
**Warning signs:** `TypeError: list indices must be integers or slices, not str`

### Pitfall 4: total_latency_ms Column Type Mismatch

**What goes wrong:** Supabase rejects the insert if Python `float` doesn't map cleanly to the column type.
**Why it happens:** PostgreSQL `float8` (float) is the right type — but if the column is accidentally created as `int`, truncation causes silent data loss.
**How to avoid:** Create the column as `float8` (not `int`, not `numeric`) in the SQL schema.
**Warning signs:** Latency values show as integer (e.g., 1234 instead of 1234.7).

### Pitfall 5: Seed Script Run After Schema Doesn't Exist Yet

**What goes wrong:** Running `seed_library.py` before the tables are created fails with a PostgREST error.
**Why it happens:** Schema creation requires a Supabase Dashboard SQL step (or migration tool) before any Python code can insert rows.
**How to avoid:** Document the deploy order: (1) run SQL schema in Supabase Dashboard, (2) run seed script. Test script should check table existence or catch a helpful error message.
**Warning signs:** `{"code":"42P01","details":null,"hint":null,"message":"relation \"public.prompts\" does not exist"}`

### Pitfall 6: forge_events insert breaks forge pipeline

**What goes wrong:** If the Supabase insert in `_log_forge_event` raises (e.g., column constraint violation), it could propagate up and fail the forge request.
**Why it happens:** `run_in_executor` propagates exceptions from the callable into the awaiting coroutine.
**How to avoid:** The `try/except Exception` wrapper in `_log_forge_event` must be the outermost scope, catching errors from the `await run_in_executor(...)` call itself — not just from inside the inner function.

---

## Code Examples

### Full supabase_client.py Singleton
```python
# Source: create_client signature verified: supabase._sync.client.create_client(url, key) -> Client
from supabase import create_client, Client
from backend.config import settings

_client: Client | None = None

def supabase_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_key,
        )
    return _client
```

### Pydantic Models (backend/models/library.py)
```python
# Source: established forge.py Pydantic v2 pattern
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SavePromptRequest(BaseModel):
    title: str
    author_name: str
    original_input: str
    category: str
    crafted_prompt: str
    crafted_result: str
    raw_result: str
    total_latency_ms: float


class PromptSummary(BaseModel):
    id: str
    title: str
    author_name: str
    category: str
    created_at: datetime


class PromptDetail(PromptSummary):
    original_input: str
    crafted_prompt: str
    crafted_result: str
    raw_result: str
    total_latency_ms: float
```

### Schema SQL (run in Supabase Dashboard)
```sql
-- Source: CONTEXT.md locked decisions; gen_random_uuid() is standard Supabase/PostgreSQL extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS prompts (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text        NOT NULL,
    author_name  text        NOT NULL,
    category     text        NOT NULL,
    original_input  text,
    crafted_prompt  text,
    crafted_result  text,
    raw_result      text,
    total_latency_ms float8,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompts_category    ON prompts (category);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at  ON prompts (created_at DESC);

CREATE TABLE IF NOT EXISTS forge_events (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    input_text       text,
    category         text,
    total_latency_ms float8,
    created_at       timestamptz NOT NULL DEFAULT now()
);
```

### library_service.py skeleton
```python
# Source: postgrest SyncSelectRequestBuilder methods verified: eq, order, execute all present
import asyncio
from functools import partial
from typing import Optional

from backend.db.supabase_client import supabase_client
from backend.models.library import SavePromptRequest, PromptSummary, PromptDetail


async def save_prompt(req: SavePromptRequest) -> PromptDetail:
    row = req.model_dump()

    def _insert():
        return supabase_client().table("prompts").insert(row).execute()

    loop = asyncio.get_event_loop()
    resp = await loop.run_in_executor(None, _insert)
    return PromptDetail.model_validate(resp.data[0])


async def get_prompts(category: Optional[str] = None) -> list[PromptSummary]:
    def _select():
        q = (
            supabase_client()
            .table("prompts")
            .select("id, title, author_name, category, created_at")
            .order("created_at", desc=True)
        )
        if category:
            q = q.eq("category", category)
        return q.execute()

    loop = asyncio.get_event_loop()
    resp = await loop.run_in_executor(None, _select)
    return [PromptSummary.model_validate(r) for r in resp.data]


async def get_prompt_by_id(prompt_id: str) -> PromptDetail:
    def _select():
        return (
            supabase_client()
            .table("prompts")
            .select("*")
            .eq("id", prompt_id)
            .execute()
        )

    loop = asyncio.get_event_loop()
    resp = await loop.run_in_executor(None, _select)
    if not resp.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptDetail.model_validate(resp.data[0])
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabase-py` v1 (import from `supabase` used `create_client` that returned typed `SupabaseClient`) | v2: `create_client` still works; async version is `acreate_client` | supabase 2.0 release | Import paths unchanged; `APIResponse.data` is now typed `List[JSON]` |
| `resp.data` could be `None` in v1 | In v2 `resp.data` is always a `list` (may be empty) | supabase 2.x | Check `if not resp.data` instead of `if resp.data is None` |

**Deprecated/outdated:**
- `supabase[async]` extras install: In supabase-py 2.x, async support is bundled in the base package — no `[async]` extra needed. (Blocker note from STATE.md resolved: confirmed async extras not required.)

---

## Open Questions

1. **Supabase project URL and service key availability**
   - What we know: config.py has `supabase_url` and `supabase_service_key` fields; conftest.py has fake values for tests
   - What's unclear: Whether real Supabase project is already created and credentials are in .env
   - Recommendation: Wave 0 task should verify `.env` has real values and the project exists; seed script can validate connectivity

2. **`gen_random_uuid()` availability**
   - What we know: Standard in PostgreSQL 13+ and Supabase; supabase projects have pgcrypto enabled by default
   - What's unclear: Nothing — this is HIGH confidence standard Supabase behavior
   - Recommendation: Use it; add `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` to SQL for safety

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (installed in requirements.txt) |
| Config file | none — pytest auto-discovers; conftest.py at `backend/tests/conftest.py` |
| Quick run command | `cd backend && source venv/bin/activate && pytest tests/test_library.py -v` |
| Full suite command | `cd backend && source venv/bin/activate && pytest -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-02 | prompts + forge_events tables exist with correct columns | manual (Supabase Dashboard verification) | N/A — verify via Supabase UI or `psql` | N/A |
| LIB-01 | POST /api/library saves prompt, returns saved record with id | unit (mock Supabase client) | `pytest tests/test_library.py::test_post_library_saves_prompt -xvs` | Wave 0 |
| LIB-01 | POST /api/library returns 422 if title or author_name missing | unit | `pytest tests/test_library.py::test_post_library_validation -xvs` | Wave 0 |
| LIB-02 | GET /api/library returns at least 3 prompts | unit (mock returns 3 seed rows) | `pytest tests/test_library.py::test_get_library_returns_list -xvs` | Wave 0 |
| LIB-02 | GET /api/library?category=vibe_coding filters results | unit | `pytest tests/test_library.py::test_get_library_category_filter -xvs` | Wave 0 |
| LIB-01 | GET /api/library/{id} returns full PromptDetail | unit | `pytest tests/test_library.py::test_get_library_by_id -xvs` | Wave 0 |
| LIB-01 | GET /api/library/{id} returns 404 for unknown id | unit | `pytest tests/test_library.py::test_get_library_by_id_not_found -xvs` | Wave 0 |
| PIPE-07 | _log_forge_event inserts to forge_events without blocking forge | unit | `pytest tests/test_library.py::test_log_forge_event_inserts -xvs` | Wave 0 |
| PIPE-07 | _log_forge_event failure does not fail POST /api/forge | unit (existing test_forge.py::test_log_event_failure_is_swallowed) | `pytest tests/test_forge.py::test_log_event_failure_is_swallowed -xvs` | EXISTS |

### Sampling Rate

- **Per task commit:** `cd backend && source venv/bin/activate && pytest tests/test_library.py -v`
- **Per wave merge:** `cd backend && source venv/bin/activate && pytest -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/test_library.py` — covers all LIB-01, LIB-02, PIPE-07 library cases above
- [ ] No new conftest.py fixtures needed — existing `mock_env_vars` autouse fixture covers Supabase env vars

---

## Sources

### Primary (HIGH confidence)

- supabase-py 2.28.2 installed in project venv — `create_client`, `acreate_client`, `Client.table()`, `SyncRequestBuilder` methods, `APIResponse.data` all verified by direct source inspection
- postgrest 2.28.2 installed in project venv — `SyncRequestBuilder`, `SyncSelectRequestBuilder`, `SyncQueryRequestBuilder.execute()` signature verified as `def execute(self) -> APIResponse` (synchronous)
- `backend/config.py` — `supabase_url`, `supabase_service_key` fields confirmed present
- `backend/services/forge_service.py` — `_log_forge_event` stub location and signature confirmed
- `backend/tests/conftest.py` — existing mock pattern and env var setup confirmed

### Secondary (MEDIUM confidence)

- Supabase PostgreSQL defaults: `gen_random_uuid()` from pgcrypto is standard in all Supabase projects (widely documented; confirmed by supabase.com docs pattern)
- `asyncio.run_in_executor` for sync-in-async bridge — established pattern from Phase 1 IBM SDK research (STATE.md: "IBM SDK is synchronous — must wrap in run_in_executor")

### Tertiary (LOW confidence)

None — all critical claims are verified against installed source code.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — supabase-py 2.28.2 confirmed installed; all API methods verified in venv source
- Architecture: HIGH — patterns derived directly from inspecting installed library source; established project patterns reused
- Pitfalls: HIGH — pitfalls derived from actual code inspection (blocking .execute(), APIResponse.data list type, etc.)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (supabase-py version is pinned in venv; stable API)
