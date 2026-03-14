---
phase: 09-deployment-demo-prep
plan: "01"
subsystem: deployment
tags: [vercel, railway, replit, docker, deployment]
key_files:
  created:
    - vercel.json
    - Dockerfile
    - Procfile
    - railway.json
    - .replit
metrics:
  completed_date: "2026-03-14"
  tasks_completed: 1
  files_changed: 5
---

# Phase 09 Plan 01: Deployment + Demo Prep Summary

**One-liner:** Vercel config for frontend, Dockerfile + Railway config for backend, Replit fallback config, and Procfile for flexible hosting.

## What Was Built

### Frontend Deployment (Vercel)
- `vercel.json` with Next.js framework, build/install commands pointing to `frontend/` subdirectory

### Backend Deployment (Railway primary, Replit fallback)
- `Dockerfile` at project root: Python 3.11-slim, copies backend package, runs uvicorn on port 8000
- `railway.json` with Dockerfile builder, health check on `/health` with 30s timeout, restart policy
- `Procfile` for Heroku-compatible platforms
- `.replit` for Replit deployment fallback

### Environment Variables Required
All secrets configured as env vars on deployment platform:
- WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
- NEXT_PUBLIC_API_URL (set to deployed backend URL on Vercel)
