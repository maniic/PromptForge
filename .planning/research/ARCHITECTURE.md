# Architecture Research: Prompt Engineering Tools

**Domain:** AI-powered prompt engineering with meta-prompting pipeline
**Researched:** 2026-03-13

---

## Component Boundaries

### Backend Components

| Component | Responsibility | Talks To | Location |
|-----------|---------------|----------|----------|
| **Config** | Environment variables, settings singleton | Nothing (leaf) | `backend/config.py` |
| **Models** | Pydantic request/response schemas | Nothing (leaf) | `backend/models/forge.py` |
| **Granite Service** | ALL IBM watsonx.ai calls | Config (credentials) | `backend/services/granite_service.py` |
| **Forge Service** | Pipeline orchestration (5 calls) | Granite Service, Models | `backend/services/forge_service.py` |
| **Anatomy Service** | Toggle re-execution | Granite Service | `backend/services/anatomy_service.py` |
| **X-Ray Service** | Prompt diagnosis + upgrade | Granite Service | `backend/services/xray_service.py` |
| **Library Service** | Community CRUD | Supabase Client | `backend/services/library_service.py` |
| **Supabase Client** | Database operations | Config (credentials) | `backend/db/supabase_client.py` |
| **Routers** | HTTP endpoints, validation | Services | `backend/routers/*.py` |
| **Prompt Templates** | LLM prompt text | Nothing (static) | `backend/prompts/*.txt` |

### Frontend Components

| Component | Responsibility | Location |
|-----------|---------------|----------|
| **ForgeInput** | Text input, presets, forge button | `frontend/components/ForgeInput.tsx` |
| **CraftedPrompt** | Typewriter animation, raw prompt display | `frontend/components/CraftedPrompt.tsx` |
| **AnatomyView** | Color-coded segments, tooltips | `frontend/components/AnatomyView.tsx` |
| **AnatomyToggle** | Pill toggles, re-execution trigger | `frontend/components/AnatomyToggle.tsx` |
| **ResultPanel** | Before/after comparison, tabs | `frontend/components/ResultPanel.tsx` |
| **IBMCallsPanel** | Per-call latency display | `frontend/components/IBMCallsPanel.tsx` |
| **API Client** | Axios wrapper for all backend calls | `frontend/lib/api.ts` |
| **Types** | Shared TypeScript interfaces | `frontend/lib/types.ts` |

---

## Data Flow

### Forge Pipeline (POST /api/forge) — 5 Granite Calls

```
User input → Router (validate) → forge_service.forge()
  │
  ├─ Call 1: detect_category(rough_input) → "vibe_coding"
  │         uses: detect_category.txt template
  │         temp: 0.0, max_tokens: 20
  │
  ├─ Call 2: craft_prompt(rough_input, category) → crafted_prompt
  │         uses: craft_{category}.txt template
  │         temp: 0.7, max_tokens: 500
  │
  ├─ asyncio.gather() — ALL THREE IN PARALLEL:
  │   ├─ Call 3A: execute_prompt(crafted_prompt) → good_result
  │   ├─ Call 3B: execute_prompt(rough_input) → bad_result
  │   └─ Call 5:  parse_anatomy(crafted_prompt) → anatomy JSON
  │
  └─ Return ForgeResponse + fire-and-forget Supabase log
```

**Critical**: IBM SDK is synchronous. Must wrap in `asyncio.to_thread()` / `run_in_executor()` for `asyncio.gather()` to actually parallelize.

### Anatomy Toggle (POST /api/anatomy/toggle)

```
Toggle change → debounce 300ms → reconstruct prompt (enabled segments only)
  │
  └─ Call: execute_prompt(modified_prompt) → degraded_result
     │
     └─ Update ResultPanel with new output
```

**Lightweight endpoint** — does NOT re-run the full 5-call pipeline. Just executes the modified prompt.

### X-Ray Pipeline (POST /api/xray) — 3-4 Granite Calls

```
Existing prompt → Router (validate) → xray_service.xray()
  │
  ├─ Call 1: parse_anatomy(existing_prompt) → anatomy segments
  │
  ├─ Call 2: diagnose_gaps(anatomy) → missing element types
  │
  ├─ Call 3: upgrade_prompt(existing_prompt, missing_elements) → upgraded_prompt
  │
  ├─ asyncio.gather():
  │   ├─ Call 4A: execute_prompt(upgraded_prompt) → improved_result
  │   └─ Call 4B: execute_prompt(existing_prompt) → original_result
  │
  └─ Return XRayResponse with diagnosis + comparison
```

### Community Library

```
GET /api/library → library_service → Supabase select → LibraryRecord[]
POST /api/library → library_service → Supabase insert → {id}
POST /api/library/:id/upvote → library_service → Supabase increment
```

Independent from forge pipeline. Can be built in parallel.

---

## Key Patterns

### Async IBM SDK Wrapping
```python
async def _call(prompt, max_tokens, temperature):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _call_sync, prompt, max_tokens, temperature)
```
Without this, `asyncio.gather()` runs calls sequentially (blocking the event loop).

### Supabase Fire-and-Forget Logging
```python
# In forge_service, after building response:
asyncio.create_task(log_forge_event(response))
# Never await — never fail the request if logging fails
```

### Typewriter Animation (Frontend)
Client-side animation on a complete string, NOT SSE streaming:
```typescript
const [displayed, setDisplayed] = useState("")
useEffect(() => {
  const interval = setInterval(() => {
    setDisplayed(prev => crafted.slice(0, prev.length + 1))
  }, 8)
  return () => clearInterval(interval)
}, [crafted])
```
Saves 4-6 hours vs implementing true streaming. Identical visual result.

### Anatomy Toggle Debounce
```typescript
const debouncedToggle = useMemo(
  () => debounce(async (enabledSegments) => {
    const result = await toggleAnatomy({ ... })
    setToggleResult(result)
  }, 300),
  []
)
```

---

## Suggested Build Order

Build order is strictly backend-first due to dependencies:

1. **Config + Models** — foundation, everything depends on these
2. **Granite Service** — all AI calls, must work before anything else
3. **Forge Service + Router** — core pipeline, curl-testable before frontend starts
4. **Frontend shell** — three-column layout, ForgeInput, API client wiring
5. **CraftedPrompt + Typewriter** — center panel with animation
6. **ResultPanel** — before/after comparison (core demo value)
7. **Anatomy Engine** — parse + display color-coded segments
8. **Anatomy Toggle** — interactive re-execution (primary differentiator)
9. **X-Ray Service + Router** — reverse engineering mode
10. **X-Ray Frontend** — paste + diagnose + upgrade UI
11. **Community Library** — Supabase schema + service + UI
12. **IBM Calls Panel** — latency display (polish)
13. **Deploy** — Railway/Replit backend, Vercel frontend

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why | Do This Instead |
|-------------|-----|-----------------|
| Streaming SSE for typewriter | 4-6 hours to implement, same visual result | Client-side animation on complete string |
| Re-running full pipeline on toggle | 10-24s per toggle, destroys interactivity | Lightweight /api/anatomy/toggle endpoint |
| Awaiting Supabase logging | Single failure kills entire forge request | asyncio.create_task (fire-and-forget) |
| Bare sync IBM calls in async | asyncio.gather runs sequentially | Wrap in run_in_executor/to_thread |
| Global mutable state | Race conditions under concurrent requests | Stateless request processing |

---

*Researched: 2026-03-13 | Confidence: HIGH (derived from existing codebase + established patterns)*
