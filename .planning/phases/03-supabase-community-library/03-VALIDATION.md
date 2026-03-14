---
phase: 3
slug: supabase-community-library
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x + pytest-asyncio |
| **Config file** | backend/tests/conftest.py (existing) |
| **Quick run command** | `cd backend && source venv/bin/activate && pytest tests/test_library.py -v` |
| **Full suite command** | `cd backend && source venv/bin/activate && pytest -v` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && source venv/bin/activate && pytest tests/test_library.py -v`
- **After every plan wave:** Run `cd backend && source venv/bin/activate && pytest -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | LIB-01, LIB-02 | unit | `pytest tests/test_library.py -v` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | INFRA-02 | manual | N/A — verify via Supabase Dashboard | N/A | ⬜ pending |
| 03-01-03 | 01 | 1 | LIB-01 | unit | `pytest tests/test_library.py::test_post_library_saves_prompt -xvs` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | LIB-01 | unit | `pytest tests/test_library.py::test_post_library_validation -xvs` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 2 | LIB-02 | unit | `pytest tests/test_library.py::test_get_library_returns_list -xvs` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 2 | LIB-02 | unit | `pytest tests/test_library.py::test_get_library_category_filter -xvs` | ❌ W0 | ⬜ pending |
| 03-01-07 | 01 | 2 | LIB-01 | unit | `pytest tests/test_library.py::test_get_library_by_id -xvs` | ❌ W0 | ⬜ pending |
| 03-01-08 | 01 | 2 | LIB-01 | unit | `pytest tests/test_library.py::test_get_library_by_id_not_found -xvs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_library.py` — stubs for LIB-01, LIB-02 test cases
- [ ] No new conftest.py fixtures needed — existing `mock_env_vars` autouse fixture covers Supabase env vars

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| prompts + forge_events tables exist with correct columns and indexes | INFRA-02 | Schema created via Supabase Dashboard SQL editor | Run SQL in Supabase Dashboard; verify tables and indexes appear in Table Editor |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
