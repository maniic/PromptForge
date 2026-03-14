---
phase: 01-ibm-integration
plan: "01"
subsystem: granite-service
tags: [ibm-watsonx, async, fastapi, tdd, infra]
dependency_graph:
  requires: []
  provides: [granite-service, health-endpoint, fastapi-app]
  affects: [02-forge-pipeline, 04-api-routes]
tech_stack:
  added:
    - ibm-watsonx-ai>=1.5.3
    - fastapi
    - uvicorn[standard]
    - pydantic>=2.0
    - pydantic-settings
    - python-dotenv
    - supabase
    - pytest
    - pytest-asyncio
    - httpx
  patterns:
    - singleton-model-inference
    - async-run-in-executor
    - fail-fast-lifespan
key_files:
  created:
    - backend/requirements.txt
    - backend/models/forge.py
    - backend/services/granite_service.py
    - backend/main.py
    - backend/routers/health.py
    - backend/tests/conftest.py
    - backend/tests/test_granite.py
  modified:
    - backend/config.py
decisions:
  - "Singleton ModelInference with validate=False avoids double API call on startup (Research Pitfall 5)"
  - "asyncio.get_running_loop().run_in_executor wraps sync IBM SDK to enable true asyncio.gather parallelism"
  - "lifespan startup probe: fail fast with sys.exit(1) on GraniteError before accepting requests"
  - "config.py uses extra='ignore' via ConfigDict to tolerate .env frontend vars (NEXT_PUBLIC_*)"
metrics:
  duration_seconds: 183
  completed_date: "2026-03-14"
  tasks_completed: 3
  files_created: 7
  files_modified: 1
---

# Phase 1 Plan 01: IBM Granite Service Layer Summary

**One-liner:** Async IBM Granite singleton wrapper with fail-fast startup validation using `run_in_executor` for true parallelism.

## What Was Built

The foundation for all AI calls in PromptForge — a singleton `ModelInference` instance wrapped in an async interface that:

- Lazily initializes IBM Watsonx credentials and model on first call
- Wraps the synchronous SDK in `asyncio.get_running_loop().run_in_executor()` so `asyncio.gather()` achieves true parallel execution (two concurrent calls complete in ~0.5s, not ~1.0s)
- Enforces a 30s timeout per call via `asyncio.wait_for`
- Wraps all SDK exceptions in `GraniteError` with human-readable `call_name` context
- Validates IBM credentials at FastAPI startup via a lifespan probe; calls `sys.exit(1)` immediately if Granite is unreachable

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dependencies, GraniteResponse model, test scaffolding (RED) | 85f0881 | requirements.txt, models/forge.py, tests/conftest.py, tests/test_granite.py |
| 2 | granite_service.py — singleton, async wrapper, GraniteError | 2111251 | services/granite_service.py, config.py |
| 3 | FastAPI lifespan validation and health endpoint | 5dfbbf8 | main.py, routers/health.py |

## Decisions Made

1. **Singleton with `validate=False`** — `ModelInference(validate=False)` prevents a double auth API call on startup (Research Pitfall 5). The lifespan probe is used instead for explicit validation.

2. **`run_in_executor` for parallelism** — IBM SDK's `generate_text()` is synchronous. Without executor wrapping, `asyncio.gather()` would run calls sequentially. With executor, two 0.5s calls complete in ~0.5s total.

3. **Fail-fast lifespan** — Server exits before binding requests if Granite is unavailable. This prevents silent failures mid-demo.

4. **Config isolation** — All settings come from `backend.config.settings`. No `os.getenv()` anywhere in services. Confirmed by test and grep.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pydantic-settings ValidationError on extra .env vars**
- **Found during:** Task 2, first test run
- **Issue:** `config.py` used deprecated pydantic v1 `class Config` and did not set `extra = "ignore"`. The `.env.example` file contains `NEXT_PUBLIC_APP_NAME=PromptForge` (a Next.js frontend var) which pydantic-settings loaded, causing `ValidationError: Extra inputs are not permitted`.
- **Fix:** Migrated `config.py` to pydantic v2 `model_config = ConfigDict(env_file=".env", extra="ignore")`.
- **Files modified:** `backend/config.py`
- **Commit:** 2111251

**2. [Rule 1 - Bug] "os.getenv" literal in service docstring failed grep test**
- **Found during:** Task 2, test_no_os_getenv_in_service
- **Issue:** The docstring comment contained the literal string `os.getenv()` as documentation text, which the grep-based test flagged as a violation.
- **Fix:** Rephrased comment to "No direct env access — all config via `from backend.config import settings`".
- **Files modified:** `backend/services/granite_service.py`
- **Commit:** 2111251

## Verification Results

```
backend/tests/test_granite.py::test_generate_text_returns_granite_response PASSED
backend/tests/test_granite.py::test_sdk_exception_wrapped_as_granite_error PASSED
backend/tests/test_granite.py::test_generate_text_timeout PASSED
backend/tests/test_granite.py::test_parallel_calls_are_concurrent PASSED
backend/tests/test_granite.py::test_startup_validation_fails_on_bad_credentials PASSED
backend/tests/test_granite.py::test_no_os_getenv_in_service PASSED

6 passed in 0.91s
```

## Self-Check: PASSED

All 7 key files confirmed present. All 3 task commits (85f0881, 2111251, 5dfbbf8) verified in git log.
