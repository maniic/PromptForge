# Coding Conventions

**Analysis Date:** 2026-03-13

## Naming Patterns

**Files:**
- Python module files: `snake_case.py` (e.g., `granite_service.py`, `supabase_client.py`)
- Router files: named by domain in `backend/routers/` (e.g., `forge.py`, `library.py`, `health.py`)
- Test files: `test_*.py` or `conftest.py` (e.g., `test_forge.py`, `test_granite.py`)
- Configuration: `config.py` (singular, contains settings class)
- Service files: `*_service.py` pattern in `backend/services/` (e.g., `granite_service.py`, `forge_service.py`, `library_service.py`)

**Functions and Methods:**
- Python functions: `snake_case` (per PEP 8)
- Async functions: use `async def` prefix consistently
- Private methods/attributes: prefixed with single underscore `_private_method()`

**Variables:**
- Python variables: `snake_case`
- Configuration parameters: UPPERCASE with underscores in pydantic Settings (e.g., `watsonx_api_key`, `max_tokens_craft`)
- Environment variables: UPPERCASE (referenced in Settings class, never used directly via `os.getenv()`)

**Types:**
- Pydantic models: PascalCase (e.g., `ForgeRequest`, `ForgeResponse`)
- Exception classes: PascalCase ending in `Error` or `Exception`
- Type hints: used throughout for clarity and validation

## Code Style

**Formatting:**
- Python: PEP 8 compliant
- Line length: standard 88 characters for Black (if adopted)
- Indentation: 4 spaces

**Linting:**
- Frontend TypeScript: strict mode enforced (`npm run lint` requires zero errors)
- Frontend: `npx tsc --noEmit` must pass (TypeScript strict type checking)
- Backend: Python linting via pytest fixtures (see TESTING.md)

## Import Organization

**Order:**
1. Standard library imports (`import os`, `import sys`, `from functools import`)
2. Third-party imports (`from fastapi import`, `from pydantic import`, `from pydantic_settings import`)
3. Local application imports (`from backend.services import`, `from backend.models import`)

**Path Aliases:**
- No path aliases used; imports are explicit and absolute
- Backend modules referenced as `backend.*` when imported

## Error Handling

**Patterns:**
- Pydantic validation: raise `422` (Unprocessable Entity) on invalid `ForgeRequest` (implicit via FastAPI + Pydantic)
- API errors: return HTTP status codes; FastAPI handles automatic error responses
- Database operations: exceptions from Supabase client caught and logged (never fail the primary request per architecture rules)
- Configuration errors: raise immediately on Settings initialization if required env vars missing

**Specific Rule:**
Per CLAUDE.md: "Supabase: log forge_event (async, never fail the request if this fails)" — all secondary database operations are fire-and-forget with exception handling that does not propagate.

## Logging

**Framework:** Python `logging` module (via FastAPI/uvicorn built-in logging)

**Patterns:**
- Use `log_level` from `config.py` settings
- Log structured events (e.g., API calls, Granite latencies, library operations)
- All 4 Granite calls must be logged with latency tracking (required for acceptance criteria)
- Database operations logged but failures don't block the response

## Comments

**When to Comment:**
- Complex business logic that isn't self-evident
- Explanations of "why", not "what" (code should be readable enough for the "what")
- Critical architectural decisions per CLAUDE.md rules

**JSDoc/TSDoc:**
- Pydantic models: use docstrings describing field purpose
- Functions: docstrings for non-obvious behavior
- Async operations: document concurrent execution patterns (e.g., asyncio.gather usage)

## Function Design

**Size:** Keep functions focused — single responsibility principle
- Service functions handle one concern (e.g., `granite_service.py` → ONLY granite calls)
- Router functions orchestrate but delegate to services

**Parameters:**
- Pydantic models preferred over raw dicts (automatic validation)
- Typed parameters required in all functions

**Return Values:**
- Always typed with return type hints
- Functions return the result directly or raise exceptions (no `None` for error states; use Pydantic validation)
- Async functions return coroutines; use `asyncio.gather()` for concurrent execution per architecture rules

## Module Design

**Exports:**
- Explicit exports from modules (no wildcard `import *`)
- Services export single class or factory function (e.g., `GraniteService()`)
- Models export Pydantic classes only

**Barrel Files:**
- `__init__.py` files exist for package structure (e.g., `backend/services/__init__.py`) but keep minimal
- No re-exports in `__init__.py` unless explicitly needed for public API

## Architecture-Specific Conventions

**Strict Rules from CLAUDE.md:**
1. **AI Calls:** ALL granite calls go through `backend/services/granite_service.py` only — no direct IBM API calls elsewhere
2. **Granite Execution:** Calls 3A (crafted) and 3B (raw) MUST run via `asyncio.gather()` simultaneously for performance
3. **Configuration:** All secrets from `config.py` settings — never `os.getenv()` directly in services
4. **Templates:** Prompt templates stored in `backend/prompts/*.txt` files — never hardcoded in Python
5. **Community Library:** All library operations via `backend/services/library_service.py` only
6. **Pydantic Validation:** ForgeRequest validation happens at route handler level; invalid requests return 422 automatically

## Pipeline Order (Non-Negotiable)

Per CLAUDE.md, the forge pipeline follows this exact order:
1. Validate ForgeRequest (Pydantic — automatic 422 on invalid)
2. Granite Call 1: detect category → `vibe_coding` / `brainstorming` / `qa`
3. Load `backend/prompts/craft_{category}.txt` template
4. Granite Call 2: craft expert prompt (200-400 words output)
5. `asyncio.gather(execute_prompt(crafted), execute_prompt(raw_input))` — simultaneous execution
6. Supabase: log forge_event (async, never fail the request if this fails)
7. Return ForgeResponse with all fields populated

---

*Convention analysis: 2026-03-13*
