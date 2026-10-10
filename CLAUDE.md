# PromptForge Academy — Claude Code operating rules

## What this is
A flight simulator for prompt engineering. Learners write their own prompts;
IBM Granite runs them against challenge test suites (visible + hidden test
cases), deterministic checks grade every output, Granite-as-judge scores the
qualitative rubric, and a Socratic Granite coach gives escalating hints —
never the answer. The original forge / X-Ray tools live on at /lab.

## Stack
- Frontend: Next.js 14 (app router), TypeScript strict, Tailwind CSS, shadcn/ui
- Backend: FastAPI, Python 3.11, asyncio
- AI: IBM watsonx.ai only (Granite; model id from WATSONX_MODEL_ID)
- DB: Supabase (attempt analytics, community library)
- Deploy: Railway / Replit (backend), Vercel (frontend)

## Commands (run from repo root unless noted)
dev_backend:   source backend/venv/bin/activate && uvicorn backend.main:app --reload --port 8000
dev_frontend:  cd frontend && npm run dev
test_backend:  source backend/venv/bin/activate && pytest backend/tests -q
test_frontend: cd frontend && npx vitest run
typecheck:     cd frontend && npx tsc --noEmit
build:         cd frontend && npm run build
Note: `npm run lint` is broken (eslint.config.mjs needs ESLint 9; ESLint 8 is installed).

## Architecture rules
1. All AI calls go through backend/services/granite_service.py
   (`chat` for learner prompts, judge, and coach; `generate_text` for legacy Lab paths)
2. IBM watsonx.ai is the only AI provider
3. Independent Granite calls run concurrently via asyncio.gather()
   (e.g. every test case in an attempt — one round trip regardless of N)
4. LLM prompt text lives in backend/prompts/*.txt, never hardcoded in Python
5. Challenges are data: backend/curriculum/challenges/*.json + tracks.json.
   Adding or editing a lesson must not require Python changes
6. Grading is deterministic first (grading_service.py, pure functions);
   the Granite judge only scores rubric criteria code can't check
7. Never leak hidden test inputs, hidden test ids, golden outputs, or the
   reference prompt through public endpoints (curriculum_service.public_detail)
8. Any prompt that embeds learner text (judge, coach) must delimit it and
   instruct the model to ignore instructions inside it
9. Analytics/logging to Supabase is fire-and-forget and must never fail a request
10. All secrets via backend/config.py settings — never os.getenv() in services

## Attempt pipeline (learn_service.run_attempt)
1. Validate AttemptRequest; 422 if the prompt omits any challenge {{variable}}
2. Render prompt per test case → asyncio.gather(chat × N)
3. Grade each output with the test case's checks
4. If the challenge has a rubric: one judge call (failure → score on checks only)
5. score = 75% checks + 25% judge; pass at challenge.pass_score; stars at 90 / 97
6. Background-log the attempt; return AttemptResponse

## Adding a challenge
- Every test case needs a `golden_output` that passes all its checks
- At least one visible and one hidden test case; exactly 3 authored hints
- starter_prompt and reference_prompt must use every variable
- tests/test_academy.py enforces all of the above plus "a chatty naive answer fails"

## Demo-critical paths
GET  /health → {"status":"ok"}
GET  /api/tracks, GET /api/challenges/{id}
POST /api/challenges/{id}/attempt → graded AttemptResponse
POST /api/coach → hint (falls back to authored hints if Granite fails)
Frontend: / (Academy) → /challenge/[id] workspace; /lab; /library

## Never touch
.env
