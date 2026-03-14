---
phase: 06-anatomy-engine-display
plan: "01"
subsystem: anatomy-backend-frontend
tags: [anatomy, granite, color-coding, tooltips, quality-score]
key_files:
  created:
    - backend/prompts/analyze_anatomy.txt
    - backend/models/anatomy.py
    - backend/services/anatomy_service.py
    - backend/routers/anatomy.py
    - frontend/src/components/anatomy/AnatomyView.tsx
  modified:
    - backend/main.py
    - frontend/src/types/api.ts
    - frontend/src/lib/api.ts
    - frontend/src/components/forge/CraftedCard.tsx
metrics:
  completed_date: "2026-03-14"
  tasks_completed: 3
  files_changed: 9
---

# Phase 06 Plan 01: Anatomy Engine Display Summary

**One-liner:** Granite-powered anatomy parsing with 6 color-coded segments (role/context/constraints/output_format/quality_bar/task), hover tooltips explaining principles, quality score bar, and graceful JSON fallback.

## What Was Built

### Backend
- `analyze_anatomy.txt` prompt template instructs Granite to return JSON with segments, quality_score, missing_elements
- `anatomy_service.py` with `_parse_json_safe()` handles malformed output (markdown blocks, partial JSON)
- `_fallback_anatomy()` returns single "task" segment with score=20 when parsing fails
- POST /api/anatomy endpoint wired in main.py

### Frontend
- `AnatomyView` component renders color-coded segments: blue(role), emerald(context), purple(constraints), amber(output_format), rose(quality_bar), cyan(task)
- Hover tooltips explain each prompt engineering principle
- Quality score bar with color thresholds (green ≥80, amber ≥50, red <50)
- Missing elements shown as muted pills
- CraftedCard gains "Anatomy" toggle button — lazy-loads anatomy on first click via API
