---
phase: 2
slug: forge-pipeline-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x + pytest-asyncio (installed from Phase 1) |
| **Config file** | backend/tests/conftest.py (from Phase 1) |
| **Quick run command** | `cd backend && source venv/bin/activate && pytest tests/test_forge.py -v` |
| **Full suite command** | `cd backend && source venv/bin/activate && pytest -v` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && source venv/bin/activate && pytest tests/test_forge.py -v`
- **After every plan wave:** Run `cd backend && source venv/bin/activate && pytest -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PIPE-01 | unit | `pytest tests/test_forge.py::test_forge_rejects_short_input -x` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PIPE-01 | unit | `pytest tests/test_forge.py::test_forge_rejects_long_input -x` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | PIPE-01 | unit | `pytest tests/test_forge.py::test_forge_accepts_valid_input -x` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | PIPE-02 | unit (mocked) | `pytest tests/test_forge.py::test_category_detection_vibe_coding -x` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | PIPE-02 | unit (mocked) | `pytest tests/test_forge.py::test_category_detection_brainstorming -x` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | PIPE-02 | unit (mocked) | `pytest tests/test_forge.py::test_category_detection_qa -x` | ❌ W0 | ⬜ pending |
| 02-01-07 | 01 | 1 | PIPE-03 | unit (mocked) | `pytest tests/test_forge.py::test_crafted_prompt_populated -x` | ❌ W0 | ⬜ pending |
| 02-01-08 | 01 | 1 | PIPE-04 | unit (mocked) | `pytest tests/test_forge.py::test_parallel_calls_both_present -x` | ❌ W0 | ⬜ pending |
| 02-01-09 | 01 | 1 | PIPE-04 | integration (mocked delay) | `pytest tests/test_forge.py::test_execute_calls_are_parallel -x` | ❌ W0 | ⬜ pending |
| 02-01-10 | 01 | 1 | PIPE-07 | unit (BackgroundTasks) | `pytest tests/test_forge.py::test_log_event_is_background -x` | ❌ W0 | ⬜ pending |
| 02-01-11 | 01 | 1 | PIPE-07 | unit (stub raises) | `pytest tests/test_forge.py::test_log_event_failure_is_swallowed -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/models/forge.py` — ForgeRequest, ForgeResponse, CallTiming models
- [ ] `backend/prompts/detect_category.txt` — category detection prompt template
- [ ] `backend/prompts/craft_vibe_coding.txt` — vibe_coding crafting template
- [ ] `backend/prompts/craft_brainstorming.txt` — brainstorming crafting template
- [ ] `backend/prompts/craft_qa.txt` — qa crafting template
- [ ] `backend/tests/test_forge.py` — test stubs for all PIPE requirements

*Existing infrastructure (conftest.py, pytest-asyncio) covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| curl POST /api/forge returns valid ForgeResponse | PIPE-01 | End-to-end requires live Granite API | `curl -X POST http://localhost:8000/api/forge -H "Content-Type: application/json" -d '{"input":"Help me brainstorm startup ideas"}'` |
| Crafted prompt is 200-400 words | PIPE-03 | Word count depends on Granite output quality | Check `crafted_prompt` field word count in curl response |
| Total latency ≈ single call time (parallel proof) | PIPE-04 | Timing requires live API calls | Compare `total_latency_ms` vs sum of individual `call_timings` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
