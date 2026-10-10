# PromptForge Academy

**A flight simulator for prompt engineering. You write the prompt, IBM Granite runs it against real test cases, and a Socratic Granite coach helps you fix it. It never writes the answer for you.**

## Why

Most "prompt tools" write the prompt for you. That makes people dependent, not skilled. PromptForge started out that way too (the original forge still lives in the Lab). The Academy flips it: the learner does the work, and the platform gives the kind of feedback a senior engineer would.

The core idea is that **a prompt is a program, so test it like one.** Every challenge is a small test suite:

| Piece | What it does |
|-------|--------------|
| **Template variables** | Learners write a reusable prompt with `{{placeholders}}`, the way production prompts are built |
| **Visible + hidden test cases** | The prompt runs against several inputs. Hidden ones stop learners from overfitting to the examples |
| **Deterministic checks** | Valid JSON, exact labels, word limits, bullet counts, Flesch-Kincaid reading level, leak and injection detection. These are reproducible, with no AI opinion involved |
| **Granite-as-judge** | Scores only the qualitative rubric that code can't check (faithfulness, tone) |
| **Socratic coach** | A three-level hint ladder: nudge → concept → pattern. It never hands over a full prompt |
| **Expert reference** | Unlocks after a pass or 3 attempts, so learners compare structure after they've struggled with it |

## Curriculum

| Track | Challenges |
|-------|-----------|
| **Foundations** | Specificity · Audience & role · Structured output (JSON) |
| **Steering the Model** | Few-shot examples · Explicit constraints · Step-by-step reasoning |
| **Trustworthy AI** | Grounding & fallbacks (RAG "NOT IN CONTEXT") · Delimiters & prompt-injection defense |
| **Capstone** | Meeting notes → action-item JSON (every technique combined) |

Challenges are **data, not code**: each one is a JSON file in `backend/curriculum/challenges/` holding a brief, a lesson, test cases, a rubric, three authored hints, and a reference solution. Every test case also carries a *golden output*, and the test suite checks that it passes its own checks. That way no challenge can ship impossible to pass, and a naive "Sure! Here's..." answer is checked to fail every challenge.

## How an attempt works

```
Learner prompt (with {{vars}})
        │
        ├─ validate: every challenge variable is used (instant 422 + explanation otherwise)
        │
        ├─ render once per test case ──► asyncio.gather(Granite × N)    ← one round trip
        │
        ├─ deterministic checks per output (grading_service, pure Python)
        │
        ├─ rubric? ──► 1 Granite-as-judge call (outputs delimited, injection-hardened)
        │
        └─ score = 75% checks + 25% judge → pass at 80 → ★ / ★★ (90+) / ★★★ (97+)
              └─ fire-and-forget attempt log to Supabase (learning analytics)

Coach (on demand): 1 Granite call → {diagnosis, hint, question}
                   falls back to authored hints if Granite fails or returns bad JSON
```

Learner prompts run through Granite's **chat endpoint** (its native instruction format), so they behave the way they would in a real watsonx.ai app. If a deployment doesn't expose chat for the model, `granite_service.chat` falls back to `generate_text` with Granite's chat template applied.

The app follows its own lessons: the judge and coach prompts wrap learner content in delimiters and tell the model to ignore any instructions inside.

## The Lab

The original PromptForge lives on at `/lab` as free practice. Forge turns a rough idea into a structured prompt and runs both versions side by side. X-Ray diagnoses an existing prompt. The community library is at `/library`.

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/tracks` | Curriculum with challenge summaries |
| `GET /api/challenges/{id}` | Brief, lesson, public test cases (hidden inputs and ids masked) |
| `POST /api/challenges/{id}/attempt` | Run and grade a prompt on Granite |
| `POST /api/coach` | Socratic hint, level 1-3 |
| `POST /api/techniques` | Static technique detection (no AI call), powers the live editor chips |
| `GET /api/challenges/{id}/solution` | Reference prompt |
| `GET /api/challenges/{id}/stats` | Community pass rate and average score |
| `POST /api/forge`, `/api/xray`, `/api/library` | Lab and library (unchanged) |

## Tech stack

- **AI**: IBM Cloud, IBM watsonx.ai, `ibm/granite-3-8b-instruct`
- **Backend**: FastAPI, Python 3.11, asyncio, `ibm-watsonx-ai` SDK
- **Frontend**: Next.js 14, TypeScript (strict), Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Railway / Replit (backend), Vercel (frontend)

## Prerequisites

- Node.js 20+
- Python 3.11+
- IBM watsonx.ai credentials
- Supabase project

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/promptforge-genesis.git
   cd promptforge-genesis
   ```

2. Set up the backend:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ```

4. Create `.env` in the project root with the required environment variables (see below).

5. Run `backend/db/schema.sql` in the Supabase Dashboard > SQL Editor (adds the `attempts` analytics table).

## Running locally

**Backend:**
```bash
source backend/venv/bin/activate
uvicorn backend.main:app --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WATSONX_API_KEY` | Yes | IBM watsonx.ai API key |
| `WATSONX_PROJECT_ID` | Yes | IBM watsonx.ai project ID |
| `WATSONX_URL` | No | IBM watsonx.ai endpoint (default: `https://us-south.ml.cloud.ibm.com`) |
| `WATSONX_MODEL_ID` | No | Granite model ID (default: `ibm/granite-3-8b-instruct`) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_API_URL` | No | Backend API URL (default: `http://localhost:8000`) |

## Running the tests

```bash
cd backend && source venv/bin/activate && cd .. && pytest backend/tests -q   # 100 tests
cd frontend && npx vitest run                                                # 31 tests
```

## Roadmap

- **Granite Guardian** as a second grader for the Trustworthy AI track (harm and jailbreak risk scores)
- **watsonx.governance** evaluation metrics alongside the deterministic checks
- **Model comparison**: run the same prompt on Granite 8B and a larger model to teach model selection and cost
- **Instructor mode**: author challenges in the UI, and use attempt analytics to spot where a cohort gets stuck
- **Accounts and cohorts** via Supabase Auth (progress is per-browser today)
