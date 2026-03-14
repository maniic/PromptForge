# Codebase Concerns

**Analysis Date:** 2026-03-13

## Project Status

**Critical State:** Project skeleton only - all backend/frontend implementation files are empty stubs. No functional code exists yet.

**Files affected:**
- `backend/main.py` - Empty, needs FastAPI app setup
- `backend/routers/forge.py` - Empty, needs /api/forge endpoint
- `backend/routers/library.py` - Empty, needs /api/library endpoint
- `backend/routers/health.py` - Empty, needs health check
- `backend/services/forge_service.py` - Empty, needs orchestration logic
- `backend/services/granite_service.py` - Empty, needs all 4 Granite calls
- `backend/services/library_service.py` - Empty, needs Supabase operations
- `backend/models/forge.py` - Empty, needs ForgeRequest/ForgeResponse Pydantic models
- `backend/db/supabase_client.py` - Empty, needs Supabase connection
- `frontend/` - Directory empty, no Next.js app structure

**Impact:** Demo cannot run. All blocking acceptance criteria fail.

---

## Tech Debt

**Incomplete Architecture Implementation:**
- Issue: 4-call Granite pipeline (detect → craft → execute crafted + raw) exists only in CLAUDE.md spec, not in code
- Files: `backend/services/granite_service.py`, `backend/routers/forge.py`
- Impact: Core feature completely unavailable
- Fix approach: Implement `backend/services/granite_service.py` with exactly 4 IBM watsonx.ai calls per spec; implement asyncio.gather() for parallel calls 3A+3B

**Missing Prompt Templates:**
- Issue: Prompt template files exist (`backend/prompts/*.txt`) but are not referenced by empty services
- Files: `backend/prompts/detect_category.txt`, `backend/prompts/craft_*.txt`
- Impact: Crafting logic cannot load templates; category detection fails
- Fix approach: Implement template loading in `backend/services/granite_service.py` with proper error handling for missing files

**Supabase Integration Skeleton:**
- Issue: No community library persistence - `backend/services/library_service.py` and `backend/db/supabase_client.py` are empty
- Files: `backend/db/supabase_client.py`, `backend/services/library_service.py`, `backend/routers/library.py`
- Impact: GET /api/library cannot return prompts; save to library feature cannot work
- Fix approach: Implement Supabase client initialization with auth; implement CRUD operations for forge_events and prompts table

**Configuration Hardcoding Risk:**
- Issue: `backend/config.py` uses pydantic_settings but all required env vars (watsonx_api_key, project_id, supabase_url, etc.) are not validated
- Files: `backend/config.py`
- Impact: Missing env vars will cause runtime errors mid-request; no early validation
- Fix approach: Add validation in Settings.model_validate() to fail fast on startup; add required checks in main.py before server starts

---

## Missing Critical Features

**Pydantic Models Gap:**
- Problem: `backend/models/forge.py` is empty - no ForgeRequest, ForgeResponse, or related data classes
- Blocks: Cannot validate input; cannot structure API response; cannot satisfy acceptance criteria
- Files: `backend/models/forge.py`
- Priority: HIGH - blocks all endpoints

**Error Handling:**
- Problem: No error handling for IBM watsonx.ai failures (timeouts, rate limits, auth errors)
- Blocks: Demo fails silently when IBM API is slow (15s+ latency requirement)
- Files: `backend/services/granite_service.py` (when implemented)
- Priority: HIGH - acceptance criteria requires latency reporting

**Typewriter Animation (Frontend):**
- Problem: No CraftedPrompt typewriter animation component implemented
- Blocks: Acceptance criteria requires character-by-character animation of crafted prompt
- Files: `frontend/` - entire component library missing
- Priority: HIGH - core UX feature

**Before/After Result Panel (Frontend):**
- Problem: No ResultPanel component with green/red side-by-side comparison
- Blocks: Core demo feature - user cannot see difference between good and bad prompts
- Files: `frontend/` - entire component library missing
- Priority: CRITICAL - core value proposition

---

## Security Considerations

**Environment Variable Exposure:**
- Risk: Config loads from `.env` file - if accidentally committed, exposes watsonx_api_key, supabase_service_key
- Files: `backend/config.py` line 19, `.env` (NOT readable per security rules)
- Current mitigation: .gitignore exists
- Recommendations:
  - Add .env validation test that fails if any AWS/IBM/API keys present in staged files
  - Document never running git add . blindly
  - Use separate service key for backend vs anon key for frontend

**Prompt Injection Risk:**
- Risk: User input in forge request could be injected into Granite craft prompt without sanitization
- Files: `backend/services/granite_service.py` (when implemented)
- Current mitigation: None
- Recommendations:
  - Validate user_input length (<5000 chars)
  - Document that raw_input flows unmodified to execution but crafted prompt is constructed from template + validated input
  - Add tests for injection attempts

**Supabase Key Exposure:**
- Risk: Supabase anon key exposed in frontend env vars - not a security issue (intended) but service key must never leak
- Files: `backend/config.py` line 11, next_public_api_url not yet in use
- Current mitigation: Using service key only in backend
- Recommendations:
  - Ensure library_service.py uses service_key for writes, never exposes it
  - Document that anon key is frontend-only for read operations (if implemented)

---

## Performance Bottlenecks

**Sequencing vs Parallel Execution:**
- Problem: CLAUDE.md specifies asyncio.gather() for calls 3A (crafted execution) + 3B (raw execution) but calls 1 and 2 (detect, craft) are sequential
- Files: `backend/services/forge_service.py`, `backend/services/granite_service.py` (when implemented)
- Cause: Granite model needs category to select template, needs crafted prompt before executing both
- Improvement path:
  - Calls 1→2→(3A||3B) is optimal; verify asyncio.gather used correctly
  - Monitor latency: acceptance criteria requires <15s total
  - Add instrumentation in `/api/forge` response showing per-call latency

**Supabase Logging Async:**
- Problem: CLAUDE.md requires async logging to Supabase that never fails the request
- Files: `backend/services/forge_service.py`, `backend/services/library_service.py` (when implemented)
- Cause: If Supabase insert fails, user still gets response (correct) but error is lost
- Improvement path:
  - Fire-and-forget task after response is created
  - Log Supabase failures to stderr for visibility
  - Add metrics for forge_event logging success/failure

---

## Fragile Areas

**IBM watsonx.ai Dependency:**
- Files: `backend/services/granite_service.py`, `backend/config.py`
- Why fragile: All 4 AI calls go through single provider - no fallback; API key must be valid; model ID must exist; project ID must have quota
- Safe modification:
  - Never mock IBM API in local dev without explicit flag (accept latency in dev)
  - Test timeout handling: what if Granite takes >30s per call?
  - Test rate limiting: what if batch requests hit quota?
- Test coverage: acceptance criteria requires all 4 calls to be "REAL not stubs"

**Asyncio.gather() Correctness:**
- Files: `backend/services/forge_service.py`
- Why fragile: if asyncio.gather(call_3a, call_3b) is implemented wrong, calls become sequential instead of parallel, breaking latency requirement
- Safe modification:
  - Add test that measures elapsed time of call_3a + call_3b confirms parallelism
  - Verify exception handling if one call fails - must not crash both
- Test coverage: must test timeout and error cases with asyncio

**Frontend TypeScript Strict Mode:**
- Files: `frontend/` (when implemented)
- Why fragile: CLAUDE.md specifies TypeScript strict mode; any type looseness will be caught at build time
- Safe modification:
  - Run `npm run build` and `npx tsc --noEmit` after every frontend change
  - Never use `any` type
- Test coverage: linting must pass before deployment

---

## Scaling Limits

**Supabase Community Library:**
- Current capacity: Unknown - no table schema defined yet
- Limit: Depends on Supabase tier and table design
- Scaling path:
  - Add pagination to `/api/library` endpoint (10 prompts per page minimum)
  - Add indexing on category and created_at for filtering
  - Cache library response for 60s to reduce queries

**Granite API Rate Limits:**
- Current capacity: Unknown - depends on IBM watsonx.ai tier
- Limit: Each request makes 4 calls; 1000 daily requests = 4000 calls
- Scaling path:
  - Monitor 429 responses from IBM API
  - Implement exponential backoff for retries
  - Add queue if needed for burst traffic

---

## Dependencies at Risk

**IBM watsonx.ai SDK Not Yet Added:**
- Risk: `backend/requirements.txt` is empty - ibm-watsonx-ai package not installed
- Impact: Cannot import IBM SDK; `/api/forge` will crash on first request
- Migration plan: Add to requirements.txt; verify version compatibility with Python 3.11

**Pydantic Version:**
- Risk: `backend/config.py` uses `pydantic_settings.BaseSettings` but version not locked in requirements.txt
- Impact: Different versions may have breaking changes
- Migration plan: Add pydantic>=2.0 and pydantic-settings to requirements.txt

**Supabase Python Client Not Yet Added:**
- Risk: `backend/requirements.txt` empty - supabase-py package not installed
- Impact: Cannot initialize Supabase client; library operations fail
- Migration plan: Add supabase-py to requirements.txt

---

## Test Coverage Gaps

**No Granite Mock Tests:**
- What's not tested: IBM watsonx.ai call behavior, timeout handling, error responses
- Files: `backend/tests/test_granite.py` (empty)
- Risk: Granite call failures discovered in demo, not in testing
- Priority: HIGH - CLAUDE.md requires all 4 calls to be real but tests must use mocks

**No Forge Pipeline Tests:**
- What's not tested: Full /api/forge request flow, category detection, prompt crafting, asyncio.gather correctness
- Files: `backend/tests/test_forge.py` (empty)
- Risk: Pipeline latency issues, missing fields in response, malformed output discovered during demo
- Priority: HIGH - core feature

**No Frontend Component Tests:**
- What's not tested: Typewriter animation, before/after comparison rendering, form submission
- Files: `frontend/` - no test infrastructure
- Risk: Broken UI discovered during demo
- Priority: HIGH - user-facing features

**No Integration Tests:**
- What's not tested: Backend + frontend + Supabase + IBM API together
- Risk: E2E flow fails in production
- Priority: MEDIUM - acceptance criteria focuses on individual paths

---

## Known Issues

**None Recorded Yet** - This is a skeleton project with no implementation, so no runtime issues exist. Blocking issues are architectural (empty files) not bugs.

---

## Missing Critical Validations

**ForgeRequest Input Validation:**
- Problem: Pydantic model for request validation not implemented
- Files: `backend/models/forge.py`
- Causes: Malformed requests could crash handler or be misprocessed
- Priority: HIGH

**Granite Response Parsing:**
- Problem: No validation that Granite returns expected JSON structure
- Files: `backend/services/granite_service.py` (when implemented)
- Causes: Malformed response crashes endpoint
- Priority: HIGH

**Template File Existence:**
- Problem: Code should fail fast if prompt template files missing at startup
- Files: `backend/services/granite_service.py` (when implemented)
- Causes: Runtime error when trying to load template
- Priority: MEDIUM

---

*Concerns audit: 2026-03-13*
