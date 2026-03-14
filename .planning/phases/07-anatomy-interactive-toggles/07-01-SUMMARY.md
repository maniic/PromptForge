---
phase: 07-anatomy-interactive-toggles
plan: "01"
subsystem: anatomy-toggles
tags: [toggles, debounce, re-execution, degraded-output]
key_files:
  modified:
    - frontend/src/components/forge/CraftedCard.tsx
    - frontend/src/components/forge/ResultCard.tsx
    - frontend/src/components/forge/ThreeColumnLayout.tsx
    - frontend/src/components/anatomy/AnatomyView.tsx
    - backend/routers/anatomy.py
metrics:
  completed_date: "2026-03-14"
  tasks_completed: 2
  files_changed: 5
---

# Phase 07 Plan 01: Anatomy Interactive Toggles Summary

**One-liner:** ON/OFF pill toggles on each anatomy segment with 300ms debounced re-execution — toggling removes segment text, executes degraded prompt via POST /api/re-execute, and shows degraded result in amber panel.

## What Was Built

### Toggle Interaction (CraftedCard + AnatomyView)
- Each segment shows ON/OFF pill toggle when `enableToggles=true`
- `disabledTypes` Set tracks which types are off
- 300ms debounce via `useRef<setTimeout>` coalesces rapid toggles into single re-execution

### Re-execution Flow
- CraftedCard builds degraded prompt by filtering out disabled segment text
- Calls `reExecuteApi(degradedPrompt, disabledSegments)`
- POST /api/re-execute endpoint delegates to `anatomy_service.re_execute_without_segments()`
- `onDegradedResult` callback passes result up to ThreeColumnLayout → ResultCard

### Degraded Result Display (ResultCard)
- New amber-colored "Degraded (Segments Removed)" panel appears when `degradedResult` prop is non-null
- Visually distinct from raw and crafted results
- Disappears when all segments re-enabled (disabledTypes empty)
