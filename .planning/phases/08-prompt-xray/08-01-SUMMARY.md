---
phase: 08-prompt-xray
plan: "01"
subsystem: xray-backend-frontend
tags: [xray, diagnosis, upgrade, comparison]
key_files:
  created:
    - backend/prompts/diagnose_prompt.txt
    - backend/prompts/upgrade_prompt.txt
    - frontend/src/components/xray/XRayMode.tsx
  modified:
    - backend/services/anatomy_service.py
    - backend/routers/anatomy.py
    - frontend/src/components/forge/ForgeApp.tsx
    - frontend/src/types/api.ts
    - frontend/src/lib/api.ts
metrics:
  completed_date: "2026-03-14"
  tasks_completed: 3
  files_changed: 8
---

# Phase 08 Plan 01: Prompt X-Ray Summary

**One-liner:** Full X-Ray pipeline: paste any prompt → Granite diagnoses missing elements → auto-upgrades with missing structure → executes both → side-by-side comparison.

## What Was Built

### Backend Pipeline
- `diagnose_prompt.txt` template: identifies segments + missing elements with explanations
- `upgrade_prompt.txt` template: adds missing elements while preserving original text
- `upgrade_and_compare()` in anatomy_service: diagnose → upgrade → parallel execute both → return comparison
- POST /api/xray endpoint returns XRayResponse (diagnosis + upgraded_prompt + both results)

### Frontend X-Ray Mode
- `XRayMode` component with idle/loading/done state machine
- Input: textarea with 2000 char limit and count indicator
- Results: two-column layout — left (diagnosis + explanations), right (upgraded prompt + comparison)
- Diagnosis shows AnatomyView with quality score + missing element explanations
- Violet theme differentiates X-Ray from red Forge theme

### Navigation
- ForgeApp gains `mode: 'forge' | 'xray'` state
- X-Ray link below hero input on idle screen
- X-Ray button in floating top bar during results state
- "Back to Forge" button in X-Ray mode
