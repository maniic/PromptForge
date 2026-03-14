# Codebase Structure

**Analysis Date:** 2026-03-13

## Directory Layout

```
promptforge-genesis/
├── backend/                    # FastAPI Python backend (port 8000)
│   ├── main.py                 # FastAPI app entry point, middleware setup
│   ├── config.py               # Pydantic BaseSettings, environment binding
│   ├── requirements.txt         # Python dependencies (FastAPI, ibm-watsonx-ai, supabase, pydantic)
│   ├── routers/                # HTTP endpoint definitions
│   │   ├── __init__.py
│   │   ├── forge.py            # POST /api/forge endpoint
│   │   ├── library.py          # GET /api/library, library CRUD endpoints
│   │   └── health.py           # GET /health endpoint
│   ├── services/               # Business logic orchestration
│   │   ├── __init__.py
│   │   ├── granite_service.py  # IBM Granite AI calls (singleton, all AI here)
│   │   ├── forge_service.py    # Forge pipeline: detect → craft → execute
│   │   └── library_service.py  # Community library CRUD
│   ├── models/                 # Pydantic schemas and validation
│   │   ├── __init__.py
│   │   └── forge.py            # ForgeRequest, ForgeResponse, Category enum
│   ├── db/                     # Database clients
│   │   ├── __init__.py
│   │   └── supabase_client.py  # Supabase async client initialization
│   ├── prompts/                # AI prompt templates (NEVER hardcoded in Python)
│   │   ├── detect_category.txt # Granite prompt for category detection
│   │   ├── craft_vibe_coding.txt
│   │   ├── craft_brainstorming.txt
│   │   └── craft_qa.txt
│   └── tests/                  # Pytest test suite
│       ├── conftest.py         # Pytest fixtures (mocked Granite, Supabase)
│       ├── test_forge.py       # Tests for forge pipeline
│       └── test_granite.py     # Tests for granite_service
│
├── frontend/                   # Next.js 14 React frontend (port 3000)
│   ├── package.json            # Dependencies, scripts
│   ├── tsconfig.json           # TypeScript strict mode
│   ├── next.config.js          # Next.js configuration
│   ├── tailwind.config.ts      # Tailwind CSS setup
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── page.tsx        # Main /forge page (three-column: input | crafted | before/after)
│   │   ├── components/         # React components
│   │   │   ├── ForgeInput.tsx
│   │   │   ├── CraftedPrompt.tsx
│   │   │   ├── BeforeAfterPanel.tsx
│   │   │   └── (...shadcn/ui components)
│   │   ├── lib/                # Utilities
│   │   │   └── api-client.ts   # Fetch wrapper for backend API
│   │   └── styles/             # Global CSS/Tailwind
│   └── tests/                  # Frontend tests (Jest or Vitest)
│
├── docs/                       # Documentation (do not modify except handoff.md)
│   ├── spec.md                 # Feature specification
│   ├── acceptance.md           # Acceptance criteria
│   └── handoff.md              # Handoff notes (ok to update)
│
├── .planning/codebase/         # This analysis output
│   ├── ARCHITECTURE.md
│   ├── STRUCTURE.md
│   └── (CONVENTIONS.md, TESTING.md, etc. added by other mappers)
│
├── CLAUDE.md                   # Operating rules (NEVER modify)
├── AGENTS.md                   # Agent workflow definitions
├── README.md                   # Project overview
├── .env                        # Environment secrets (NEVER commit)
├── .env.example                # Example env template
├── .gitignore                  # Git ignore patterns
└── requirements.txt            # Top-level project info (optional)
```

## Directory Purposes

**backend/:**
- Purpose: FastAPI REST API server, handles all forge pipeline logic and library operations
- Contains: Python modules, routers, services, models, database clients
- Key files: `backend/main.py` (entry), `backend/config.py` (settings)

**backend/routers/:**
- Purpose: HTTP endpoint definitions (FastAPI route handlers)
- Contains: Route decorators (@router.post, @router.get), request validation, response formatting
- Key files: `backend/routers/forge.py` (main endpoint), `backend/routers/library.py`, `backend/routers/health.py`

**backend/services/:**
- Purpose: Business logic and external service orchestration
- Contains: Pipeline functions, Granite client, library CRUD, Supabase operations
- Key files: `backend/services/granite_service.py` (AI-only), `backend/services/forge_service.py` (orchestration)

**backend/models/:**
- Purpose: Pydantic validation schemas for requests/responses
- Contains: ForgeRequest, ForgeResponse, Category enum, data classes
- Key files: `backend/models/forge.py` (all schemas)

**backend/db/:**
- Purpose: Database client initialization and connection management
- Contains: Supabase async client setup
- Key files: `backend/db/supabase_client.py` (Supabase connection)

**backend/prompts/:**
- Purpose: External AI prompt templates (static text files)
- Contains: Plain text prompts loaded by forge_service at runtime
- Key files: `backend/prompts/detect_category.txt`, `backend/prompts/craft_{category}.txt`

**backend/tests/:**
- Purpose: Pytest unit and integration tests
- Contains: Test functions, fixtures, mocks
- Key files: `backend/tests/conftest.py` (fixtures), `backend/tests/test_forge.py`, `backend/tests/test_granite.py`

**frontend/:**
- Purpose: Next.js React application (user interface)
- Contains: React components, pages, API client
- Key files: `frontend/src/app/page.tsx` (main three-column view)

**frontend/src/app/:**
- Purpose: Next.js App Router pages
- Contains: Root layout, main forge page
- Key files: `frontend/src/app/page.tsx` (main UI)

**frontend/src/components/:**
- Purpose: Reusable React UI components
- Contains: shadcn/ui components, custom components for forge UI
- Key files: ForgeInput, CraftedPrompt, BeforeAfterPanel

**docs/:**
- Purpose: Project documentation
- Contains: Feature spec, acceptance criteria, handoff notes
- Key files: `docs/spec.md` (read-only), `docs/handoff.md` (ok to update)

**.planning/codebase/:**
- Purpose: Generated codebase analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, etc.
- Key files: Auto-generated by `/gsd:map-codebase` command

## Key File Locations

**Entry Points:**
- `backend/main.py`: FastAPI app initialization, middleware (CORS, logging), route registration
- `frontend/src/app/page.tsx`: Root React component, three-column layout

**Configuration:**
- `backend/config.py`: All environment settings via Pydantic BaseSettings
- `backend/.env`: Runtime environment variables (NEVER commit)
- `frontend/next.config.js`: Next.js build/runtime configuration

**Core Logic:**
- `backend/services/forge_service.py`: Forge pipeline orchestration (detect → craft → execute)
- `backend/services/granite_service.py`: All IBM Granite API calls (ONLY place AI is called)
- `backend/services/library_service.py`: Community prompt library CRUD
- `backend/models/forge.py`: Pydantic request/response models

**Routing:**
- `backend/routers/forge.py`: POST /api/forge handler
- `backend/routers/library.py`: GET /api/library, POST/DELETE library endpoints
- `backend/routers/health.py`: GET /health handler

**Testing:**
- `backend/tests/conftest.py`: Pytest fixtures (mocked services)
- `backend/tests/test_forge.py`: Forge pipeline tests
- `backend/tests/test_granite.py`: Granite service tests

**Prompts:**
- `backend/prompts/detect_category.txt`: Granite prompt for category detection (vibe_coding/brainstorming/qa)
- `backend/prompts/craft_vibe_coding.txt`: Expert prompt crafting for vibe_coding category
- `backend/prompts/craft_brainstorming.txt`: Expert prompt crafting for brainstorming category
- `backend/prompts/craft_qa.txt`: Expert prompt crafting for qa category

## Naming Conventions

**Files:**
- Routers: `{domain}.py` (e.g., forge.py, library.py, health.py)
- Services: `{domain}_service.py` (e.g., forge_service.py, granite_service.py)
- Models: `{domain}.py` or single `forge.py` for all schemas
- Tests: `test_{module}.py` (e.g., test_forge.py, test_granite.py)
- Prompts: `{action}_{category}.txt` (e.g., detect_category.txt, craft_vibe_coding.txt)

**Directories:**
- Plurals for collections: routers/, services/, models/, prompts/, tests/
- Singular for feature domains: db/ (single client pattern)

**Python Modules:**
- snake_case for file names and function names
- PascalCase for class names (Pydantic models, service classes)
- SCREAMING_SNAKE_CASE for constants

**TypeScript/React Files:**
- PascalCase for component files: ForgeInput.tsx, CraftedPrompt.tsx
- camelCase for utility files: api-client.ts

## Where to Add New Code

**New Feature:**
- Primary code: `backend/services/{feature}_service.py` (business logic)
- Router: `backend/routers/{feature}.py` (HTTP endpoints)
- Models: Add to `backend/models/forge.py` (or split if needed)
- Tests: `backend/tests/test_{feature}.py`

**New Component/Module:**
- Implementation: `backend/services/{name}_service.py` for logic
- Database ops: `backend/db/{name}_client.py` if accessing new data source
- Frontend component: `frontend/src/components/{Name}.tsx` (PascalCase)
- Frontend page: `frontend/src/app/{route}/page.tsx` (Next.js App Router)

**Utilities:**
- Shared backend helpers: `backend/services/utils.py` or dedicated module
- Shared frontend helpers: `frontend/src/lib/{name}.ts` (camelCase)

**Prompt Templates:**
- New category: `backend/prompts/detect_{new_category}.txt` or add category to detect_category.txt
- Craft template: `backend/prompts/craft_{category}.txt`
- NEVER hardcode prompts in Python files

**Tests:**
- Unit tests: Same directory as source or `backend/tests/test_{module}.py`
- Fixtures: `backend/tests/conftest.py` (shared fixtures) or inline in test file
- Mocks: Use pytest-mock, unittest.mock, or dependency injection

## Special Directories

**backend/prompts/:**
- Purpose: Static prompt templates for Granite
- Generated: No (manually authored)
- Committed: Yes (part of codebase)
- Accessed: Loaded by forge_service.py at runtime (not baked into Python)

**.planning/codebase/:**
- Purpose: Generated analysis documents
- Generated: Yes (by `/gsd:map-codebase` commands)
- Committed: Yes (reference docs for future Claude instances)

**frontend/public/:**
- Purpose: Static assets (images, favicons)
- Generated: No (manually maintained)
- Committed: Yes

**backend/__pycache__/, .pytest_cache/, node_modules/:**
- Purpose: Build artifacts and dependencies
- Generated: Yes (auto-generated)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-03-13*
