# Phase 1: IBM Integration - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate IBM watsonx.ai connectivity — credentials valid, async wrapping confirmed parallel, startup fails fast on bad config. This phase produces a working `granite_service.py` that the entire pipeline (Phase 2+) depends on. No pipeline logic, no prompt templates, no endpoints beyond health.

</domain>

<decisions>
## Implementation Decisions

### SDK vs REST approach
- Use the official `ibm-watsonx-ai` Python SDK — handles auth token refresh, model params, endpoint routing
- Singleton client initialized once at module level, reused across all requests (SDK handles token refresh internally)
- Single model ID from `config.py` (`ibm/granite-13b-instruct-v2`) used for ALL Granite calls — no per-call model override
- `generate_text()` accepts per-call parameters (max_tokens, temperature) with defaults from config — needed since detect (short) vs execute (long) have different needs

### Startup validation
- Make a real lightweight Granite API call at startup (e.g., "Say hello" with max_tokens=5) to verify credentials work
- If validation fails, server exits immediately with `sys.exit(1)` and clear error message — fail fast per INFRA-05
- Log response latency on success: "IBM Granite verified in {X}ms" — gives confidence during demo prep
- Validation runs in FastAPI lifespan event (startup), before any requests are accepted

### Async/parallel strategy
- Use `asyncio.get_event_loop().run_in_executor(None, ...)` to wrap sync SDK calls for parallel execution
- Single async entry point only: callers always use `await granite.generate_text()` — run_in_executor wrapping is internal
- `generate_text()` tracks and returns call latency (wall time in ms) — captured at service level for UX-05 IBM API Calls panel
- Return type is a Pydantic model: `GraniteResponse(text='...', latency_ms=2340)` — consistent with Pydantic-first codebase

### Error handling
- No retry logic — fail fast on error. For a 36-hour hackathon, retry adds complexity with minimal benefit
- Wrap SDK exceptions in a custom `GraniteError` exception — decouples callers from SDK internals
- 30s per-call timeout — generous enough for slow responses, prevents hanging during demo
- Error messages include human-readable text + call name: e.g., "Granite call failed (detect_category): Invalid API key"

### Claude's Discretion
- Exact SDK initialization parameters beyond what's in config.py
- Thread pool executor size (default None = OS decides)
- Logging format and verbosity beyond the startup validation message

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `config.py`: Settings class with all watsonx fields (api_key, project_id, url, model_id, max_tokens_craft, max_tokens_execute) — ready to use
- `backend/models/forge.py`: Pydantic models already defined — GraniteResponse should follow the same patterns
- `backend/prompts/*.txt`: 4 prompt templates exist (detect_category, craft_brainstorming, craft_qa, craft_vibe_coding)

### Established Patterns
- Pydantic-settings for configuration (`config.py` with `BaseSettings` and `lru_cache`)
- All secrets via `config.py` settings — never `os.getenv()` directly in services (per CLAUDE.md rule)

### Integration Points
- `granite_service.py` is the single entry point for ALL AI calls (CLAUDE.md architecture rule #1)
- `main.py` needs lifespan event for startup validation
- `forge_service.py` will be the primary consumer of `generate_text()` (Phase 2)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-ibm-integration*
*Context gathered: 2026-03-13*
