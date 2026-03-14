# PromptForge — Claude Code operating rules
# GenAI Genesis 2026 | Team of 2

## What this is
Transforms rough ideas into expert one-shot prompts using IBM Granite,
executes them, shows before/after comparison. Community prompt library.
Target prizes: IBM watsonx.ai prize, Top 2 Teams, Bitdeer.

## Stack (LOCKED — never suggest alternatives)
- Frontend: Next.js 14, TypeScript strict, Tailwind CSS, shadcn/ui
- Backend: FastAPI, Python 3.11, asyncio
- AI: IBM watsonx.ai ONLY (ibm/granite-3.1-8b-instruct)
- DB: Supabase (community prompt library)
- Deploy: Railway → Replit (backend), Vercel (frontend)

## Commands
dev_frontend:  cd frontend && npm run dev
dev_backend:   cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000
test:          cd backend && source venv/bin/activate && pytest -v
lint:          cd frontend && npx tsc --noEmit && npm run lint
build:         cd frontend && npm run build

## Architecture rules — NEVER violate
1. ALL AI calls go through backend/services/granite_service.py only
2. The pipeline makes EXACTLY 4 Granite calls per /api/forge request
3. Calls 3A (crafted) and 3B (raw) MUST run via asyncio.gather() simultaneously
4. Never call any AI provider other than IBM watsonx.ai
5. Prompt templates in backend/prompts/*.txt — never hardcoded in Python files
6. Community library ops via library_service.py only
7. All secrets from config.py settings — never os.getenv() directly in services

## Core pipeline (always this order, never skip steps)
1. Validate ForgeRequest (Pydantic — raise 422 on invalid)
2. Granite Call 1: detect category → vibe_coding / brainstorming / qa
3. Load backend/prompts/craft_{category}.txt template
4. Granite Call 2: craft expert prompt (200-400 words out)
5. asyncio.gather(execute_prompt(crafted), execute_prompt(raw_input))
6. Supabase: log forge_event (async, never fail the request if this fails)
7. Return ForgeResponse with all fields populated

## Demo-critical paths (must work flawlessly)
POST /api/forge → ForgeResponse with visible before/after difference
GET /api/library → array of community prompts
GET /health → {"status":"ok"}
Frontend three-column: input | crafted prompt typewriter | before/after panels

## Context rules
- /compact at 50% context usage
- /clear between unrelated tasks
- One task per session
- Run /lint-check after every file change

## NEVER touch
.env, docs/ except handoff.md, this CLAUDE.md