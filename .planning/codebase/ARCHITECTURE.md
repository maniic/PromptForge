# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** Layered API architecture with asynchronous processing pipeline and external service integration.

**Key Characteristics:**
- HTTP API routing layer (FastAPI routers) decoupled from business logic
- Strict service isolation: AI calls exclusively through granite_service.py
- Event-driven logging via Supabase (async, non-blocking)
- Four-step Granite AI pipeline per request with parallel execution at step 3
- Template-driven prompt crafting (external `.txt` files, never hardcoded)
- Settings-based configuration (Pydantic BaseSettings) for all external credentials

## Layers

**API/Router Layer:**
- Purpose: HTTP endpoint handling and request/response transformation
- Location: `backend/routers/forge.py`, `backend/routers/library.py`, `backend/routers/health.py`
- Contains: FastAPI route handlers, endpoint definitions, request validation
- Depends on: Services layer (forge_service.py, library_service.py)
- Used by: HTTP clients (frontend via Next.js fetch calls)

**Service Layer (Business Logic):**
- Purpose: Orchestration of forge pipeline, library operations, and AI calls
- Location: `backend/services/forge_service.py`, `backend/services/library_service.py`, `backend/services/granite_service.py`
- Contains: Pipeline orchestration, category detection, prompt crafting, execution logic
- Depends on: Models (validation), Config (settings), DB (Supabase), Granite AI
- Used by: Router layer, cross-service dependencies

**AI Integration Layer:**
- Purpose: Centralized IBM Granite API client and call orchestration
- Location: `backend/services/granite_service.py`
- Contains: Watermark client initialization, LLM call wrapper, asyncio.gather() for parallel calls
- Depends on: Config (credentials), Models (request/response schemas)
- Used by: forge_service.py only (no other service calls Granite directly)

**Data Layer:**
- Purpose: Database client initialization and Supabase operations
- Location: `backend/db/supabase_client.py`
- Contains: Supabase async client, connection pooling
- Depends on: Config (supabase_url, supabase_service_key)
- Used by: library_service.py (community prompt CRUD), forge_service.py (forge_event logging)

**Models/Validation Layer:**
- Purpose: Request/response schema definition and validation
- Location: `backend/models/forge.py`
- Contains: Pydantic models (ForgeRequest, ForgeResponse, category enums)
- Depends on: Nothing (pure data classes)
- Used by: Routers (request validation), Services (type hints)

**Configuration Layer:**
- Purpose: Centralized settings management with environment variable binding
- Location: `backend/config.py`
- Contains: Settings class with BaseSettings, LRU-cached get_settings()
- Depends on: Nothing (reads .env via Pydantic)
- Used by: All services (settings object injected via dependency)

**Template/Prompts:**
- Purpose: External prompt definitions for category detection and expert crafting
- Location: `backend/prompts/detect_category.txt`, `backend/prompts/craft_{category}.txt`
- Contains: Plain text Granite prompt templates
- Depends on: Nothing (static files)
- Used by: forge_service.py (loaded at runtime, never hardcoded)

## Data Flow

**Forge Pipeline (POST /api/forge):**

1. Router receives ForgeRequest (user_input, additional fields)
2. Router validates via Pydantic (422 on invalid)
3. forge_service.detect_category() calls Granite with detect_category.txt template
4. forge_service.load_craft_template() reads appropriate craft_{category}.txt
5. forge_service.craft_expert_prompt() calls Granite with loaded template
6. forge_service executes asyncio.gather([execute_prompt(crafted), execute_prompt(raw_input)])
   - Both calls to Granite run simultaneously
   - Results collected as before/after
7. forge_service logs forge_event to Supabase (async, never blocks response)
8. Router returns ForgeResponse with all fields: input, crafted_prompt, raw_output, crafted_output

**State Management:**
- No in-memory state (stateless API design)
- Request state: Pydantic ForgeRequest object passed through layers
- Pipeline state: Local variables in forge_service functions (no globals)
- Community library state: Supabase (persistent, queried per request)
- Configuration state: Singleton Settings object (immutable after init)

## Key Abstractions

**ForgeRequest:**
- Purpose: Validates and encapsulates user input for forge operation
- Examples: `backend/models/forge.py`
- Pattern: Pydantic BaseModel with field validation, required fields: user_input, optional: metadata

**ForgeResponse:**
- Purpose: Complete before/after comparison with metadata
- Examples: `backend/models/forge.py`
- Pattern: Pydantic BaseModel, contains: input, crafted_prompt, raw_output, crafted_output, category, timestamp

**Category Enum:**
- Purpose: Restrict valid prompt types to three options
- Examples: vibe_coding, brainstorming, qa (in `backend/models/forge.py`)
- Pattern: Python Enum or Literal type (enforced in Granite Call 1 output validation)

**Granite Service:**
- Purpose: Single point of contact for all LLM interactions
- Examples: `backend/services/granite_service.py`
- Pattern: Service class with static methods for: detect_category(), craft_prompt(), execute_prompt()

**Library Service:**
- Purpose: Community prompt library CRUD operations
- Examples: `backend/services/library_service.py`
- Pattern: Service class with methods: get_all_prompts(), save_prompt(), delete_prompt()

## Entry Points

**POST /api/forge:**
- Location: `backend/routers/forge.py`
- Triggers: HTTP POST request with ForgeRequest JSON body
- Responsibilities: Invoke forge_service.forge_pipeline(), return ForgeResponse

**GET /api/library:**
- Location: `backend/routers/library.py`
- Triggers: HTTP GET request (no body)
- Responsibilities: Invoke library_service.get_all_prompts(), return array of prompt records

**GET /health:**
- Location: `backend/routers/health.py`
- Triggers: HTTP GET request
- Responsibilities: Return {"status":"ok"}, verify dependencies (DB, Granite) if needed

## Error Handling

**Strategy:** Fail-fast with HTTP status codes; never swallow exceptions unless explicitly safe.

**Patterns:**
- Request validation errors → 422 Unprocessable Entity (Pydantic auto-raises)
- External service errors (Granite timeout, Supabase down) → 503 Service Unavailable or 500 Internal Server Error
- Invalid category detection → 400 Bad Request (Granite must return valid enum)
- Supabase logging failure → Log and continue (non-blocking, never fail /api/forge response)

## Cross-Cutting Concerns

**Logging:** Python logging (standard library) to stdout + optional stderr; level set via config.log_level.

**Validation:** All user input via Pydantic models at router layer; outbound Granite responses validated against ForgeResponse schema.

**Authentication:** Not implemented initially (add to frontend later if needed; backend assumes trusted frontend); future: JWT via FastAPI Depends().

**Rate Limiting:** Not implemented; should use fastapi-limiter or middleware at deployment (Railway/Replit).

**CORS:** FastAPI CORSMiddleware configured in main.py to allow frontend origin.

---

*Architecture analysis: 2026-03-13*
