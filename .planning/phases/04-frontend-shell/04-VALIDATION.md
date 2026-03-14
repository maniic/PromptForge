---
phase: 4
slug: frontend-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (native TS/JSX, no Babel config needed) |
| **Config file** | `frontend/vitest.config.ts` (Wave 0 installs) |
| **Quick run command** | `cd frontend && npm run test -- --run` |
| **Full suite command** | `cd frontend && npm run test -- --run && npm run lint && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run test -- --run`
- **After every plan wave:** Run `cd frontend && npm run test -- --run && npm run lint && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | UX-01 | unit | `npm run test -- --run src/components/forge/ForgeApp.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | UX-02 | unit | `npm run test -- --run src/components/forge/ForgeApp.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | UX-03 | unit | `npm run test -- --run src/components/forge/ThreeColumnLayout.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | UX-06 | unit | `npm run test -- --run src/components/shared/LoadingStatus.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | UX-07 | unit | `npm run test -- --run src/lib/api.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/vitest.config.ts` — Vitest configuration with jsdom environment
- [ ] `frontend/src/test/setup.ts` — `@testing-library/jest-dom` matchers setup
- [ ] `frontend/src/components/forge/ForgeApp.test.tsx` — covers UX-01, UX-02
- [ ] `frontend/src/components/forge/ThreeColumnLayout.test.tsx` — covers UX-03
- [ ] `frontend/src/components/shared/LoadingStatus.test.tsx` — covers UX-06
- [ ] `frontend/src/lib/api.test.ts` — covers UX-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slide/fade animation feels smooth at 60fps | UX-03 | Visual quality requires human judgment | Submit forge, observe columns 2+3 animate in — no jank |
| Dark theme looks correct with both accent themes | UX-01 | Visual design judgment | Toggle between cool/warm themes, verify colors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
