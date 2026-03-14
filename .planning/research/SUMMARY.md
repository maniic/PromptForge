# Project Research Summary

**Project:** PromptForge
**Domain:** AI-powered prompt engineering tool with meta-prompting pipeline and educational anatomy visualization
**Researched:** 2026-03-13
**Confidence:** MEDIUM-HIGH

## Executive Summary

PromptForge is a meta-prompting tool that transforms rough ideas into expert-grade prompts using IBM Granite, executes both the raw and crafted versions in parallel, and visualizes the structural anatomy of the improved prompt to teach users why it works. The competitive landscape is fragmented: PromptPerfect optimizes but doesn't educate, LangSmith observes but doesn't craft, and no existing tool combines scratch-to-expert crafting, live execution comparison, and structural anatomy visualization in one flow. PromptForge's unique intersection of these three capabilities — anchored to IBM Granite exclusively — is the primary prize differentiation strategy.

The recommended implementation approach is a strict backend-first build: Config and Granite service first (all AI calls must be verified before anything else is built), then the 5-call forge pipeline, then the frontend shell, then progressive enhancement with anatomy, X-Ray, and community library. The entire architecture is stateless and request-scoped, which eliminates race conditions and simplifies deployment. The most critical non-obvious technical decision is wrapping the synchronous IBM SDK in `asyncio.run_in_executor()` — without this, `asyncio.gather()` runs calls sequentially and the parallel execution core of the product silently breaks.

The top risks are: IBM SDK package name confusion (wrong package = immediate ImportError), the sync SDK blocking the event loop (correctness issue that's invisible until you measure latency), and Granite-13b producing unreliable JSON for anatomy parsing (requires robust fallback extraction). All three are well-understood with clear prevention patterns already established in the architecture spec. Deployment cold-start is the highest demo-day operational risk and must be addressed by hitting `/health` 5 minutes before any judge walkthrough.

---

## Key Findings

### Recommended Stack

The stack is fully locked per project spec. The only discovery-phase findings are implementation-level: the IBM SDK (`ibm-watsonx-ai` — NOT `ibm-watson-machine-learning`) is synchronous and must be wrapped in `run_in_executor` for any parallel execution to work. FastAPI `>=0.135.1` is confirmed (0.135.0 added native SSE, though SSE is explicitly not needed — typewriter is client-side animation). Supabase `>=2.4.0` handles all DB ops; no Prisma or ORM needed. `framer-motion` is the only frontend addition beyond the locked stack, needed for panel transitions and AnimatePresence exit animations.

**Core technologies:**
- **IBM watsonx.ai (`ibm-watsonx-ai>=1.1.0`):** Exclusive AI provider, `ModelInference.generate_text()` — synchronous, must wrap in `run_in_executor`
- **FastAPI (`>=0.135.1`):** Async HTTP layer, `BackgroundTasks` for fire-and-forget Supabase logging
- **Next.js 14 + TypeScript strict:** Frontend framework — App Router exclusively, all components `"use client"`
- **shadcn/ui + Tailwind CSS:** Component library and styling — no extra design system needed
- **Supabase (`>=2.4.0`):** Community library persistence, async client may need `supabase[async]` extras
- **framer-motion:** Panel slide-in transitions, AnimatePresence for exit animations

**Not needed:** Streaming library (typewriter is client-side), state management library (useState is sufficient), NextAuth (no auth), Redis (no rate limiting at demo scope).

See `.planning/research/STACK.md` for full dependency list and version rationale.

### Expected Features

The feature landscape has a clear three-tier priority structure validated against competitive alternatives.

**Must have (table stakes — demo-critical):**
- Forge pipeline end-to-end (category detection → crafting → parallel execution)
- Before/after comparison panels — users cannot trust value without seeing the diff
- Prompt Anatomy Engine with color-coded segments — primary educational differentiator
- Demo presets with dramatically different before/after — judges need cold-start examples
- Loading states, error states, health endpoint — professionalism signals

**Should have (high value differentiators):**
- Prompt X-Ray mode — reverse-engineers and upgrades existing prompts (no direct competitor does this)
- IBM API Calls Panel — per-call latency breakdown (signals engineering rigor to IBM judges)
- Typewriter animation — cinematic reveal, high impression at low implementation cost
- Meta-prompting transparency — showing AI building prompts for AI, conceptual hook for judges

**Defer (if time allows, not essential for demo):**
- Anatomy interactive toggles with live re-execution — compelling but adds Granite call per toggle
- Community prompt library — independent track, Supabase-dependent

**Explicitly deferred to never/v2+:** Authentication, multi-model, rate limiting, real-time collaboration, prompt history, mobile native, marketplace/monetization.

See `.planning/research/FEATURES.md` for competitive landscape comparison and feature dependency graph.

### Architecture Approach

The architecture is stateless and strictly layered: Config and Pydantic models are leaf nodes with no dependencies; Granite Service is the sole AI integration point; Forge/Anatomy/X-Ray/Library services orchestrate calls and never touch AI directly; Routers handle HTTP and validation only. The forge pipeline makes exactly 5 Granite calls per request — category detection (Call 1), prompt crafting (Call 2), then three-way parallel `asyncio.gather()` for crafted execution, raw execution, and anatomy parsing (Calls 3A, 3B, 5). All three parallel calls MUST use the `run_in_executor` wrapper or they execute sequentially.

**Major components:**
1. **`granite_service.py`** — all IBM watsonx.ai calls, sync-to-async wrapping, timing tracking
2. **`forge_service.py`** — 5-call pipeline orchestration, asyncio.gather for parallel execution
3. **`anatomy_service.py` / `xray_service.py`** — secondary pipelines, lightweight endpoints
4. **`library_service.py`** — independent Supabase CRUD, builds in parallel with forge
5. **Frontend three-column layout** — ForgeInput | CraftedPrompt (typewriter) | ResultPanel (before/after)

See `.planning/research/ARCHITECTURE.md` for full component boundaries, data flow diagrams, and anti-pattern list.

### Critical Pitfalls

1. **Wrong IBM package name (P1)** — Install `ibm-watsonx-ai`, NOT `ibm-watson-machine-learning`. Verify import works as Phase 1's first act.
2. **Sync SDK blocking event loop (P2)** — `generate_text()` is synchronous. Without `run_in_executor`, `asyncio.gather()` runs sequentially and parallel execution is broken. Measure total latency to detect.
3. **Granite-13b JSON unreliability (P3)** — Anatomy parse returns markdown fences, prose, or malformed JSON. Must implement: strip fences → try parse → fallback anatomy. Already handled in spec but must be validated.
4. **IBM API key not validated at startup (P4)** — Add a startup health check Granite call; never discover invalid credentials during a live demo.
5. **Cold start at demo time (P6)** — Hit `/health` 5 minutes before judge walkthrough. Use Replit "Always On" for production deployment.

Additional phase-specific pitfalls: template injection via curly-brace user input (P12), Supabase service key leaking via `NEXT_PUBLIC_` prefix (P13), Pydantic v1 vs v2 settings syntax (P14), anatomy toggle latency without debounce (P9), Granite context overflow in X-Ray mode (P10), demo presets with no visible difference (P16).

See `.planning/research/PITFALLS.md` for full pitfall-to-phase mapping.

---

## Implications for Roadmap

Based on combined research, the build order is strictly determined by the dependency graph: nothing can be tested until Granite works, nothing in the frontend has value until the forge pipeline is curl-testable, and differentiator features (Anatomy, X-Ray) layer on top of a working core. Suggested 8-phase structure:

### Phase 1: Foundation + IBM Integration
**Rationale:** Granite service is the single point of failure for the entire product. Validate credentials, package import, and async wrapping before writing any other code. Pitfalls P1, P2, P4, P13, P14 all live here.
**Delivers:** Working `granite_service.py` with verified IBM credentials, config loaded from `.env`, startup health check, async wrapper confirmed to parallelize.
**Addresses:** Table stakes (health endpoint), IBM API calls panel foundation.
**Avoids:** P1 (wrong package), P2 (sync blocking), P4 (credential discovery at demo time), P13 (key exposure), P14 (Pydantic v2 syntax).

### Phase 2: Forge Pipeline (Backend)
**Rationale:** The 5-call pipeline is the product's core value and must be curl-testable before frontend work begins. This phase produces the `ForgeResponse` schema that the entire frontend is built against.
**Delivers:** `POST /api/forge` returning `ForgeResponse` with category, crafted prompt, both execution results, anatomy segments, and call timings. Curl-testable.
**Implements:** forge_service.py, all 3 prompt templates (craft_vibe_coding.txt, craft_brainstorming.txt, craft_qa.txt), detect_category.txt, parse_anatomy.txt.
**Avoids:** P3 (JSON fallback), P7 (token truncation — test all 3 categories), P8 (category detection fallback), P12 (template injection).

### Phase 3: Frontend Shell + API Wiring
**Rationale:** Three-column layout and API client must exist before any UI component can show real data. Establish App Router structure, CORS verification, and shared types before building individual panels.
**Delivers:** Three-column layout rendering, ForgeInput component, `api.ts` client, `types.ts` interfaces, end-to-end forge request from browser to backend.
**Avoids:** P5 (CORS — verify with real browser test), P17 (App Router vs Pages Router mixing).

### Phase 4: Core Demo UI (Typewriter + Before/After)
**Rationale:** This is what judges will see first. CraftedPrompt with typewriter animation and ResultPanel with before/after comparison are the demo's visual spine. Must be polished before any differentiator work begins.
**Delivers:** Typewriter animation on crafted prompt, side-by-side before/after execution results, loading states, error handling, copy-to-clipboard.
**Avoids:** P11 (useEffect memory leak — cleanup clearInterval).

### Phase 5: Anatomy Engine
**Rationale:** Primary differentiator and educational hook. Color-coded structural segments with tooltips are the feature that no competitor offers. Must be solid before attempting interactive toggles.
**Delivers:** AnatomyView component parsing anatomy JSON from ForgeResponse, color-coded segment display with role labels and tooltips, robust fallback for malformed JSON.
**Avoids:** P3 (anatomy JSON parse — must handle all Granite output variations here).

### Phase 6: X-Ray Mode
**Rationale:** Strongest differentiator — reverse-engineer and upgrade existing prompts. Independent pipeline (3-4 Granite calls), separate `/api/xray` endpoint. Can be built while anatomy toggles are deprioritized.
**Delivers:** `/api/xray` endpoint, xray_service.py with diagnosis + upgrade pipeline, X-Ray frontend UI (paste prompt → diagnose → upgrade → compare).
**Avoids:** P10 (context window — cap X-Ray input at 2000 chars, show warning).

### Phase 7: Polish + IBM Calls Panel + Demo Presets
**Rationale:** Engineering rigor signals for IBM prize. IBM Calls Panel shows per-call latency breakdown. Demo presets ensure cold-start confidence. Community library goes here if time allows.
**Delivers:** IBMCallsPanel component with per-call timing, 3+ validated demo presets with dramatic before/after differences, community library (Supabase schema + GET/POST /api/library) if time allows, anatomy interactive toggles if time allows.
**Avoids:** P9 (300ms debounce on anatomy toggles), P16 (test presets for visible difference).

### Phase 8: Deployment + Demo Prep
**Rationale:** Railway/Replit backend deployment and Vercel frontend deployment. Final validation of all demo-critical paths.
**Delivers:** Deployed backend URL, deployed frontend URL, /health green, all 3 demo-critical paths verified (POST /api/forge, GET /api/library, GET /health).
**Avoids:** P6 (cold start — Replit Always On, pre-warm /health 5 min before demo).

### Phase Ordering Rationale

- Backend-first order is non-negotiable: the frontend has no value without a working ForgeResponse to render.
- Anatomy Engine (Phase 5) precedes X-Ray (Phase 6) because anatomy parsing is a shared primitive both use.
- Polish and community library are deliberately last — they add impression but are not demo-critical.
- Anatomy interactive toggles are deferred to Phase 7 because they require Phase 5 to be solid and add Granite call cost per toggle.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Forge Pipeline):** Granite-13b prompt template tuning requires empirical testing. Template content for craft_vibe_coding.txt, craft_brainstorming.txt, craft_qa.txt needs iteration — no static research substitute.
- **Phase 5 (Anatomy Engine):** Granite-13b JSON reliability for structured output. The parse_anatomy.txt template may require prompt engineering iteration beyond what static research can predict.
- **Phase 6 (X-Ray Mode):** Context window sizing for Granite-13b with complex existing prompts needs runtime measurement.

Phases with standard patterns (skip research-phase):
- **Phase 1 (IBM Integration):** Package, async pattern, and startup check are fully specified.
- **Phase 3 (Frontend Shell):** Next.js 14 App Router + FastAPI CORS are well-documented.
- **Phase 4 (Core Demo UI):** Typewriter useEffect pattern and ResultPanel layout are standard.
- **Phase 8 (Deployment):** Railway + Vercel deployment flows are standard.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | FastAPI and Next.js verified from official docs. IBM SDK version is a conservative floor (`>=1.1.0`) — exact latest requires `pip index versions ibm-watsonx-ai` at install time. Supabase async client extras unverified. |
| Features | MEDIUM | Competitive landscape derived from training knowledge with no live web search. Feature prioritization is high confidence; competitive claims are medium. |
| Architecture | HIGH | Derived from the existing codebase structure + well-established FastAPI and async patterns. Component boundaries and data flow are fully specified. |
| Pitfalls | HIGH | Domain-specific, based on common IBM SDK integration failure modes and FastAPI async patterns. Prevention strategies are concrete and actionable. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **IBM SDK exact version:** Run `pip index versions ibm-watsonx-ai` during Phase 1 setup to confirm latest stable version. Use `>=1.1.0` as floor until verified.
- **Supabase async client:** Confirm whether `supabase[async]` extras are required for the async client pattern. Verify during Phase 2 or 7 when library service is built.
- **Granite-13b streaming support:** Whether `generate_text_stream()` is available on this model class. If yes, opens door to true SSE typewriter — but client-side animation is the safe default and should be implemented first regardless.
- **Granite-13b JSON reliability:** The anatomy parse template's reliability is unknown until tested with real Granite-13b responses. Budget iteration time during Phase 5 for prompt engineering on `parse_anatomy.txt`.
- **Demo preset selection:** Which exact presets produce dramatically different before/after results requires live testing with real Granite output. Validate in Phase 7 before any judge walkthrough.

---

## Sources

### Primary (HIGH confidence)
- FastAPI official documentation — BackgroundTasks, async patterns, CORS middleware, `>=0.135.1` version confirmation
- Next.js 14 official documentation — App Router, "use client" directive, useEffect cleanup patterns
- Existing codebase (`backend/`, `frontend/`) — component boundaries, pipeline spec, Pydantic models

### Secondary (MEDIUM confidence)
- IBM watsonx.ai SDK documentation — `ibm-watsonx-ai` package name, `ModelInference` API, `run_in_executor` async wrapping pattern
- Supabase Python client documentation — `>=2.4.0` version, async client pattern, RPC for atomic increment
- Competitive tool research (PromptPerfect, PromptLayer, LangSmith, Anthropic Console, OpenAI Playground) — training knowledge, no live verification

### Tertiary (LOW confidence — needs runtime validation)
- IBM SDK exact latest version — `pip index versions ibm-watsonx-ai` required
- Supabase async extras requirement — `supabase[async]` — needs install-time verification
- Granite-13b context window exact token limit — runtime measurement required

---

*Research completed: 2026-03-13*
*Ready for roadmap: yes*
