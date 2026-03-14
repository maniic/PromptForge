---
phase: 1
slug: ibm-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x + pytest-asyncio |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `cd backend && source venv/bin/activate && pytest tests/test_granite.py -v` |
| **Full suite command** | `cd backend && source venv/bin/activate && pytest -v` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && source venv/bin/activate && pytest tests/test_granite.py -v`
- **After every plan wave:** Run `cd backend && source venv/bin/activate && pytest -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | INFRA-05 | integration (mocked) | `pytest tests/test_granite.py::test_startup_validation_fails_on_bad_credentials -x` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | INFRA-05 | unit (mocked) | `pytest tests/test_granite.py::test_generate_text_returns_granite_response -x` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | INFRA-05 | integration (mocked with delay) | `pytest tests/test_granite.py::test_parallel_calls_are_concurrent -x` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | INFRA-05 | unit (mocked) | `pytest tests/test_granite.py::test_sdk_exception_wrapped_as_granite_error -x` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | INFRA-05 | unit (mocked with sleep) | `pytest tests/test_granite.py::test_generate_text_timeout -x` | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 1 | INFRA-05 | static (grep) | `grep -r "os.getenv" backend/services/granite_service.py \|\| true` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_granite.py` — stubs for all INFRA-05 behaviors
- [ ] `backend/tests/conftest.py` — shared `mock_env_vars` and `mock_granite_model` fixtures
- [ ] `backend/requirements.txt` — all dependencies (ibm-watsonx-ai, fastapi, uvicorn, pytest, pytest-asyncio)
- [ ] Framework install: `pip install pytest pytest-asyncio`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No `os.getenv()` in granite_service.py | INFRA-05 | Static grep check | `grep -r "os.getenv" backend/services/granite_service.py` — should return nothing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
