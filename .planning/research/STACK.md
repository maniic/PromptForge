# Stack Research: Prompt Engineering Tool

**Domain:** AI-powered prompt engineering with IBM watsonx.ai
**Researched:** 2026-03-13

---

## Core Stack (LOCKED)

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Frontend Framework | Next.js | 14 (locked) | Current latest is 16.1 — 14 is stable |
| Frontend Language | TypeScript | strict mode | Standard |
| Styling | Tailwind CSS | latest | Standard |
| Components | shadcn/ui | latest | Standard |
| Backend Framework | FastAPI | >=0.135.1 | 0.135.0 added native SSE support |
| Backend Language | Python | 3.11 | Stable |
| AI Provider | IBM watsonx.ai | ibm-watsonx-ai >=1.1.0 | LOCKED — only provider |
| Database | Supabase | supabase >=2.4.0 | Managed PostgreSQL |
| Backend Deploy | Railway → Replit | — | Railway dev, Replit production |
| Frontend Deploy | Vercel | — | Standard for Next.js |

---

## Critical SDK Findings

### IBM watsonx.ai SDK

**Package:** `ibm-watsonx-ai` (NOT `ibm-watson-machine-learning` — different package)

**Key finding: SDK is synchronous.** `ModelInference.generate_text()` is a blocking call.

**Correct async pattern:**
```python
async def _call(prompt, max_tokens, temperature):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _call_sync, prompt, max_tokens, temperature)
```

Without `run_in_executor`, `asyncio.gather()` will run calls sequentially, not in parallel.

**Confidence:** MEDIUM — could not verify PyPI for exact latest version. `>=1.1.0` is conservative floor.

### FastAPI

**Version:** >=0.135.1 (verified from official docs)
- 0.135.0 added native SSE via `EventSourceResponse`
- `BackgroundTasks` is the correct pattern for fire-and-forget Supabase logging
- Async test pattern: `pytest-anyio` + `httpx.AsyncClient` + `ASGITransport`

### Supabase Python Client

**Package:** `supabase` >=2.4.0
- Upvotes: use RPC function or read-then-update pattern for atomic increment
- AsyncClient may require `supabase[async]` install extras — verify before implementing

---

## Backend Dependencies (requirements.txt)

```
fastapi>=0.135.1
uvicorn[standard]>=0.30.0
pydantic>=2.6.0
pydantic-settings>=2.3.0
ibm-watsonx-ai>=1.1.0
supabase>=2.4.0
httpx>=0.27.0
python-multipart>=0.0.9
pytest>=8.2.0
pytest-asyncio>=0.23.5
pytest-mock>=3.14.0
```

**Note:** The existing `requirements.txt` in the codebase has pinned versions. Use those if they work; update only if issues arise.

---

## Frontend Dependencies (additions needed)

| Package | Purpose | Why |
|---------|---------|-----|
| `framer-motion` | Panel transitions, AnimatePresence | Handles exit animations CSS cannot — needed for column slide-in |
| `axios` | HTTP client | Already in types — standard for API calls |

Everything else comes from the locked stack (Next.js 14 + Tailwind + shadcn/ui).

**NOT needed:**
- No streaming library — typewriter is client-side animation on complete string
- No state management library — React useState is sufficient for this scope
- No animation library beyond framer-motion — Tailwind transitions handle the rest

---

## Patterns Within the Stack

### Typewriter Effect (No Library Needed)
```typescript
const [displayed, setDisplayed] = useState("")
useEffect(() => {
  if (displayed.length < crafted.length) {
    const timer = setTimeout(() => {
      setDisplayed(crafted.slice(0, displayed.length + 1))
    }, 8)
    return () => clearTimeout(timer)
  }
}, [displayed, crafted])
```

### FastAPI BackgroundTasks for Logging
```python
from fastapi import BackgroundTasks

@router.post("/forge")
async def forge_prompt(request: ForgeRequest, background_tasks: BackgroundTasks):
    result = await forge(request)
    background_tasks.add_task(log_forge_event, result)
    return result
```

### Toggle Debounce (Frontend)
```typescript
import { useDebouncedCallback } from 'use-debounce'
// or manual: setTimeout + clearTimeout pattern
```

---

## What NOT to Use

| Technology | Why Avoid |
|-----------|-----------|
| `ibm-watson-machine-learning` | Wrong package — use `ibm-watsonx-ai` |
| Server-Sent Events for typewriter | 4-6 hours to implement, same visual result as client-side animation |
| Redis for rate limiting | Deploy-time concern, zero demo value |
| NextAuth.js | No authentication needed for hackathon |
| Prisma | Supabase client handles all DB ops |
| zustand/redux | React useState is sufficient for this scope |

---

## Open Questions

- **IBM SDK exact latest version**: Verify via `pip index versions ibm-watsonx-ai`
- **Supabase async client**: May require `supabase[async]` extras
- **Granite-13b streaming**: Whether `generate_text_stream()` is supported on this model — if not, non-streaming is the only option

---

*Researched: 2026-03-13 | Confidence: MEDIUM-HIGH (verified FastAPI + Next.js docs; IBM SDK needs runtime verification)*
