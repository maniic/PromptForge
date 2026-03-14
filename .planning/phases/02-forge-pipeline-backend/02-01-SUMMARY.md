---
phase: 02-forge-pipeline-backend
plan: 01
subsystem: api
tags: [pydantic, fastapi, testing, pytest, tdd, prompt-templates]

# Dependency graph
requires:
  - phase: 01-ibm-integration
    provides: GraniteResponse model and generate_text service that forge_service will call
provides:
  - ForgeRequest Pydantic model with 3-1000 char validation
  - ForgeResponse Pydantic model with category, crafted_prompt, crafted_result, raw_result, call_timings, total_latency_ms
  - CallTiming Pydantic model for per-call latency tracking
  - detect_category.txt prompt template for Granite category classification
  - craft_vibe_coding.txt prompt template with 6-element structure for coding prompts
  - craft_brainstorming.txt prompt template with 6-element structure for creative prompts
  - craft_qa.txt prompt template with 6-element structure for research/analysis prompts
  - 12-test RED scaffold covering PIPE-01 through PIPE-07 requirements
affects: [02-forge-pipeline-backend, forge-router, forge-service-implementation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED phase: write all tests before any implementation"
    - "Pydantic Field constraints for input validation (min_length, max_length)"
    - "Patch forge_service module name (not granite_service) for forge test isolation"
    - "AsyncMock side_effect list provides 4 GraniteResponse objects per pipeline test"
    - "Import service functions inside test functions to defer ImportError to runtime"

key-files:
  created:
    - backend/prompts/detect_category.txt
    - backend/prompts/craft_vibe_coding.txt
    - backend/prompts/craft_brainstorming.txt
    - backend/prompts/craft_qa.txt
    - backend/tests/test_forge.py
  modified:
    - backend/models/forge.py

key-decisions:
  - "Import forge_service symbols inside test functions (not at module level) so collection succeeds even when the stub is empty — keeps all 12 tests in RED not ERROR"
  - "Patch backend.services.forge_service.generate_text (where it will be imported) not granite_service.generate_text for correct mock isolation"
  - "detect_category.txt uses substring matching design: output only category name, so parser must find substring in surrounding text"

patterns-established:
  - "Prompt templates use exactly one placeholder: {input} — no other format variables"
  - "All 4 prompt templates follow 6-element structure: ROLE, CONTEXT, CONSTRAINTS, OUTPUT FORMAT, QUALITY BAR, TASK"
  - "Test isolation: mock at forge_service import boundary, not at granite_service source"

requirements-completed: [PIPE-01, PIPE-02]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 2 Plan 01: Forge Models, Templates, and Test Scaffold Summary

**ForgeRequest/ForgeResponse/CallTiming Pydantic models, four Granite prompt templates (detect + craft x3), and 12-test RED scaffold covering PIPE-01 through PIPE-07**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T04:18:42Z
- **Completed:** 2026-03-14T04:21:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added ForgeRequest (3-1000 char validation), ForgeResponse (all pipeline fields), CallTiming models alongside existing GraniteResponse in forge.py
- Wrote four prompt templates with {input} placeholder and 6-element structural requirements (ROLE, CONTEXT, CONSTRAINTS, OUTPUT FORMAT, QUALITY BAR, TASK)
- Created 12-test RED scaffold — all tests fail because forge_service and forge router are empty stubs, confirming tests are meaningful pre-implementation
- Phase 1 granite tests (6/6) continue to pass — no regression

## Task Commits

Each task was committed atomically:

1. **Task 1: Pydantic models and prompt templates** - `a01eafb` (feat)
2. **Task 2: Test scaffold for all PIPE requirements (RED)** - `df99d4c` (test)

**Plan metadata:** `[pending final commit]` (docs: complete plan)

## Files Created/Modified
- `backend/models/forge.py` - Added ForgeRequest, ForgeResponse, CallTiming below existing GraniteResponse
- `backend/prompts/detect_category.txt` - Category classification prompt (vibe_coding/brainstorming/qa)
- `backend/prompts/craft_vibe_coding.txt` - Expert coding prompt template with 6-element structure
- `backend/prompts/craft_brainstorming.txt` - Expert brainstorming prompt template with 6-element structure
- `backend/prompts/craft_qa.txt` - Expert Q&A/research prompt template with 6-element structure
- `backend/tests/test_forge.py` - 12 RED tests for PIPE-01 through PIPE-07

## Decisions Made
- Import service symbols inside test bodies (not at module level) so pytest collection succeeds even when the forge_service stub is empty — all 12 tests appear as RED failures, not collection errors
- Patch at `backend.services.forge_service.generate_text` (not at `granite_service`) because mock isolation must match where the symbol is bound at call time
- detect_category.txt instructs Granite to output only the category name, keeping the parser simple (substring match in surrounding text)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- No virtual environment found in backend/ — ran tests with system python3 directly; pytest and dependencies were installed globally. Tests collected and executed correctly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All data contracts (models) and prompt templates are in place for Plan 02 implementation
- Test suite defines exact expected behavior: 12 tests will go GREEN as forge_service and forge router are implemented
- Key contracts for Plan 02: `_detect_category_from_text(text) -> str`, `forge(request, background_tasks) -> ForgeResponse`, `_log_forge_event(...)` async logger

## Self-Check: PASSED

All created files verified on disk. All task commits (a01eafb, df99d4c) confirmed in git log.

---
*Phase: 02-forge-pipeline-backend*
*Completed: 2026-03-14*
