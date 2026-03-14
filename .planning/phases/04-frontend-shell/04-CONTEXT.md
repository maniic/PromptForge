# Phase 4: Frontend Shell - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Three-column layout renders, API client talks to the backend, and a forge request initiated from the browser returns a response visible in the browser. Frontend is greenfield — empty `frontend/` directory, full Next.js 14 + TypeScript + Tailwind + shadcn/ui setup needed. Backend contract is established: `POST /api/forge` returns `ForgeResponse` (category, crafted_prompt, crafted_result, raw_result, call_timings, total_latency_ms).

</domain>

<decisions>
## Implementation Decisions

### Overall Visual Direction
- Industry-level, satisfying, clean, and professional interface — interactive and reactive
- Dark theme with TWO theme options: cool electric accents (blue/cyan/purple) and warm forge accents (amber/orange/gold)
- Customizable accent colors within each theme
- Subtle dot-grid background pattern (fading toward edges) for depth

### Input Experience (Hero Landing)
- Hero landing layout: large centered input with bold headline, subtitle explaining value prop, generous whitespace
- Multi-line textarea (~3-4 rows default), auto-expands as user types
- Glowing border on focus: border transitions to accent color with soft box-shadow glow (~4-6px)
- Magnetic hover effect on Forge button: button physically follows cursor when nearby (~50px), springs back on leave, press-down scale on click
- Placeholder text: Claude's discretion

### Column Transition
- Shrink left + reveal: centered input smoothly slides/shrinks to become column 1, columns 2+3 slide in from right
- Staggered slide-in: col 2 first (~300ms), col 3 follows with ~150ms stagger, each fades in as it slides
- Smooth total duration: ~700ms for full transition (input shrinks ~400ms, columns stagger ~300ms)
- Gap-only column separation: no divider lines, each column is its own rounded card panel with gap between (~16-24px)
- Solid elevated cards: opaque background one shade lighter than page, subtle shadow, faint border, rounded corners (12px)
- Input card distinction: faint accent-colored outer glow/shadow to signal "this is the active panel"
- Result cards: neutral dark shadow only
- Auto-adjusting column widths based on content length
- "New Forge" reset button in input card header — animates back to centered hero state

### Loading State
- Transition happens AFTER results arrive (hero stays visible during the 3-8s wait)
- Spinner on Forge button + cycling status text below with smooth fade crossfade (~200ms transitions)
- Status text stages (timed, not real): "Detecting category..." -> "Crafting expert prompt..." -> "Executing with IBM Granite..." -> "Almost there..."
- Cancel button: Forge button transforms into Cancel during loading, aborts request and returns to ready state
- Progressive result reveal: columns slide in, col 2 crafted prompt types out (typewriter ~15ms/char), col 3 results begin fading in when typewriter is ~75% done
- No sound effects

### Error Presentation
- All errors as toast notifications, positioned top-right
- Technical but clear tone: includes status code + human-readable explanation (e.g., "Granite API error (502). The upstream service is unavailable. Retry in a few seconds.")
- Inform only — no retry button in toast, user manually clicks Forge again
- 5-second auto-dismiss
- Multiple toasts stack vertically, max 3 visible, oldest dismissed when 4th arrives
- Toast slides in with animation, dismiss on X click or auto-timeout

### Claude's Discretion
- Placeholder text for textarea
- Exact typography choices and spacing
- Exact dot-grid pattern density and fade
- Card shadow depth and border opacity values
- Toast animation direction (slide from right, fade in, etc.)
- Exact status text timing intervals during loading

</decisions>

<specifics>
## Specific Ideas

- "This needs to be industry level and a satisfying, clean, and professional interface that is actually interactive, reactive, etc." — the bar is high, this is for hackathon judges
- Magnetic button interaction inspired by Stripe-style premium hover effects
- Solid elevated cards like Linear/GitHub dark mode — reliable and always clean
- Input card distinguished by accent glow, matching the glowing textarea border — cohesive visual language
- Two themes serve different moods: cool for tech credibility, warm for forge brand identity

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — frontend is greenfield (empty `frontend/` directory)

### Established Patterns
- Backend uses Pydantic models: `ForgeRequest(input: str)`, `ForgeResponse(category, crafted_prompt, crafted_result, raw_result, call_timings, total_latency_ms)`
- Backend error responses: 422 for validation, 502 for Granite errors with `detail` field
- Stack is locked: Next.js 14, TypeScript strict, Tailwind CSS, shadcn/ui

### Integration Points
- `POST /api/forge` — main forge endpoint, accepts `{"input": "..."}`, returns `ForgeResponse`
- `GET /api/library` — community prompts array
- `GET /health` — health check `{"status": "ok"}`
- Backend runs on port 8000 (`next_public_api_url` from config)
- CORS must be configured for frontend origin

</code_context>

<deferred>
## Deferred Ideas

- Chat-like forge history: create new forges, return to previous ones, delete history — similar to ChatGPT/Claude conversation management. This is a session management feature that belongs in its own phase.

</deferred>

---

*Phase: 04-frontend-shell*
*Context gathered: 2026-03-14*
