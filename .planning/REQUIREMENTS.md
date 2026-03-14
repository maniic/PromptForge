# Requirements: PromptForge

**Defined:** 2026-03-13
**Core Value:** AI that teaches prompt engineering through live demonstration — building expert prompts AND diagnosing/upgrading existing ones

## v1 Requirements

### Core Pipeline

- [ ] **PIPE-01**: User can type a rough idea (3-1000 chars) and submit it for forging
- [ ] **PIPE-02**: System auto-detects prompt category (vibe_coding, brainstorming, qa) via Granite Call 1
- [ ] **PIPE-03**: System crafts an expert one-shot prompt (200-400 words) using category-specific template via Granite Call 2
- [ ] **PIPE-04**: System executes crafted prompt AND raw input simultaneously via asyncio.gather (Calls 3A + 3B)
- [ ] **PIPE-05**: User can see before/after comparison — crafted result vs raw result side-by-side
- [ ] **PIPE-06**: System parses crafted prompt into structural anatomy segments via Granite Call 5 (parallel with 3A/3B)
- [ ] **PIPE-07**: System logs forge events to Supabase asynchronously (fire-and-forget, never fails the request)

### Prompt Anatomy Engine

- [ ] **ANAT-01**: User can view crafted prompt as color-coded annotated segments (role, context, constraints, output_format, quality_bar, task)
- [ ] **ANAT-02**: User can hover over any segment to see tooltip explaining the prompt engineering principle
- [ ] **ANAT-03**: User can toggle anatomy elements on/off via pill toggles
- [ ] **ANAT-04**: Toggling an element off triggers live re-execution (debounced 300ms) showing degraded output
- [ ] **ANAT-05**: User can see a prompt quality score (richness ratio, 1-100)

### Prompt X-Ray

- [ ] **XRAY-01**: User can paste any existing prompt into X-Ray mode for analysis
- [ ] **XRAY-02**: System parses the existing prompt into anatomy segments and identifies missing element types
- [ ] **XRAY-03**: System displays diagnosis showing which structural elements are missing
- [ ] **XRAY-04**: User can click "Upgrade" to have Granite fill in missing elements
- [ ] **XRAY-05**: System executes both original and upgraded prompts, showing before/after comparison

### Community Library

- [ ] **LIB-01**: User can save a crafted prompt to the community library with title and author name
- [ ] **LIB-02**: Library is pre-loaded with seed data (at least 3 example prompts across categories)

### Frontend UX

- [ ] **UX-01**: Main page shows three-column layout (input | crafted prompt/anatomy | results) after forge
- [ ] **UX-02**: Before first forge, page shows centered single-column input
- [ ] **UX-03**: Columns 2+3 animate in with slide/fade transition after forge completes
- [ ] **UX-04**: Three demo preset buttons (vibe code, brainstorm, research) fill input with one click
- [ ] **UX-05**: IBM API calls panel shows per-call latency breakdown (expandable, collapsed by default)
- [ ] **UX-06**: Loading state shows spinner + "Forging with IBM Granite..." during pipeline execution
- [ ] **UX-07**: Error states show useful messages when pipeline fails

### Infrastructure

- [ ] **INFRA-01**: GET /health returns {"status":"ok"} for uptime verification
- [ ] **INFRA-02**: Supabase schema deployed (prompts table + forge_events table + indexes)
- [ ] **INFRA-03**: Backend deployed to Railway or Replit with Always On
- [ ] **INFRA-04**: Frontend deployed to Vercel with environment variables configured
- [x] **INFRA-05**: IBM watsonx.ai credentials validated at server startup (fail fast, not mid-demo)

## v2 Requirements

### Deferred UX

- **UX-V2-01**: Typewriter animation for crafted prompt reveal (8ms per char)
- **UX-V2-02**: Copy crafted prompt to clipboard button
- **UX-V2-03**: Community library browsing page with category filter and upvote

### Deferred Library

- **LIB-V2-01**: User can browse community prompts filtered by category
- **LIB-V2-02**: User can upvote community prompts
- **LIB-V2-03**: Prompts sorted by upvotes (top) or recency (new)

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / accounts | Not needed for hackathon demo — anonymous sessions sufficient |
| Multi-model comparison | Violates IBM prize requirement — locked to Granite only |
| Rate limiting | Deploy-time concern, zero demo value |
| Real-time collaboration | WebSocket complexity, 8+ hours — out of 36-hour scope |
| Mobile native app | Web-first, responsive design is sufficient |
| Prompt marketplace / monetization | Payment flows, disputes — completely out of scope |
| Fine-tuning / model training | Not available in hackathon API tier |
| A/B testing framework | Before/after comparison is sufficient |
| SSE streaming for typewriter | Client-side animation achieves same result in fraction of time |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 2 | Pending |
| PIPE-02 | Phase 2 | Pending |
| PIPE-03 | Phase 2 | Pending |
| PIPE-04 | Phase 2 | Pending |
| PIPE-05 | Phase 5 | Pending |
| PIPE-06 | Phase 6 | Pending |
| PIPE-07 | Phase 2 | Pending |
| ANAT-01 | Phase 6 | Pending |
| ANAT-02 | Phase 6 | Pending |
| ANAT-03 | Phase 7 | Pending |
| ANAT-04 | Phase 7 | Pending |
| ANAT-05 | Phase 6 | Pending |
| XRAY-01 | Phase 8 | Pending |
| XRAY-02 | Phase 8 | Pending |
| XRAY-03 | Phase 8 | Pending |
| XRAY-04 | Phase 8 | Pending |
| XRAY-05 | Phase 8 | Pending |
| LIB-01 | Phase 3 | Pending |
| LIB-02 | Phase 3 | Pending |
| UX-01 | Phase 4 | Pending |
| UX-02 | Phase 4 | Pending |
| UX-03 | Phase 4 | Pending |
| UX-04 | Phase 5 | Pending |
| UX-05 | Phase 5 | Pending |
| UX-06 | Phase 4 | Pending |
| UX-07 | Phase 4 | Pending |
| INFRA-01 | Phase 9 | Pending |
| INFRA-02 | Phase 3 | Pending |
| INFRA-03 | Phase 9 | Pending |
| INFRA-04 | Phase 9 | Pending |
| INFRA-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation — all 31 requirements mapped*
