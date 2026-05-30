"""AIProvider — the only path AI calls take.

All feature code calls `get_provider().analyze_document(...)` etc. The
concrete provider is selected by AI_PROVIDER env var. Swapping providers
is one env var.

The structured output shapes here are the wire format for both DB
storage (Analysis.structured, .red_flags, .questions_bn) and API
responses.

See docs/ai-safety/contract.md for the operational picture.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Literal, TypedDict

from backend.config import get_settings


# ---------- Wire shapes ----------

DocKind = Literal["prescription", "lab_report", "discharge", "other"]


class StructuredMedication(TypedDict, total=False):
    name: str
    strength: str | None
    dosage: str | None
    frequency: str | None
    duration: str | None
    notes: str | None


class StructuredLabValue(TypedDict, total=False):
    parameter: str
    value: str
    unit: str | None
    reference: str | None
    abnormal: bool
    metric_key: str | None
    value_num: float | None
    ref_low: float | None
    ref_high: float | None


class RedFlag(TypedDict, total=False):
    label_bn: str
    severity: Literal["info", "warn", "danger"]


class DocumentAnalysis(TypedDict, total=False):
    kind: DocKind
    report_type: str | None
    report_date: str | None
    structured: dict
    explanation_bn: str
    red_flags: list[RedFlag]
    questions_bn: list[str]
    confidence: float
    model_name: str
    model_version: str
    prompt_sha256: str
    output_sha256: str
    latency_ms: int


class CaseSummary(TypedDict, total=False):
    patient_summary_bn: str
    current_medications: list[StructuredMedication]
    ai_concerns: list[dict]
    questions_for_doctor: list[str]
    referenced_history: list[str]
    model_name: str
    model_version: str
    prompt_sha256: str
    output_sha256: str


class ChatTurn(TypedDict):
    role: Literal["user", "assistant"]
    content: str


class ChatReply(TypedDict, total=False):
    answer_bn: str
    confidence: float
    model_name: str
    model_version: str
    prompt_sha256: str
    output_sha256: str
    latency_ms: int


# ---------- Errors ----------

class DocumentReadError(Exception):
    """Raised when an uploaded document cannot be decoded (e.g., encrypted/corrupted PDF)."""


# ---------- Abstract base ----------

class AIProvider(ABC):
    """All AI calls in Niro go through one of these."""

    @abstractmethod
    def analyze_document(
        self,
        image_or_pdf_bytes: bytes,
        mime: str,
        hint_kind: DocKind | None = None,
        history: list[DocumentAnalysis] | None = None,
        user_prompt: str | None = None,
    ) -> DocumentAnalysis: ...

    @abstractmethod
    def prepare_case_summary(
        self,
        target_analysis: DocumentAnalysis,
        history: list[DocumentAnalysis],
    ) -> CaseSummary: ...

    @abstractmethod
    def chat_about_analysis(
        self,
        analysis: DocumentAnalysis,
        user_message: str,
        turns: list[ChatTurn] | None = None,
        history: list[DocumentAnalysis] | None = None,
    ) -> ChatReply: ...


# ---------- Factory ----------

_provider: AIProvider | None = None


def get_provider() -> AIProvider:
    """Return the active provider per AI_PROVIDER env var. Cached."""
    global _provider
    if _provider is not None:
        return _provider

    name = get_settings().ai_provider.lower()
    if name == "azure":
        from backend.ai.azure import AzureOpenAIProvider
        _provider = AzureOpenAIProvider()
    elif name == "claude":
        raise NotImplementedError("ClaudeProvider not yet implemented (fallback only)")
    elif name == "gemini":
        raise NotImplementedError("GeminiProvider not yet implemented (fallback only)")
    else:
        raise ValueError(f"Unknown AI_PROVIDER: {name}")
    return _provider


def reset_provider_for_testing() -> None:
    """Test hook only — flushes the cached provider."""
    global _provider
    _provider = None
