"""
Static prompt analysis — detects which prompt engineering techniques a
prompt uses, without any AI call. Powers the live technique chips in the
editor and gives the coach a factual picture of the learner's prompt.

Exports: detect_techniques, TECHNIQUE_LABELS
"""

import re

from backend.models.learn import TechniqueReport

TECHNIQUE_LABELS: dict[str, str] = {
    "role": "Role / persona",
    "audience": "Audience",
    "output_format": "Output format",
    "constraints": "Explicit constraints",
    "examples": "Few-shot examples",
    "delimiters": "Delimiters",
    "reasoning": "Step-by-step reasoning",
    "fallback": "Fallback behaviour",
    "variables": "Template variables",
}

_PATTERNS: dict[str, re.Pattern[str]] = {
    "role": re.compile(r"\byou are (?:an?|the)\b|\bact as\b|\bas an? (?:expert|senior|professional)\b", re.I),
    "audience": re.compile(r"\b(?:audience|reader|for (?:a|an) \d+[- ]year[- ]old|beginner|child|kid|non[- ]technical)\b", re.I),
    "output_format": re.compile(r"\b(?:json|bullet|table|format|markdown|csv|exactly \d+|one line|single word|respond with only|output only)\b", re.I),
    "constraints": re.compile(r"\b(?:do not|don't|never|must|only|at most|no more than|under \d+|maximum|avoid)\b", re.I),
    "examples": re.compile(r"\b(?:example|e\.g\.|for instance)\b|^\s*(?:input|output|q|a)\s*:", re.I | re.M),
    "delimiters": re.compile(r'"""|```|###|<[a-z_]+>|\[\[|---'),
    "reasoning": re.compile(r"\b(?:step[- ]by[- ]step|think through|reason|show your work|first,? .* then)\b", re.I),
    "fallback": re.compile(r"\b(?:if (?:the|you|it|there)\b.*\b(?:not|cannot|can't|unknown|missing)|otherwise|i don't know|not in context)\b", re.I),
    "variables": re.compile(r"\{\{\s*\w+\s*\}\}"),
}


def detect_techniques(prompt: str) -> TechniqueReport:
    detected = [name for name, pattern in _PATTERNS.items() if pattern.search(prompt)]
    words = len(prompt.split())
    return TechniqueReport(
        detected=detected,
        estimated_tokens=max(1, round(len(prompt) / 4)) if prompt else 0,
        word_count=words,
    )
