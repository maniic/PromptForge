# Phase 3: Supabase + Community Library - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema deployed to Supabase and library CRUD endpoints working. Users can save forged prompts to and browse prompts from the community library. No frontend UI (Phase 4+), no auth/accounts (out of scope), no upvote/rating system beyond what's needed for sorting.

</domain>

<decisions>
## Implementation Decisions

### Prompt data model
- `prompts` table: id (uuid, default gen_random_uuid()), title (text, required), author_name (text, required), category (text — vibe_coding/brainstorming/qa), original_input (text), crafted_prompt (text), crafted_result (text), raw_result (text), total_latency_ms (float), created_at (timestamptz, default now())
- `forge_events` table: id (uuid), input_text (text), category (text), total_latency_ms (float), created_at (timestamptz, default now()) — analytics only, not user-facing
- No upvote column yet — keep schema minimal for hackathon. Can add in a later phase if needed
- Indexes: prompts(category), prompts(created_at DESC) for browsing queries

### Saving flow
- Explicit user action only — not auto-save. User clicks "Save to Library" after seeing their forge result
- Required fields: title, author_name (frontend will collect these — Phase 4+)
- All forge result fields (category, crafted_prompt, crafted_result, raw_result, total_latency_ms) saved automatically from the ForgeResponse
- POST /api/library accepts SavePromptRequest(title, author_name, forge_response fields) and returns the saved record

### Library browsing
- GET /api/library returns all prompts sorted by created_at DESC (newest first)
- Optional query param: ?category=vibe_coding to filter by category
- No pagination — return all for hackathon (library will have <100 entries during demo)
- Response is a list of PromptSummary objects (id, title, author_name, category, created_at) for the list view
- GET /api/library/{id} returns full prompt detail including crafted_prompt, results, etc.

### Seed data
- 3 impressive seed prompts (one per category) that showcase dramatic before/after differences
- Pre-inserted via a seed script (not migration) — run manually or at startup in dev
- Seed prompts should be real forge results with compelling crafted_prompt and visibly better crafted_result vs raw_result
- These are the prompts judges will see when they first open the library — must look polished

### Supabase client setup
- Sync Supabase client via `supabase-py` (already in requirements.txt)
- Client singleton in `backend/db/supabase_client.py` — initialized with supabase_url + supabase_service_key from config.py
- Service key (not anon key) for backend operations — no RLS complexity for hackathon
- All DB operations in `library_service.py` only (CLAUDE.md rule)

### forge_events integration
- Replace `_log_forge_event` stub in forge_service.py with real Supabase insert
- Keep fire-and-forget pattern — wrap in try/except, never fail the forge request
- Log to forge_events table: input_text, category, total_latency_ms, created_at

### Claude's Discretion
- Exact Supabase client initialization approach (sync vs async — pick what works cleanly)
- Whether seed data is a standalone script or a service function
- Test strategy details (mock Supabase client in tests)
- Error message formatting for library endpoints

</decisions>

<specifics>
## Specific Ideas

- Seed prompts must be demo-quality — judges see these first. Pick inputs that produce dramatically different raw vs crafted results.
- The library is a "wow" feature for community aspect — keep it simple but functional.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `config.py`: Already has supabase_url, supabase_anon_key, supabase_service_key fields
- `backend/models/forge.py`: ForgeResponse with all fields — SavePromptRequest can extend/reference these
- `backend/db/supabase_client.py`: Empty file exists — ready for client singleton
- `backend/services/library_service.py`: Empty file exists — ready for library CRUD
- `backend/routers/library.py`: Empty file exists — ready for library endpoints

### Established Patterns
- Pydantic models in `backend/models/` — new models (SavePromptRequest, PromptSummary, PromptDetail) go here
- Services handle business logic, routers are thin (established in forge_service/forge router)
- Fire-and-forget background tasks pattern from `_log_forge_event`
- Config via `config.py` settings singleton — never os.getenv()

### Integration Points
- `forge_service._log_forge_event()` stub needs real Supabase insert (line 68-81)
- `main.py` needs library router registered: `app.include_router(library.router)`
- `supabase_client.py` provides client to both library_service and forge_service

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-supabase-community-library*
*Context gathered: 2026-03-14*
