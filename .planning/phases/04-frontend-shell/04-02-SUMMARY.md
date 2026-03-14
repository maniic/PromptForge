---
phase: 04-frontend-shell
plan: "02"
subsystem: frontend-interactive
tags: [react, motion, ui, state-machine, hero-input]
dependency_graph:
  requires: ["04-01"]
  provides: ["hero-input-ui", "forge-state-machine", "magnetic-button", "loading-status"]
  affects: ["04-03"]
tech_stack:
  added: []
  patterns: ["motion AnimatePresence layout animation", "AbortController for request cancellation", "useMotionValue + useSpring for magnetic effect", "useEffect timeout cleanup pattern for status cycling"]
key_files:
  created:
    - frontend/src/components/shared/MagneticButton.tsx
    - frontend/src/components/shared/LoadingStatus.tsx
    - frontend/src/components/forge/HeroInput.tsx
    - frontend/src/components/forge/ForgeApp.tsx
  modified:
    - frontend/src/app/page.tsx
    - frontend/src/components/forge/ForgeApp.test.tsx
decisions:
  - "ForgeApp uses layoutId='input-container' for shared layout animation between hero and column-1 on done state"
  - "LoadingStatus uses default export to match pre-existing stub test import style"
  - "MagneticButton omits React drag event handlers from HTMLButtonAttributes spread to avoid motion type conflicts"
  - "ForgeApp state machine returns to idle on both cancel and error — lets user retry without page reload"
metrics:
  duration: "3 min"
  completed_date: "2026-03-14"
  tasks_completed: 2
  files_changed: 6
---

# Phase 04 Plan 02: Hero Input and ForgeApp State Machine Summary

**One-liner:** Spring-based magnetic hero input with 4-stage loading status cycler and idle/loading/done/error state machine wired to forgeApi() with AbortController cancellation.

## What Was Built

### MagneticButton (`frontend/src/components/shared/MagneticButton.tsx`)
Spring-based cursor-tracking button using `useMotionValue` + `useSpring` (damping: 10, stiffness: 150). Tracks cursor within 50px radius, shifts button position by `delta * 0.35`, springs back on mouse leave. Omits React drag event types to avoid motion.js type conflicts.

### LoadingStatus (`frontend/src/components/shared/LoadingStatus.tsx`)
Cycles through 4 status stages with cumulative setTimeout scheduling: "Detecting category..." (1200ms) → "Crafting expert prompt..." (2500ms) → "Executing with IBM Granite..." (3500ms) → "Almost there..." (Infinity). Uses `AnimatePresence mode="wait"` with fade-slide transitions keyed by `stageIdx`. Resets on `isLoading=false` via cleanup function.

### HeroInput (`frontend/src/components/forge/HeroInput.tsx`)
Centered hero landing with `react-textarea-autosize` (minRows=3, maxRows=8, maxLength=1000), glowing primary-color focus border, and Forge/Cancel button wrapped in MagneticButton. Forge disabled when input < 3 chars. Supports Cmd+Enter keyboard shortcut.

### ForgeApp (`frontend/src/components/forge/ForgeApp.tsx`)
Top-level state machine with `'idle' | 'loading' | 'done' | 'error'` states. Uses `AbortController` ref for cancellation. On success: sets result + transitions to 'done'. On AbortError: silently returns to idle. On other errors: `toast.error(formatApiError(err))` then idle. Layout animation via `layoutId="input-container"` shared between hero and column-1 card, with explicit `exit={{ x: -200, scale: 0.9, opacity: 0 }}` for hero shrink-left.

### page.tsx
Replaced placeholder heading with `<ForgeApp />` as sole content.

## Test Results

| Test File | Result | Tests |
|-----------|--------|-------|
| LoadingStatus.test.tsx | PASS | 2/2 |
| ForgeApp.test.tsx | PASS | 2/2 |

Note: ThreeColumnLayout.test.tsx fails with missing module error — this is a Plan 03 stub awaiting implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ForgeApp.test.tsx queryByText multi-match**
- **Found during:** Task 2 verification
- **Issue:** Pre-existing test used `queryByText(/forge/i)` which matched both "PromptForge" heading and "Forge" button, throwing a multiple-elements-found error
- **Fix:** Changed to `queryByRole('button', { name: /forge/i })` for precise element targeting
- **Files modified:** `frontend/src/components/forge/ForgeApp.test.tsx`
- **Commit:** a790b64

**2. [Rule 1 - Bug] Fixed MagneticButton TypeScript type conflict**
- **Found during:** Task 1 TypeScript check
- **Issue:** Spreading `React.ButtonHTMLAttributes` onto `motion.button` caused type conflict on `onDrag` — React's `DragEventHandler` is incompatible with motion's PanInfo-based handler
- **Fix:** Omit drag-related event handlers from the spread type using `Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | ...>`
- **Files modified:** `frontend/src/components/shared/MagneticButton.tsx`
- **Commit:** 7970270

**3. [Rule 2 - Missing export] Added default export to LoadingStatus**
- **Found during:** Task 1 verification
- **Issue:** Pre-existing stub test used `import LoadingStatus from '@/components/shared/LoadingStatus'` (default import), but component used named export only
- **Fix:** Changed `export function` to `export default function` to match existing test import pattern
- **Files modified:** `frontend/src/components/shared/LoadingStatus.tsx`
- **Commit:** 7970270

## Self-Check: PASSED

All created files confirmed present on disk. All task commits (7970270, a790b64) verified in git log.
