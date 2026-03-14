# PromptForge

## What This Is

PromptForge is a web application that transforms rough ideas into expertly engineered one-shot prompts using IBM Granite, executes them, and shows a before/after comparison. It features a Prompt Anatomy Engine that visually deconstructs crafted prompts into color-coded structural building blocks with interactive toggles, and a Prompt X-Ray mode that reverse-engineers and upgrades any existing prompt. Includes a community library for saving and sharing prompts.

Built for GenAI Genesis 2026 hackathon. Team of 2. 36 hours.

## Core Value

AI that teaches you prompt engineering through live demonstration — in both directions: building expert prompts from scratch AND diagnosing/upgrading prompts you already have.

## Requirements

### Validated

- ✓ Backend project structure (FastAPI, routers, services, models) — existing
- ✓ Pydantic models defined (ForgeRequest, ForgeResponse, AnatomyElement, etc.) — existing
- ✓ Configuration management via pydantic-settings (config.py) — existing
- ✓ Frontend project structure (Next.js 14, TypeScript, Tailwind, shadcn/ui) — existing
- ✓ TypeScript types and API client defined (lib/types.ts, lib/api.ts) — existing
- ✓ Prompt template structure defined (backend/prompts/*.txt) — existing

### Active

- [ ] IBM watsonx.ai integration via granite_service.py (all 5+ Granite calls)
- [ ] Forge pipeline: detect category → craft prompt → parallel execute (crafted + raw) + anatomy parse
- [ ] Prompt Anatomy Engine: color-coded segments, tooltips, interactive toggles with live re-execution
- [ ] Prompt X-Ray mode: paste any prompt → diagnose missing elements → one-click upgrade → before/after
- [ ] Community prompt library: save, browse, upvote prompts via Supabase
- [ ] Three-column frontend: input | crafted prompt (typewriter + anatomy) | before/after results
- [ ] IBM API calls panel: per-call latency display for demo/judges
- [ ] Demo presets: one-click examples for vibe_coding, brainstorming, qa
- [ ] Supabase database schema (prompts table, forge_events table)
- [ ] Health endpoint and deployment readiness (Railway/Replit backend, Vercel frontend)

### Out of Scope

- Authentication/user accounts — not needed for hackathon demo
- Rate limiting — deploy-time concern, not demo-critical
- Real-time collaboration — too complex for 36-hour timeline
- Multi-model comparison — locked to IBM Granite only per prize rules
- Mobile native app — web-first, responsive is sufficient

## Context

- **Hackathon**: GenAI Genesis 2026, 36-hour build window, team of 2
- **Target prizes**: IBM Best AI Hack using IBM Technology (primary), Top 2 Teams (primary), Bitdeer Best Production-Ready Tool (secondary)
- **Core innovation**: Meta-prompting — IBM Granite acts as both the prompt engineer AND the executor. AI building prompts for AI.
- **Differentiator**: Prompt X-Ray mode — no other tool reverse-engineers existing prompts, diagnoses structural gaps, and upgrades them with one click
- **Existing code**: Backend structure and models defined, frontend types and API client defined. Services and components need full implementation.
- **AI pipeline**: 5 Granite calls per forge (category detect, craft, execute crafted, execute raw, parse anatomy). X-Ray adds 2-3 more (parse, diagnose gaps, upgrade, execute both).

## Constraints

- **AI Provider**: IBM watsonx.ai ONLY (ibm/granite-13b-instruct-v2) — prize requirement
- **Stack**: Next.js 14 + FastAPI + Supabase — locked, no alternatives
- **Timeline**: 36 hours total — must ship working demo
- **Team**: 2 people — scope must be achievable
- **Latency**: Granite inference 3-8s per call — pipeline must use asyncio.gather() for parallel calls
- **Architecture**: All AI calls through granite_service.py only, prompt templates in .txt files only, secrets via config.py only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| IBM Granite for all inference | Prize requirement — must use IBM technology exclusively | — Pending |
| Prompt X-Ray as differentiator | No other tool reverse-engineers prompts; expands audience from beginners to power users | — Pending |
| 5 parallel calls in forge (3A+3B+anatomy) | Minimize latency — parallel execution cuts wall time by ~60% | — Pending |
| Supabase for community library | Managed Postgres, fast setup, good for hackathon timeline | — Pending |
| Anatomy toggles trigger live re-execution | Teaching tool: users see cause-and-effect of prompt structure | — Pending |

---
*Last updated: 2026-03-13 after initialization*
