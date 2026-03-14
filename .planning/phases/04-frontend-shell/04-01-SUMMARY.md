---
phase: 04-frontend-shell
plan: 01
subsystem: ui
tags: [nextjs, tailwind, shadcn, typescript, next-themes, sonner, vitest]

# Dependency graph
requires: []
provides:
  - Next.js 14 frontend project scaffold with TypeScript strict mode
  - Tailwind v3 dark theme with cool (blue/cyan) and warm (amber/gold) CSS variable themes
  - Dot-grid animated background with radial mask fade
  - Typed API client (forgeApi, ApiError, formatApiError) targeting backend /api/forge
  - TypeScript interfaces matching backend Pydantic ForgeRequest/ForgeResponse models
  - Sonner toast infrastructure mounted at top-right with 5s auto-dismiss
  - next-themes ThemeProvider with cool/warm class-based switching
affects: [04-02, 04-03]

# Tech tracking
tech-stack:
  added:
    - next@14.2.35 (downgraded from create-next-app default of 16)
    - react@18, react-dom@18
    - tailwindcss@3.4 (downgraded from v4 for shadcn compatibility)
    - shadcn/ui (new-york style, slate base, CSS variables)
    - next-themes@0.4.6
    - sonner@2.0.7
    - motion@12 (framer-motion successor)
    - react-textarea-autosize@8
    - vitest@4, @testing-library/react@16, jsdom@28
  patterns:
    - CSS custom properties with hsl() for theme switching (--background, --primary, etc.)
    - .cool and .warm selectors override --dot-color and primary palette
    - API_BASE from NEXT_PUBLIC_API_URL env var with fallback
    - ApiError class extends Error with status + detail fields
    - ThemeProvider wraps entire app, DotGridBackground sits at z-0 behind content

key-files:
  created:
    - frontend/src/types/api.ts
    - frontend/src/lib/api.ts
    - frontend/src/components/layout/ThemeProvider.tsx
    - frontend/src/components/layout/DotGridBackground.tsx
    - frontend/.env.local
    - frontend/tailwind.config.ts
    - frontend/next.config.mjs
  modified:
    - frontend/src/app/globals.css
    - frontend/src/app/layout.tsx
    - frontend/src/app/page.tsx
    - frontend/package.json
    - frontend/components.json
    - frontend/postcss.config.mjs

key-decisions:
  - "create-next-app v16 installed Next.js 16 + Tailwind v4; manually downgraded to Next.js 14 + Tailwind v3 (shadcn requires v3)"
  - "next.config.ts renamed to next.config.mjs — Next.js 14 does not support .ts config extension"
  - "remove frontend/.git nested repo created by create-next-app to allow parent repo tracking"
  - "next-themes ThemeProviderProps imported from 'next-themes' not 'next-themes/dist/types' (updated path in v0.4)"
  - "ThemeProvider uses attribute=class to match tailwindcss darkMode: ['class'] setting"
  - "globals.css uses Tailwind v3 directives (@tailwind base/components/utilities) not v4 @import syntax"

patterns-established:
  - "API_BASE from NEXT_PUBLIC_API_URL with http://localhost:8000 fallback — never hardcode URL"
  - "forgeApi() accepts optional AbortSignal for request cancellation"
  - "formatApiError() maps 422/502 to human-readable messages, falls back gracefully"
  - "suppressHydrationWarning on <html> prevents next-themes flash"

requirements-completed:
  - UX-07

# Metrics
duration: 7min
completed: 2026-03-14
---

# Phase 4 Plan 01: Frontend Shell Bootstrap Summary

**Next.js 14 project with Tailwind v3, shadcn/ui, cool/warm dark themes, dot-grid background, typed API client, and Sonner toast infrastructure**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-14T18:12:37Z
- **Completed:** 2026-03-14T18:19:44Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments

- Bootstrapped Next.js 14 with TypeScript strict, Tailwind v3, shadcn/ui (new-york style) — build passes
- Created cool/warm dark theme system with CSS custom properties and dot-grid background
- Implemented typed API client (`forgeApi`, `ApiError`, `formatApiError`) targeting backend at `NEXT_PUBLIC_API_URL`
- Mounted Sonner Toaster at top-right with 5s auto-dismiss and max 3 visible toasts

## Task Commits

1. **Task 1: Bootstrap Next.js project with all dependencies** - `0d2c986` (chore)
2. **Task 2: Theme system, API client, types, dot-grid background, and layout** - `8ea0070` (feat)

## Files Created/Modified

- `frontend/src/types/api.ts` - ForgeRequest, CallTiming, ForgeResponse interfaces mirroring backend Pydantic models
- `frontend/src/lib/api.ts` - forgeApi() POST client, ApiError class with status/detail, formatApiError() with 422/502 messages
- `frontend/src/components/layout/ThemeProvider.tsx` - next-themes wrapper with cool/warm themes, defaultTheme=cool
- `frontend/src/components/layout/DotGridBackground.tsx` - Fixed full-screen dot-grid with pointer-events-none z-0
- `frontend/src/app/globals.css` - Tailwind v3 directives, HSL CSS vars, .cool/.warm selectors, .dot-grid-bg class
- `frontend/src/app/layout.tsx` - Root layout with ThemeProvider, DotGridBackground, Toaster, suppressHydrationWarning
- `frontend/src/app/page.tsx` - Minimal PromptForge placeholder (Plan 02 will replace with ForgeApp)
- `frontend/package.json` - Next.js 14, React 18, Tailwind v3, shadcn deps, testing deps
- `frontend/tailwind.config.ts` - darkMode: ['class'], shadcn CSS var colors, tailwindcss-animate plugin
- `frontend/next.config.mjs` - Plain JS config (renamed from .ts)
- `frontend/postcss.config.mjs` - tailwindcss + autoprefixer (Tailwind v3 setup)
- `frontend/components.json` - shadcn config: new-york style, slate base, CSS variables

## Decisions Made

- create-next-app default (v16 + Tailwind v4) was incompatible with shadcn; downgraded Next.js → 14 and Tailwind → v3
- `next.config.ts` renamed to `next.config.mjs` since Next.js 14 doesn't support TypeScript config files
- Removed nested `frontend/.git` created by `create-next-app` to allow parent repo to track frontend files
- `ThemeProviderProps` imported from `next-themes` (not `next-themes/dist/types`) for v0.4 compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] next.config.ts unsupported in Next.js 14**
- **Found during:** Task 1 (bootstrap verification via npm run build)
- **Issue:** `create-next-app` generated `next.config.ts`; Next.js 14 only supports `.js` or `.mjs`
- **Fix:** Renamed to `next.config.mjs` and converted TypeScript type annotation to JSDoc
- **Files modified:** frontend/next.config.mjs
- **Verification:** `npm run build` passes
- **Committed in:** 0d2c986 (Task 1 commit)

**2. [Rule 3 - Blocking] Nested frontend/.git blocked parent repo tracking**
- **Found during:** Task 1 (git add failed silently for all frontend files)
- **Issue:** `create-next-app` initialized a separate git repo inside `frontend/`; parent repo saw it as a submodule and refused to stage files
- **Fix:** Removed `frontend/.git` directory
- **Files modified:** N/A (repo structure fix)
- **Verification:** git add frontend/package.json succeeded after removal
- **Committed in:** 0d2c986 (Task 1 commit)

**3. [Rule 3 - Blocking] Tailwind v4 postcss config incompatible with downgraded v3**
- **Found during:** Task 1 (build attempted to use @tailwindcss/postcss which is v4-only)
- **Issue:** create-next-app generated `postcss.config.mjs` using `@tailwindcss/postcss` plugin
- **Fix:** Replaced with `tailwindcss` + `autoprefixer` plugins (standard v3 setup)
- **Files modified:** frontend/postcss.config.mjs
- **Verification:** `npm run build` passes with Tailwind v3 processing
- **Committed in:** 0d2c986 (Task 1 commit)

**4. [Rule 3 - Blocking] ThemeProviderProps import path changed in next-themes v0.4**
- **Found during:** Task 2 (npx tsc --noEmit failed)
- **Issue:** Plan referenced `next-themes/dist/types` which no longer exists in v0.4
- **Fix:** Changed import to `import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"`
- **Files modified:** frontend/src/components/layout/ThemeProvider.tsx
- **Verification:** `npx tsc --noEmit` passes (0 errors)
- **Committed in:** 8ea0070 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (all Rule 3 blocking issues)
**Impact on plan:** All fixes required for build/staging success. No scope creep. Core objectives fully met.

## Issues Encountered

- shadcn CLI v4 installed "base-nova" style with Tailwind v4 syntax; manually wrote `tailwind.config.ts` and `components.json` for Tailwind v3 + new-york style
- Geist font (used by Next.js 16 template) unavailable in Next.js 14; switched to Inter

## User Setup Required

None - no external service configuration required. `.env.local` already created with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Next Phase Readiness

- Frontend scaffold fully ready for Plan 02 (ForgeApp component with three-column layout)
- API client ready — `forgeApi()` will be consumed by the ForgeApp in Plan 02
- Theme system ready — ThemeProvider and CSS vars in place for cool/warm toggle in Plan 03
- Toast infrastructure ready — `toast()` calls can be added in Plan 02 form logic

## Self-Check: PASSED

All 10 key files verified present on disk. Commits 0d2c986 and 8ea0070 confirmed in git log.

---
*Phase: 04-frontend-shell*
*Completed: 2026-03-14*
