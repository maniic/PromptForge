# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- TypeScript - Frontend (Next.js 14 with strict mode)
- Python 3.11 - Backend (FastAPI services)

**Secondary:**
- JavaScript/JSX - React components (via TypeScript/TSX)

## Runtime

**Environment:**
- Node.js - Frontend runtime (Next.js 14 engine)
- Python 3.11 - Backend runtime with uvicorn ASGI server

**Package Manager:**
- npm - Frontend dependencies
- pip - Python dependencies (virtual environment via venv)

## Frameworks

**Core:**
- Next.js 14 - Full-stack React framework with API routes
- FastAPI - Async Python web framework for backend API
- asyncio - Python async/await concurrency (critical for parallel Granite calls)

**UI:**
- React (via Next.js) - Component rendering
- Tailwind CSS - Utility-first CSS styling
- shadcn/ui - Component library built on Headless UI

**Testing:**
- pytest - Python testing framework for backend (`backend/requirements.txt` references it implicitly)

**Development:**
- TypeScript - Type checking for frontend
- uvicorn - ASGI server for FastAPI development (`--reload --port 8000`)

## Key Dependencies

**Backend (backend/requirements.txt):**
- FastAPI - Web framework
- pydantic & pydantic-settings - Data validation and configuration management (`BaseSettings` in `backend/config.py`)
- httpx or requests - HTTP client for IBM watsonx.ai API calls
- python-supabase - Supabase client for community library database operations
- asyncio - Async task management (built-in Python standard library)

**Frontend (frontend/package.json):**
- next - Next.js 14 core
- react & react-dom - React framework
- typescript - TypeScript support
- tailwindcss - CSS framework
- Other standard Next.js ecosystem packages (next-auth if auth needed, etc.)
- shadcn/ui - Pre-built Tailwind components

**AI/External:**
- IBM watsonx.ai SDK (Python client for watsonx API calls)

## Configuration

**Environment:**
- `.env` file (not committed, secrets stored here)
- `.env.example` - Template showing required variables
- `backend/config.py` - Pydantic BaseSettings loading from `.env` with structured configuration:
  - `watsonx_api_key`, `watsonx_project_id`, `watsonx_url`, `watsonx_model_id`
  - `supabase_url`, `supabase_anon_key`, `supabase_service_key`
  - `next_public_api_url` (frontend can access this)
  - `environment` (development/production)
  - `max_tokens_craft`, `max_tokens_execute` (tuning parameters)
  - `log_level`

**Build:**
- No explicit build config files detected (Next.js uses defaults)
- Backend uses standard FastAPI/uvicorn configuration

## Platform Requirements

**Development:**
- Python 3.11 with venv
- Node.js (compatible with Next.js 14, typically 18.17+)
- Virtual environment activation: `source venv/bin/activate`

**Production:**
- Frontend: Vercel (Next.js deployment target via CLAUDE.md)
- Backend: Railway → Replit (Python/FastAPI deployment)
- Database: Supabase (PostgreSQL-compatible cloud)
- AI Provider: IBM watsonx.ai (cloud hosted)

## Deployment Stack

- Frontend deployment: Vercel (git-based, automatic builds)
- Backend deployment: Railway (primary), Replit (fallback)
- Database: Supabase (managed PostgreSQL)
- API versioning: Single `/api/` namespace (health, forge, library endpoints)

## API Server Details

**Development:**
```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000
```

**Entry Point:** `backend/main.py` (FastAPI application)

**Async Support:** asyncio.gather() used for parallel Granite calls (concurrent execution of calls 3A and 3B per pipeline)

---

*Stack analysis: 2026-03-13*
