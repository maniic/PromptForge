---
name: promptforge-rules
---
Project: PromptForge — rough idea → IBM Granite → expert one-shot prompt → before/after comparison
Stack: Next.js 14 + FastAPI + IBM watsonx.ai only + Supabase
Deploy: Railway → Replit (backend) + Vercel (frontend)

Rules:
- ALL AI calls go through backend/services/granite_service.py
- Never suggest any AI provider other than IBM watsonx.ai
- Read CLAUDE.md before doing anything
- Prioritize demo reliability over feature completeness
- Never touch .env or docs/ (except handoff.md)