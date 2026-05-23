"""Post-call linter that catches the AI saying things it must not say.

Niro never gives final medical advice. The prompts forbid it; this is
the second line of defense. A `AIPolicyViolation` here means the AI
broke the contract — bug bash the prompt and add a golden test.
"""
from __future__ import annotations

import re
from typing import Any


class AIPolicyViolation(Exception):
    """Raised when an AI output violates Niro's safety contract."""


# Imperative dosing language in Bangla / English. Match conservatively;
# false positives are better than missing a violation.
_BANNED_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"আপনি\s+[ঀ-৿\w\s\-\d]{1,40}গ্রহণ\s+করুন"),
    re.compile(r"আপনি\s+[ঀ-৿\w\s\-\d]{1,40}খান\b"),
    re.compile(r"ডোজ\s+(বাড়ান|কমান|পরিবর্তন)"),
    re.compile(r"নতুন\s+ওষুধ\s+(নিন|শুরু\s+করুন)"),
    re.compile(r"আপনার\s+[ঀ-৿\w\s]{1,30}\s+আছে।"),  # confident diagnosis
    re.compile(r"\byou\s+should\s+take\b", re.IGNORECASE),
    re.compile(r"\bincrease\s+(your\s+)?dose\b", re.IGNORECASE),
    re.compile(r"\bdecrease\s+(your\s+)?dose\b", re.IGNORECASE),
    re.compile(r"\bstart\s+(taking\s+)?\w+", re.IGNORECASE),
    re.compile(r"\byou\s+have\s+\w+(itis|emia|osis|cancer|diabetes|hypertension)", re.IGNORECASE),
]


def _scan_text(text: str) -> str | None:
    for pat in _BANNED_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(0)
    return None


def assert_compliant(payload: dict[str, Any]) -> None:
    """Raise AIPolicyViolation if any text field carries banned content.

    Scans explanation_bn, questions_bn, and any red_flag labels. Structured
    medication names are allowed (those are the doctor's data, not advice).
    """
    texts: list[str] = []
    if isinstance(payload.get("explanation_bn"), str):
        texts.append(payload["explanation_bn"])
    if isinstance(payload.get("patient_summary_bn"), str):
        texts.append(payload["patient_summary_bn"])
    qs = payload.get("questions_bn") or []
    if isinstance(qs, list):
        texts.extend([q for q in qs if isinstance(q, str)])
    rfs = payload.get("red_flags") or []
    if isinstance(rfs, list):
        for rf in rfs:
            if isinstance(rf, dict) and isinstance(rf.get("label_bn"), str):
                texts.append(rf["label_bn"])

    for t in texts:
        hit = _scan_text(t)
        if hit:
            raise AIPolicyViolation(
                f"AI output violated Niro safety contract. Banned phrase: {hit!r}"
            )
