# Roadmap: PromptForge

## Overview

PromptForge is built backend-first: Granite integration is the single point of failure for the entire product, so Phase 1 validates it before anything else is written. The forge pipeline becomes curl-testable in Phase 2, establishing the ForgeResponse contract the frontend is built against. Phases 3-5 erect the data layer and frontend shell, then layer in the demo-critical UI judges will see first. Phases 6-7 build the primary differentiator (Anatomy Engine) with interactive teaching features. Phase 8 adds the strongest differentiator (Prompt X-Ray). Phase 9 ships and warms for demo day.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: IBM Integration** - Validate Granite credentials, async wrapping, and startup health check (completed 2026-03-14)
- [x] **Phase 2: Forge Pipeline Backend** - 5-call forge pipeline curl-testable with all prompt templates (completed 2026-03-14)
- [ ] **Phase 3: Supabase + Community Library** - Database schema deployed and library endpoints working
- [ ] **Phase 4: Frontend Shell** - Three-column layout, API client wired, end-to-end request from browser
- [ ] **Phase 5: Core Demo UI** - Before/after comparison, demo presets, IBM API calls panel
- [ ] **Phase 6: Anatomy Engine Display** - Color-coded anatomy segments with tooltips and quality score
- [ ] **Phase 7: Anatomy Interactive Toggles** - Toggle elements on/off with live re-execution feedback
- [ ] **Phase 8: Prompt X-Ray** - Reverse-engineer, diagnose, and upgrade existing prompts end-to-end
- [ ] **Phase 9: Deployment + Demo Prep** - Backend and frontend deployed, all demo-critical paths verified live

## Phase Details

### Phase 1: IBM Integration
**Goal**: IBM Granite is verified working — credentials valid, async wrapping confirmed parallel, startup fails fast on bad config
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-05
**Success Criteria** (what must be TRUE):
  1. Server startup immediately prints an error and exits if IBM credentials are invalid or missing
  2. A test call to `granite_service.py` returns text output from Granite-13b within expected latency
  3. Two simultaneous `generate_text()` calls wrapped in `run_in_executor` complete in parallel (total wall time ≈ 1 call, not 2)
  4. All secrets are loaded via `config.py` settings — no `os.getenv()` calls in service code
**Plans**: 1 plan

### Phase 2: Forge Pipeline Backend
**Goal**: `POST /api/forge` returns a complete `ForgeResponse` with category, crafted prompt, both execution results, and call timings — curl-testable without any frontend
**Depends on**: Phase 1
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-07
**Success Criteria** (what must be TRUE):
  1. `curl -X POST /api/forge -d '{"input":"..."}'` returns a valid `ForgeResponse` JSON with all fields populated
  2. Category detection correctly identifies vibe_coding, brainstorming, and qa inputs (test all three)
  3. Crafted prompt is 200-400 words and uses the correct category-specific template
  4. Calls 3A (crafted execution) and 3B (raw execution) run simultaneously — confirmed by total latency ≈ single call time
  5. Forge events are logged in the background without blocking the HTTP response (fire-and-forget)
**Plans**: 2 plans
Plans:
- [ ] 02-01-PLAN.md — Pydantic models, prompt templates, and test scaffold (TDD RED)
- [ ] 02-02-PLAN.md — Forge pipeline service and router implementation (TDD GREEN)

### Phase 3: Supabase + Community Library
**Goal**: Database schema is deployed and users can save prompts to and retrieve prompts from the community library
**Depends on**: Phase 1
**Requirements**: INFRA-02, LIB-01, LIB-02
**Success Criteria** (what must be TRUE):
  1. `prompts` table and `forge_events` table exist in Supabase with correct columns and indexes
  2. `POST /api/library` saves a prompt with title and author name and returns the saved record
  3. `GET /api/library` returns an array of community prompts including at least 3 seed examples
  4. Seed data covers at least one prompt from each category (vibe_coding, brainstorming, qa)
**Plans**: 2 plans
Plans:
- [ ] 03-01-PLAN.md — Supabase client, models, library CRUD service/router, tests (TDD)
- [ ] 03-02-PLAN.md — Schema deployment to Supabase + seed data (3 demo prompts)

### Phase 4: Frontend Shell
**Goal**: The three-column layout renders, the API client talks to the backend, and a forge request initiated from the browser returns a response visible in the browser
**Depends on**: Phase 2
**Requirements**: UX-01, UX-02, UX-03, UX-06, UX-07
**Success Criteria** (what must be TRUE):
  1. Before any forge, the page shows a centered single-column input — no empty columns visible
  2. After forge completes, columns 2 and 3 animate in with slide/fade transition
  3. During pipeline execution, a spinner and "Forging with IBM Granite..." message is visible
  4. When the backend returns an error, a readable error message appears (not a raw stack trace or blank screen)
  5. End-to-end: user types input, submits, sees loading state, sees response columns animate in
**Plans**: TBD

### Phase 5: Core Demo UI
**Goal**: Judges can see the before/after comparison immediately, click a demo preset to start, and inspect per-call IBM latency — the visual spine of the demo is polished
**Depends on**: Phase 4
**Requirements**: PIPE-05, UX-04, UX-05
**Success Criteria** (what must be TRUE):
  1. Crafted prompt result and raw input result are displayed side-by-side in visible comparison panels
  2. Three demo preset buttons (vibe code, brainstorm, research) fill the input field with one click and show dramatically different before/after results when forged
  3. IBM API Calls panel is visible (collapsed by default), and expanding it shows per-call name and latency in milliseconds
  4. Before/after difference is clearly visible — the crafted result is noticeably longer, more structured, or higher quality than the raw result
**Plans**: TBD

### Phase 6: Anatomy Engine Display
**Goal**: The crafted prompt is visually deconstructed into color-coded structural segments with tooltips and a quality score — users understand *why* the crafted prompt is better
**Depends on**: Phase 5
**Requirements**: PIPE-06, ANAT-01, ANAT-02, ANAT-05
**Success Criteria** (what must be TRUE):
  1. Crafted prompt displays as color-coded annotated segments (role, context, constraints, output_format, quality_bar, task — each a distinct color)
  2. Hovering over any segment shows a tooltip explaining the prompt engineering principle that segment embodies
  3. A prompt quality score (1-100 richness ratio) is displayed below or alongside the anatomy view
  4. Anatomy parsing handles malformed or non-JSON Granite output gracefully — falls back to displaying the full prompt unsegmented rather than crashing
**Plans**: TBD

### Phase 7: Anatomy Interactive Toggles
**Goal**: Users can toggle anatomy elements on/off and see the degraded output — the teaching moment where cause-and-effect of prompt structure is live and visceral
**Depends on**: Phase 6
**Requirements**: ANAT-03, ANAT-04
**Success Criteria** (what must be TRUE):
  1. Each anatomy segment has a pill toggle that can be switched on or off
  2. Toggling an element off triggers a re-execution call to Granite (debounced 300ms) and the result panel updates with the degraded output
  3. Toggling multiple elements off simultaneously only triggers one re-execution (debounce coalesces rapid toggles)
  4. The degraded output is visibly different from the full-prompt output, demonstrating the removed element's contribution
**Plans**: TBD

### Phase 8: Prompt X-Ray
**Goal**: Users can paste any existing prompt, receive a structural diagnosis showing missing elements, and upgrade it with one click — then see the before/after comparison
**Depends on**: Phase 6
**Requirements**: XRAY-01, XRAY-02, XRAY-03, XRAY-04, XRAY-05
**Success Criteria** (what must be TRUE):
  1. User can paste any prompt text into X-Ray mode (capped at 2000 chars with a visible warning at limit)
  2. System parses the pasted prompt into anatomy segments and identifies which element types are absent
  3. Diagnosis panel displays which structural elements are missing with a readable explanation
  4. "Upgrade" button triggers Granite to fill in the missing elements, producing an enhanced prompt
  5. Original and upgraded prompt are both executed and their results displayed side-by-side for comparison
**Plans**: TBD

### Phase 9: Deployment + Demo Prep
**Goal**: Backend and frontend are live at public URLs, all three demo-critical paths return correct responses, and the system survives a cold start 5 minutes before judge walkthrough
**Depends on**: Phase 8
**Requirements**: INFRA-01, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. `GET /health` at the public backend URL returns `{"status":"ok"}` with 200 status
  2. Frontend is live on Vercel and loads the page with no console errors
  3. End-to-end forge request from the deployed frontend to deployed backend returns a complete `ForgeResponse`
  4. `GET /api/library` returns community prompts including seed data
  5. Backend survives 5 minutes of idle then responds correctly on the first request (Always On / warm-up verified)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

Note: Phase 3 (Supabase) depends on Phase 1 only and can be worked in parallel with Phase 2 if two people are building simultaneously.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. IBM Integration | 1/1 | Complete   | 2026-03-14 |
| 2. Forge Pipeline Backend | 2/2 | Complete   | 2026-03-14 |
| 3. Supabase + Community Library | 0/2 | Not started | - |
| 4. Frontend Shell | 0/TBD | Not started | - |
| 5. Core Demo UI | 0/TBD | Not started | - |
| 6. Anatomy Engine Display | 0/TBD | Not started | - |
| 7. Anatomy Interactive Toggles | 0/TBD | Not started | - |
| 8. Prompt X-Ray | 0/TBD | Not started | - |
| 9. Deployment + Demo Prep | 0/TBD | Not started | - |
