---
phase: 03-supabase-community-library
plan: 01
subsystem: database
tags: [supabase, pydantic, fastapi, asyncio, community-library, crud]

# Dependency graph
requires:
  - phase: 01-ibm-integration
    provides: backend foundation (FastAPI app, config, granite_service)
provides:
  - Supabase client singleton (backend/db/supabase_client.py)
  - SQL DDL for prompts and forge_events tables (backend/db/schema.sql)
  - Pydantic models: SavePromptRequest, PromptSummary, PromptDetail
  - Library CRUD service: save_prompt, get_prompts, get_prompt_by_id
  - REST endpoints: POST /api/library, GET /api/library, GET /api/library/{id}
  - Real forge_events Supabase insert in forge_service._log_forge_event
affects:
  - 04-frontend (consumes GET /api/library, POST /api/library endpoints)
  - 05-demo-polish (forge_events telemetry now persisted)

# Tech tracking
tech-stack:
  added: [supabase==2.28.2 (already installed), asyncio.run_in_executor pattern for sync->async bridge]
  patterns: [lazy singleton via module-level _client, _run_sync helper for executor wrapping, redirect_slashes=False on router, follow_redirects=True in async test clients]

key-files:
  created:
    - backend/db/schema.sql
    - backend/db/supabase_client.py
    - backend/models/library.py
    - backend/services/library_service.py
    - backend/routers/library.py
    - backend/tests/test_library.py
  modified:
    - backend/services/forge_service.py
    - backend/main.py

key-decisions:
  - "supabase_client() is a callable function (not a module-level object) so tests can monkeypatch it without resetting module globals"
  - "redirect_slashes=False on library router prevents 307 redirect loop when calling /api/library without trailing slash"
  - "httpx.AsyncClient with follow_redirects=True used in tests for router-level integration (matching pattern needed for ASGI transport)"
  - "run_in_executor wraps all synchronous supabase-py v2 calls — same pattern as IBM SDK wrapper in Phase 1"

patterns-established:
  - "Singleton pattern: module-level _client: T | None = None with callable getter for easy test mocking"
  - "TDD: RED commit first (test scaffold), GREEN commit second (implementation)"
  - "Router design: redirect_slashes=False to avoid 307 redirect issues with prefix-only URLs"

requirements-completed: [INFRA-02, LIB-01]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 3 Plan 01: Supabase Community Library Summary

**Supabase community library with CRUD service, REST endpoints (POST/GET /api/library), schema DDL, and real forge_events telemetry insert via async executor bridge**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T09:58:44Z
- **Completed:** 2026-03-14T10:03:27Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- Created `backend/db/schema.sql` with DDL for `prompts` and `forge_events` tables, ready for Supabase Dashboard deployment
- Implemented full library CRUD: `save_prompt`, `get_prompts` (with category filter), `get_prompt_by_id` (with 404 handling)
- Registered `POST /api/library`, `GET /api/library`, `GET /api/library/{id}` endpoints
- Upgraded `forge_service._log_forge_event` from log-only stub to real Supabase insert (fire-and-forget, failure-safe)
- All 27 tests pass (9 new library + 12 forge + 6 granite), no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema SQL, client singleton, models, and test scaffold (RED)** - `12dda14` (test)
2. **Task 2: Implement library service, router, and forge_events upgrade (GREEN)** - `9bedc57` (feat)

_TDD: RED commit first, GREEN commit second_

## Files Created/Modified

- `backend/db/schema.sql` — DDL for prompts and forge_events tables with indexes
- `backend/db/supabase_client.py` — Lazy singleton returning sync Supabase Client using service key
- `backend/models/library.py` — SavePromptRequest, PromptSummary, PromptDetail Pydantic v2 models
- `backend/services/library_service.py` — save_prompt, get_prompts, get_prompt_by_id (all async via run_in_executor)
- `backend/routers/library.py` — Thin router: POST /, GET /, GET /{id} delegating to library_service
- `backend/tests/test_library.py` — 9 tests covering LIB-01 through LIB-08 behaviors
- `backend/services/forge_service.py` — _log_forge_event upgraded to real Supabase forge_events insert
- `backend/main.py` — library router registered after forge router

## Decisions Made

- **supabase_client() as callable:** Implemented as a function (not a module attribute) so tests can `patch("backend.db.supabase_client.supabase_client")` without resetting module state between tests.
- **redirect_slashes=False on router:** FastAPI's default slash redirect causes `POST /api/library` to return 307 instead of 200. Setting `redirect_slashes=False` on the APIRouter eliminates this. Also required `follow_redirects=True` in httpx test clients as defense-in-depth.
- **run_in_executor pattern:** supabase-py v2 is synchronous. All DB calls wrapped with `loop.run_in_executor(None, _fn)` — same pattern established in Phase 1 for IBM SDK.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 307 redirect on POST /api/library and GET /api/library**

- **Found during:** Task 2 (GREEN phase, first test run)
- **Issue:** FastAPI's default `redirect_slashes=True` redirects `/api/library` → `/api/library/`, returning 307 instead of 200/422. The plan specified the router would have `prefix="/api/library"` with routes at `/` — this combination triggers the redirect.
- **Fix:** Added `redirect_slashes=False` to `APIRouter(...)` and `follow_redirects=True` to all `httpx.AsyncClient` instances in tests.
- **Files modified:** backend/routers/library.py, backend/tests/test_library.py
- **Verification:** All 9 library tests pass GREEN (27/27 total)
- **Committed in:** `9bedc57` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Fix required for correctness. No scope creep.

## Issues Encountered

- supabase-py v2 deprecation warnings for `timeout` and `verify` parameters in SyncPostgrestClient constructor — these are library internals, not our code. Non-blocking, tests pass. Logged for awareness.

## User Setup Required

Schema deployment requires manual step:

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `backend/db/schema.sql`
3. Run — creates `prompts` and `forge_events` tables with indexes

No environment variables need to be added (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY already required by existing config.py).

## Next Phase Readiness

- Library endpoints are functional and tested; ready for frontend integration (Phase 4)
- forge_events telemetry now persists to Supabase; data will accumulate from first forge call
- Schema SQL file ready to paste into Supabase Dashboard

---
*Phase: 03-supabase-community-library*
*Completed: 2026-03-14*
