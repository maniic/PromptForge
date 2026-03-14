# PromptForge

**IBM Granite turns any rough idea into a perfectly engineered one-shot prompt — then proves it with a live before/after comparison.**

## What it does

PromptForge takes a vague idea ("make me a habit tracker app"), uses IBM Granite to craft a structured expert prompt, then executes both the raw input and the crafted prompt side-by-side. You see the difference instantly — same model, dramatically different output.

## The meta-prompting architecture

The forge pipeline makes **4 IBM Granite calls** per request:

1. **Detect category** — classify the input as vibe_coding, brainstorming, qa, or one_shot
2. **Craft expert prompt** — generate a structured 200-400 word prompt with role, context, constraints, output format, quality bar, and task
3. **Execute crafted** + **Execute raw** — run both prompts simultaneously via `asyncio.gather()`, proving the crafted version produces dramatically better output

IBM Granite engineers prompts for IBM Granite.

## The Prompt Anatomy Engine

After forging, click "Anatomy" to see the crafted prompt parsed into 6 color-coded structural segments: Role, Context, Constraints, Output Format, Quality Bar, and Task. Toggle any segment off to see how output quality degrades in real-time — teaching users which prompt elements matter most.

## The Prompt X-Ray

Paste any existing prompt into X-Ray mode. Granite diagnoses what's missing, generates an upgraded version, and executes both side-by-side. See exactly how adding structure transforms output quality.

## Community Library

Save your best forged prompts to the community library. Browse by category, upvote the best ones, and reuse any prompt with one click — it pre-fills and auto-forges when you click "Use this prompt."

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

5. Run the Supabase schema migration in your Supabase Dashboard > SQL Editor:
   ```sql
   -- See backend/db/schema.sql for the full schema
   ```

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

## Demo walkthrough

1. **Open** http://localhost:3000
2. **Click** the "Vibe Code" preset button — it fills in a coding task
3. **Click** "Forge" — watch the 4-stage loading animation
4. **See the results** — three columns appear:
   - Left: your original input
   - Center: the crafted expert prompt (types out character-by-character)
   - Right: before/after comparison showing the dramatic quality difference
5. **Click "Anatomy"** on the center card — see the prompt parsed into color-coded segments
6. **Toggle a segment off** — watch the output degrade in real-time
7. **Click "Save"** — save your prompt to the community library
8. **Visit /library** — browse, filter by category, upvote, or click "Use this" to re-forge
9. **Try X-Ray mode** — paste any bad prompt, get a diagnosis and upgraded version

## Live demo

[LIVE URL — to be filled in after deployment]
