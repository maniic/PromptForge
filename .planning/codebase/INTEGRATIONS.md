# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**AI/LLM:**
- IBM watsonx.ai - Prompt execution and optimization engine
  - SDK/Client: IBM Python SDK (watsonx client)
  - Model: `ibm/granite-13b-instruct-v2` (Granite model locked by architecture rules)
  - Auth: `watsonx_api_key` and `watsonx_project_id` from `backend/config.py`
  - URL: `https://us-south.ml.cloud.ibm.com` (configurable via settings)
  - Integration point: `backend/services/granite_service.py` (only place AI calls originate)
  - Pipeline: Exactly 4 Granite calls per `/api/forge` request:
    - Call 1: Detect category (vibe_coding / brainstorming / qa)
    - Call 2: Craft expert prompt (200-400 words output, configured by `max_tokens_craft`)
    - Call 3A: Execute crafted prompt (concurrent with 3B via asyncio.gather())
    - Call 3B: Execute raw input (concurrent with 3A via asyncio.gather())

## Data Storage

**Databases:**
- Supabase (PostgreSQL-compatible)
  - Connection: `supabase_url`, `supabase_anon_key`, `supabase_service_key` from `backend/config.py`
  - Client: `backend/db/supabase_client.py` (Python Supabase client)
  - Purpose: Community prompt library storage and forge_event logging
  - Tables: Implicit tables for prompts and events (schema not yet defined)

**File Storage:**
- Prompt templates stored as local text files (not external)
  - Location: `backend/prompts/*.txt` files:
    - `detect_category.txt` - Category detection prompt template
    - `craft_brainstorming.txt` - Brainstorming optimization template
    - `craft_qa.txt` - Q&A optimization template
    - `craft_vibe_coding.txt` - Vibe coding optimization template
  - Notes: Never hardcoded in Python (architecture rule 5)

**Caching:**
- Not detected (no Redis or caching layer configured)

## Authentication & Identity

**Auth Provider:**
- None detected
- No authentication layer configured in settings
- Note: frontend has `next_public_api_url` which suggests API might be public or use simple token-based auth (not implemented yet)

**API-to-API Auth:**
- IBM watsonx.ai: API key authentication via `watsonx_api_key`
- Supabase: Service key authentication via `supabase_service_key` for admin operations, anon key for client-side
- No OAuth or third-party identity provider integration

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, DataDog, or similar configured)

**Logs:**
- Standard Python logging via `log_level` setting (INFO by default)
- No external logging service configured

**Tracing:**
- Not detected

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel (Next.js deployment platform)
- Backend: Railway (primary) → Replit (fallback)
- Database: Supabase (managed PostgreSQL cloud)

**CI Pipeline:**
- Not explicitly configured (typical Next.js/Python deployment via git hooks)
- Vercel handles frontend CI/CD automatically
- Railway/Replit handle backend deployment

**Deployment Configuration:**
- Frontend build: `npm run build` (Next.js standard build)
- Backend startup: `uvicorn main:app --reload --port 8000` (development), production config TBD

## Environment Configuration

**Required env vars:**
From `backend/config.py`:
- `WATSONX_API_KEY` - IBM watsonx.ai API key
- `WATSONX_PROJECT_ID` - IBM watsonx.ai project ID
- `WATSONX_URL` - IBM watsonx.ai endpoint (defaults to `https://us-south.ml.cloud.ibm.com`)
- `WATSONX_MODEL_ID` - Model identifier (defaults to `ibm/granite-13b-instruct-v2`)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key (client-side)
- `SUPABASE_SERVICE_KEY` - Supabase service role key (server-side admin)
- `NEXT_PUBLIC_API_URL` - Backend API URL visible to frontend (defaults to `http://localhost:8000`)
- `ENVIRONMENT` - deployment environment (development/production, defaults to development)
- `MAX_TOKENS_CRAFT` - Token limit for crafting phase (defaults to 500)
- `MAX_TOKENS_EXECUTE` - Token limit for execution phase (defaults to 800)
- `LOG_LEVEL` - Logging verbosity (defaults to INFO)

**Secrets location:**
- `.env` file (git-ignored, never committed)
- Loaded via Pydantic BaseSettings in `backend/config.py`
- Production: Environment variables set on Railway/Replit deployment platform

## Webhooks & Callbacks

**Incoming:**
- Not configured (no webhook listeners detected)

**Outgoing:**
- Supabase: Async forge_event logging (non-blocking, doesn't fail main request per architecture rule 6)
  - Location: Called from forge pipeline in `backend/services/forge_service.py`
  - Purpose: Record prompt crafting and execution events for community library analytics

## API Endpoints (Internal)

**Core Routes:**
- `POST /api/forge` - Main prompt forging endpoint (calls granite 4x, returns ForgeResponse)
- `GET /api/library` - Retrieve community prompts from Supabase
- `GET /health` - Health check endpoint (returns `{"status":"ok"}`)

Routers defined in `backend/routers/`:
- `forge.py` - ForgeRequest → ForgeResponse pipeline
- `library.py` - Community prompt library operations
- `health.py` - System status endpoint

## Service Integration Points

**granite_service.py:**
- Only authorized service for IBM watsonx.ai calls
- Called exclusively by `forge_service.py`
- Returns prompt text responses from Granite model

**library_service.py:**
- Only authorized service for Supabase operations
- Manages community prompt library read/write
- Handles forge_event logging asynchronously

**forge_service.py:**
- Orchestrates entire pipeline
- Calls granite_service and library_service in sequence
- Validates input with Pydantic models from `backend/models/forge.py`

---

*Integration audit: 2026-03-13*
