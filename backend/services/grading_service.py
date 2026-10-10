"""
Deterministic grading engine — "unit tests for prompts".

Every check here is a pure function of the model output: no AI calls,
fully reproducible. LLM-as-judge scoring lives in learn_service.py and only
covers rubric criteria that cannot be checked mechanically.

Exports: run_check, grade_output, extract_json, flesch_kincaid_grade
"""

import json
import re
from typing import Any

from backend.models.learn import Check, CheckResult

_BULLET_RE = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+")
_FENCE_RE = re.compile(r"^```[a-zA-Z]*\s*\n?(.*?)\n?```$", re.DOTALL)
_MISSING = object()


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------


def _words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9][A-Za-z0-9'’\-]*", text)


def _bullet_lines(text: str) -> list[str]:
    return [line for line in text.splitlines() if _BULLET_RE.match(line)]


def _count_syllables(word: str) -> int:
    word = word.lower().strip("'’")
    if len(word) <= 3:
        return 1
    word = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", word)
    word = re.sub(r"^y", "", word)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", word)))


def flesch_kincaid_grade(text: str) -> float:
    """Approximate U.S. school grade level needed to read `text`."""
    words = _words(text)
    if not words:
        return 0.0
    sentences = max(1, len(re.findall(r"[.!?]+(?:\s|$)", text)))
    syllables = sum(_count_syllables(w) for w in words)
    return round(0.39 * len(words) / sentences + 11.8 * syllables / len(words) - 15.59, 1)


def extract_json(text: str) -> Any:
    """Parse output as JSON. Tolerates a surrounding ``` fence, nothing else.

    Raises ValueError if the output is not pure JSON — chatty preambles like
    "Sure! Here's the JSON:" are exactly what these challenges teach against.
    """
    stripped = text.strip()
    fenced = _FENCE_RE.match(stripped)
    if fenced:
        stripped = fenced.group(1).strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError as exc:
        preview = stripped[:40] + ("…" if len(stripped) > 40 else "")
        raise ValueError(f"not valid JSON: output starts with \"{preview}\"") from exc


def _json_path(data: Any, path: str) -> Any:
    current = data
    for part in path.split("."):
        if isinstance(current, dict) and part in current:
            current = current[part]
        elif isinstance(current, list) and part.isdigit() and int(part) < len(current):
            current = current[int(part)]
        else:
            return _MISSING
    return current


def _norm(value: Any) -> str:
    return " ".join(str(value).split()).rstrip(".").strip("\"'`").rstrip(".").casefold()


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------


def run_check(check: Check, output: str) -> CheckResult:
    """Evaluate a single check against a model output."""
    try:
        passed, detail = _evaluate(check, output)
    except ValueError as exc:
        # Only the json_valid check explains the parse error; dependent checks just point at it
        dependent = check.type.startswith("json_") and check.type != "json_valid"
        passed, detail = False, "needs valid JSON first" if dependent else str(exc)
    return CheckResult(label=check.label, passed=passed, detail=detail)


def _evaluate(check: Check, output: str) -> tuple[bool, str]:
    text = output.strip()
    lowered = text.casefold()
    value = check.value

    if check.type == "contains":
        needles = value if isinstance(value, list) else [value]
        missing = [n for n in needles if str(n).casefold() not in lowered]
        return not missing, f"missing: {', '.join(map(str, missing))}" if missing else ""

    if check.type == "not_contains":
        needles = value if isinstance(value, list) else [value]
        found = [n for n in needles if str(n).casefold() in lowered]
        return not found, f"found forbidden: {', '.join(map(str, found))}" if found else ""

    if check.type == "equals":
        ok = _norm(text) == _norm(value)
        return ok, "" if ok else f"expected exactly '{value}', got '{text[:80]}'"

    if check.type == "regex":
        ok = re.search(str(value), text, flags=re.IGNORECASE | re.MULTILINE) is not None
        return ok, "" if ok else "required pattern not found"

    if check.type == "max_words":
        n = len(_words(text))
        return n <= int(value), f"{n} words (limit {value})"

    if check.type == "min_words":
        n = len(_words(text))
        return n >= int(value), f"{n} words (minimum {value})"

    if check.type == "bullet_count":
        n = len(_bullet_lines(text))
        return n == int(value), f"{n} bullet points (expected {value})"

    if check.type == "max_words_per_line":
        lines = _bullet_lines(text) or [ln for ln in text.splitlines() if ln.strip()]
        longest = max((len(_words(ln)) for ln in lines), default=0)
        return longest <= int(value), f"longest line has {longest} words (limit {value})"

    if check.type == "max_grade_level":
        grade = flesch_kincaid_grade(text)
        return grade <= float(value), f"reading grade level {grade} (limit {value})"

    if check.type == "json_valid":
        extract_json(text)
        return True, ""

    if check.type == "json_keys":
        data = extract_json(text)
        if not isinstance(data, dict):
            return False, "expected a JSON object"
        missing = [k for k in value if k not in data]
        return not missing, f"missing keys: {', '.join(missing)}" if missing else ""

    if check.type == "json_field":
        data = extract_json(text)
        actual = _json_path(data, check.path or "")
        if actual is _MISSING:
            return False, f"field '{check.path}' not found"
        if check.match == "contains":
            ok = _norm(value) in _norm(actual)
        else:
            ok = _norm(actual) == _norm(value)
        return ok, "" if ok else f"{check.path} = '{actual}' (expected '{value}')"

    if check.type == "json_array_length":
        data = extract_json(text)
        if not isinstance(data, list):
            return False, "expected a JSON array"
        return len(data) == int(value), f"{len(data)} items (expected {value})"

    raise ValueError(f"unknown check type: {check.type}")


def grade_output(checks: list[Check], output: str) -> list[CheckResult]:
    return [run_check(check, output) for check in checks]
