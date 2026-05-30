"""Azure OpenAI concrete implementation of AIProvider.

Patterns ported from niro/probe.py (which is the source of truth for what
works against the gpt-chat-latest deployment). When the probe passes, the
provider should pass too.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import time
from typing import Any

import pymupdf
from openai import OpenAI

from backend.ai import prompts
from backend.ai.policy import assert_compliant
from backend.ai.provider import (
    AIProvider,
    CaseSummary,
    ChatReply,
    ChatTurn,
    DocKind,
    DocumentAnalysis,
    DocumentReadError,
)
from backend.config import get_settings


_HISTORY_LIMIT = 3
_MODEL_VERSION = "2026-05-05"  # gpt-chat-latest from probe; updated when deployment changes
_PDF_MAX_PAGES = 5
_PDF_DPI = 200


def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


_REPORT_TYPE_RE = re.compile(r"[^a-z0-9_]+")
_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _clean_report_type(value: Any) -> str | None:
    """Normalize the model's report_type to a lowercase snake_case slug, or None."""
    if not isinstance(value, str) or not value.strip():
        return None
    slug = _REPORT_TYPE_RE.sub("_", value.strip().lower()).strip("_")
    return slug[:64] or None


def _clean_iso_date(value: Any) -> str | None:
    """Accept only a well-formed YYYY-MM-DD string; reject anything else."""
    if not isinstance(value, str):
        return None
    v = value.strip()
    return v if _ISO_DATE_RE.match(v) else None


def _b64(image: bytes) -> str:
    return base64.b64encode(image).decode("ascii")


def _data_uris_for(data: bytes, mime: str) -> list[str]:
    if mime != "application/pdf":
        return [f"data:{mime};base64,{_b64(data)}"]
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception as e:
        raise DocumentReadError(
            "PDF could not be read; file may be encrypted or corrupted"
        ) from e
    uris: list[str] = []
    try:
        for i in range(min(len(doc), _PDF_MAX_PAGES)):
            png = doc[i].get_pixmap(dpi=_PDF_DPI).tobytes("png")
            uris.append(f"data:image/png;base64,{_b64(png)}")
    finally:
        doc.close()
    return uris


def _history_block(history: list[DocumentAnalysis]) -> str:
    if not history:
        return ""
    lines: list[str] = [prompts.HISTORY_INTRO_BN]
    for i, h in enumerate(history[-_HISTORY_LIMIT:], 1):
        meds = h.get("structured", {}).get("medications", []) or []
        med_names = ", ".join(m.get("name", "?") for m in meds[:6])
        lines.append(
            f"  {i}. ({h.get('model_name', '?')}) ওষুধ: {med_names or '—'}; "
            f"সারসংক্ষেপ: {(h.get('explanation_bn') or '')[:160]}"
        )
    return "\n".join(lines)


class AzureOpenAIProvider(AIProvider):
    """OpenAI SDK pointed at the Azure base URL."""

    def __init__(self) -> None:
        s = get_settings()
        self._client = OpenAI(base_url=s.azure_openai_endpoint, api_key=s.azure_openai_key)
        self._deployment = s.azure_openai_deployment
        self._model_version = _MODEL_VERSION

    # ---------- analyze ----------

    def analyze_document(
        self,
        image_or_pdf_bytes: bytes,
        mime: str,
        hint_kind: DocKind | None = None,
        history: list[DocumentAnalysis] | None = None,
        user_prompt: str | None = None,
    ) -> DocumentAnalysis:
        kind = hint_kind or "prescription"
        if kind == "lab_report":
            system_prompt = prompts.LAB_REPORT_PROMPT_BN
            prompt_version = prompts.LAB_REPORT_PROMPT_VERSION
        else:
            system_prompt = prompts.PRESCRIPTION_PROMPT_BN
            prompt_version = prompts.PRESCRIPTION_PROMPT_VERSION

        if history:
            system_prompt = system_prompt + "\n\n" + _history_block(history)
            prompt_version = f"{prompt_version}+{prompts.HISTORY_PROMPT_VERSION}"

        uris = _data_uris_for(image_or_pdf_bytes, mime or "image/png")
        user_text = "এই ডকুমেন্টটি বিশ্লেষণ করো এবং JSON ফেরত দাও।"
        if len(uris) > 1:
            user_text += "  (multi-page PDF; analyze all pages as one document)"
        if user_prompt and user_prompt.strip():
            user_text += "\n\nরোগীর নির্দিষ্ট প্রশ্ন (explanation_bn-এ এটির উত্তর দিন): " + user_prompt.strip()
            prompt_version = f"{prompt_version}+ask"
        content_blocks: list[dict] = [{"type": "text", "text": user_text}]
        for uri in uris:
            content_blocks.append({"type": "image_url", "image_url": {"url": uri}})

        t0 = time.time()
        resp = self._client.chat.completions.create(
            model=self._deployment,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content_blocks},
            ],
            response_format={"type": "json_object"},
            timeout=60,
        )
        latency_ms = int((time.time() - t0) * 1000)

        raw = resp.choices[0].message.content or "{}"
        try:
            data: dict[str, Any] = json.loads(raw)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"AI returned non-JSON: {e}") from e

        meta = data.get("_meta") or {}
        confidence = float(meta.get("confidence", 0.7))

        analysis: DocumentAnalysis = {
            "kind": kind,
            "report_type": _clean_report_type(data.get("report_type")),
            "report_date": _clean_iso_date(data.get("report_date")),
            "structured": data.get("structured", {}) or data,  # some models inline-flatten
            "explanation_bn": data.get("explanation_bn", "") or "",
            "red_flags": data.get("red_flags", []) or [],
            "questions_bn": data.get("questions_bn", []) or [],
            "confidence": confidence,
            "model_name": self._deployment,
            "model_version": self._model_version,
            "prompt_sha256": _sha256(system_prompt),
            "output_sha256": _sha256(raw),
            "latency_ms": latency_ms,
        }

        # Cleanup: some models include _meta or duplicate keys inside structured;
        # peel out medications if they slipped to top-level.
        if "medications" in data and not analysis["structured"].get("medications"):
            analysis["structured"]["medications"] = data["medications"]

        # Hard rule check.
        assert_compliant(analysis)
        # detail field used by audit logger; not part of the wire shape.
        analysis["_prompt_version"] = prompt_version  # type: ignore[typeddict-item]

        return analysis

    # ---------- case summary ----------

    def prepare_case_summary(
        self,
        target_analysis: DocumentAnalysis,
        history: list[DocumentAnalysis],
    ) -> CaseSummary:
        history_text = _history_block(history)
        target_brief = {
            "kind": target_analysis.get("kind"),
            "structured": target_analysis.get("structured"),
            "explanation_bn": target_analysis.get("explanation_bn"),
            "red_flags": target_analysis.get("red_flags"),
        }
        user_text = (
            "টার্গেট analysis (সবচেয়ে সাম্প্রতিক):\n"
            + json.dumps(target_brief, ensure_ascii=False, indent=2)
            + "\n\n"
            + history_text
        )

        t0 = time.time()
        resp = self._client.chat.completions.create(
            model=self._deployment,
            messages=[
                {"role": "system", "content": prompts.CASE_SUMMARY_PROMPT_BN},
                {"role": "user", "content": user_text},
            ],
            response_format={"type": "json_object"},
            timeout=60,
        )
        latency_ms = int((time.time() - t0) * 1000)

        raw = resp.choices[0].message.content or "{}"
        data: dict[str, Any] = json.loads(raw)

        summary: CaseSummary = {
            "patient_summary_bn": data.get("patient_summary_bn", "") or "",
            "current_medications": data.get("current_medications", []) or [],
            "ai_concerns": data.get("ai_concerns", []) or [],
            "questions_for_doctor": data.get("questions_for_doctor", []) or [],
            "referenced_history": data.get("referenced_history", []) or [],
            "model_name": self._deployment,
            "model_version": self._model_version,
            "prompt_sha256": _sha256(prompts.CASE_SUMMARY_PROMPT_BN),
            "output_sha256": _sha256(raw),
        }
        summary["_latency_ms"] = latency_ms  # type: ignore[typeddict-item]
        assert_compliant(summary)
        return summary

    # ---------- chat ----------

    def chat_about_analysis(
        self,
        analysis: DocumentAnalysis,
        user_message: str,
        turns: list[ChatTurn] | None = None,
        history: list[DocumentAnalysis] | None = None,
    ) -> ChatReply:
        system_prompt = prompts.CHAT_PROMPT_BN
        if history:
            system_prompt = system_prompt + "\n\n" + _history_block(history)

        brief = {
            "kind": analysis.get("kind"),
            "structured": analysis.get("structured"),
            "explanation_bn": analysis.get("explanation_bn"),
            "red_flags": analysis.get("red_flags"),
            "questions_bn": analysis.get("questions_bn"),
        }
        brief_text = (
            "বিশ্লেষণের তথ্য (এর উপর ভিত্তি করে উত্তর দিন):\n"
            + json.dumps(brief, ensure_ascii=False, indent=2)
        )

        messages: list[dict] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": brief_text},
        ]
        for turn in turns or []:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": user_message})

        t0 = time.time()
        resp = self._client.chat.completions.create(
            model=self._deployment,
            messages=messages,
            response_format={"type": "json_object"},
            timeout=60,
        )
        latency_ms = int((time.time() - t0) * 1000)

        raw = resp.choices[0].message.content or "{}"
        try:
            data: dict[str, Any] = json.loads(raw)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"AI returned non-JSON: {e}") from e

        meta = data.get("_meta") or {}
        confidence = float(meta.get("confidence", 0.7))
        answer_bn = data.get("answer_bn", "") or ""

        # Hard rule check — reuse the explanation_bn linter path.
        assert_compliant({"explanation_bn": answer_bn})

        return {
            "answer_bn": answer_bn,
            "confidence": confidence,
            "model_name": self._deployment,
            "model_version": self._model_version,
            "prompt_sha256": _sha256(system_prompt),
            "output_sha256": _sha256(raw),
            "latency_ms": latency_ms,
        }
