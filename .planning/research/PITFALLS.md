# Pitfalls Research: Prompt Engineering Tool with IBM Granite

**Domain:** AI-powered prompt engineering tool using IBM watsonx.ai
**Researched:** 2026-03-13

---

## Critical Pitfalls (Demo-Killers)

### P1: IBM SDK Package Name Confusion
**Risk:** Installing `ibm-watson-machine-learning` instead of `ibm-watsonx-ai`
**Warning signs:** ImportError on `from ibm_watsonx_ai.foundation_models import ModelInference`
**Prevention:** Pin `ibm-watsonx-ai` in requirements.txt. Verify import works in Phase 1.
**Phase:** 1 (IBM integration)

### P2: Sync IBM SDK Blocking the Event Loop
**Risk:** `ModelInference.generate_text()` is synchronous. Calling it directly in async FastAPI handlers means `asyncio.gather()` runs calls sequentially, not in parallel.
**Warning signs:** Total forge latency = sum of all call latencies (not max)
**Prevention:** Wrap ALL Granite calls in `asyncio.get_event_loop().run_in_executor(None, sync_fn)`. Already implemented in spec's `granite_service.py`.
**Phase:** 1 (IBM integration)

### P3: Granite 13b JSON Output Unreliability
**Risk:** `parse_anatomy.txt` asks Granite to return JSON, but Granite-13b frequently wraps output in markdown fences, adds explanatory text, or produces malformed JSON.
**Warning signs:** `json.loads()` failures, anatomy showing as single "Full prompt" fallback element
**Prevention:** Robust JSON extraction: strip markdown fences, try multiple parse strategies, implement fallback anatomy. The `_parse_anatomy_json()` in forge_service.py already handles this.
**Phase:** 2 (Forge pipeline) and 4 (Anatomy)

### P4: IBM API Key Not Validated at Startup
**Risk:** Server starts fine, first forge request fails with 401 — discovered during live demo.
**Warning signs:** No error until first Granite call
**Prevention:** Add a lightweight Granite health check in FastAPI `startup` event:
```python
@app.on_event("startup")
async def validate_ibm_credentials():
    try:
        await granite_service._call("test", 5, 0.0)
    except Exception as e:
        logger.error(f"IBM credentials invalid: {e}")
        raise
```
**Phase:** 1 (IBM integration)

### P5: CORS Misconfiguration Blocking Frontend
**Risk:** Frontend on localhost:3000 can't reach backend on localhost:8000. Works in Postman, fails in browser.
**Warning signs:** Browser console shows CORS errors, API calls return empty
**Prevention:** Already handled — `CORSMiddleware(allow_origins=["*"])` in main.py. Verify with browser test in Phase 3.
**Phase:** 3 (Frontend wiring)

### P6: Railway/Replit Cold Start at Demo Time
**Risk:** Backend sleeps after inactivity. First demo request takes 30-60s while container wakes up.
**Warning signs:** First request timeout, then subsequent requests work fine
**Prevention:** Hit /health 5 minutes before demo. Use Replit "Always On" for production. Add a cron ping if needed.
**Phase:** Final (Deployment)

---

## High-Risk Pitfalls

### P7: Token Limit Truncation
**Risk:** `max_tokens_craft=500` may not be enough for complex prompts. Granite cuts off mid-sentence, producing incomplete crafted prompts.
**Warning signs:** Crafted prompts end abruptly, missing closing statements
**Prevention:** Set `max_tokens_craft=500` as starting point, test with all three categories. Increase to 600-700 if truncation observed. Add "Complete all sections" to craft templates.
**Phase:** 2 (Forge pipeline)

### P8: Missing Category Detection Fallback
**Risk:** Granite returns garbage for category detection (not "vibe_coding", "brainstorming", or "qa"). Pipeline crashes.
**Warning signs:** KeyError or ValueError on Category enum
**Prevention:** Already handled — fallback to "qa" in `detect_category()`. Keep temperature at 0.0 for this call.
**Phase:** 2 (Forge pipeline)

### P9: Anatomy Toggle Latency Destroying Interactivity
**Risk:** Each toggle triggers a Granite call (3-8s). Users toggle rapidly, creating a queue of expensive calls.
**Warning signs:** UI feels frozen, stale results appearing after new toggles
**Prevention:** 300ms debounce on toggle changes. Cancel in-flight requests on new toggle. Show loading indicator during re-execution.
**Phase:** 5 (Anatomy toggles)

### P10: Granite Context Window Overflow in X-Ray Mode
**Risk:** X-Ray receives a long existing prompt + upgrade instructions. Total input exceeds Granite-13b context window.
**Warning signs:** Truncated or nonsensical upgrade output
**Prevention:** Cap input prompt length at 2000 chars for X-Ray. Show warning for longer prompts.
**Phase:** 6 (X-Ray mode)

### P11: Typewriter Animation useEffect Leaks
**Risk:** Navigating away or re-forging while typewriter is running causes state updates on unmounted component.
**Warning signs:** React "Can't perform a state update on an unmounted component" warning
**Prevention:** Return cleanup function from useEffect (clearInterval/clearTimeout). Check mounted ref.
**Phase:** 4 (Frontend polish)

---

## Medium-Risk Pitfalls

### P12: Prompt Injection via Template Interpolation
**Risk:** `template.replace("{user_input}", rough_input)` — user input containing `{crafted_prompt}` or other template markers could break template expansion.
**Warning signs:** Granite receives malformed prompts, outputs instructions instead of results
**Prevention:** Use single-pass replacement. Don't chain replacements on the same string. Sanitize curly braces in user input if needed.
**Phase:** 2 (Forge pipeline)

### P13: Supabase Service Key Leaked to Frontend
**Risk:** `SUPABASE_SERVICE_KEY` in `.env` accidentally included in Next.js build (any `NEXT_PUBLIC_` prefixed var is exposed).
**Warning signs:** Key visible in browser devtools network tab
**Prevention:** Only `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_NAME` should have the `NEXT_PUBLIC_` prefix. All Supabase keys stay backend-only.
**Phase:** 1 (Setup)

### P14: Pydantic v1 vs v2 Settings Syntax
**Risk:** `pydantic-settings` v2 uses `model_config` instead of inner `class Config`. Wrong syntax silently ignores .env file.
**Warning signs:** Settings all have default values, .env overrides not loading
**Prevention:** Use `model_config = SettingsConfigDict(env_file=".env")` for v2. The existing config.py uses v1 syntax (`class Config`) — verify it works with installed version.
**Phase:** 1 (Setup)

### P15: `lru_cache` on Settings Blocking Test Isolation
**Risk:** `@lru_cache()` on `get_settings()` means tests can't override settings between test cases.
**Warning signs:** Test environment variables not being picked up
**Prevention:** Clear cache in test fixtures: `get_settings.cache_clear()`. Or use FastAPI dependency override pattern.
**Phase:** Testing

### P16: Demo Presets With No Visible Difference
**Risk:** Some presets produce good_result and bad_result that look nearly identical. Judges see no value.
**Warning signs:** Before/after panels show similar length and quality text
**Prevention:** Test all three presets manually. Choose presets where the difference is dramatic. "make me a habit tracker app" is good — raw produces vague advice, crafted produces structured code.
**Phase:** Final (Demo prep)

### P17: Next.js App Router vs Pages Router Confusion
**Risk:** Mixing App Router (`app/`) and Pages Router (`pages/`) patterns. Import paths differ, data fetching differs.
**Warning signs:** "use client" errors, hydration mismatches
**Prevention:** Use App Router exclusively (already spec'd). All components are client components (`"use client"` directive). No server-side data fetching needed.
**Phase:** 3 (Frontend setup)

---

## Pitfall-to-Phase Mapping

| Phase | Pitfalls to Address |
|-------|-------------------|
| Phase 1: Setup + IBM Integration | P1, P2, P4, P13, P14 |
| Phase 2: Forge Pipeline | P3, P7, P8, P12 |
| Phase 3: Frontend Shell | P5, P17 |
| Phase 4: Anatomy Engine | P3, P11 |
| Phase 5: Anatomy Toggles | P9 |
| Phase 6: X-Ray Mode | P10 |
| Deployment | P6 |
| Demo Prep | P16 |
| Testing | P15 |

---

*Researched: 2026-03-13 | Confidence: HIGH (domain-specific, actionable prevention strategies)*
