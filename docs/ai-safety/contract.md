# AI Safety — Contract

> **Canonical reference:** [`DESIGN.md §5`](../../DESIGN.md#5-ai-integration-contract).
> This file documents what's **actually built** through Day-5 Fix #4.

## The interface — `backend/ai/provider.py`

```python
class AIProvider(ABC):
    def analyze_document(
        image_or_pdf_bytes: bytes,
        mime: str,
        hint_kind: DocKind | None = None,
        history: list[DocumentAnalysis] | None = None,
    ) -> DocumentAnalysis: ...

    def prepare_case_summary(
        target_analysis: DocumentAnalysis,
        history: list[DocumentAnalysis],
    ) -> CaseSummary: ...
```

**Two methods cover the entire AI surface in Niro.** No feature code
talks to OpenAI directly — everything goes through these.

### Wire shapes (TypedDicts in `provider.py`)

`DocumentAnalysis`:
```python
{
    "kind": "prescription" | "lab_report" | "discharge" | "other",
    "structured": dict,        # medications[], values[], patient, diagnosis
    "explanation_bn": str,
    "red_flags": list[{"label_bn": str, "severity": "info"|"warn"|"danger"}],
    "questions_bn": list[str],
    "confidence": float,       # 0..1
    "model_name": str, "model_version": str,
    "prompt_sha256": str, "output_sha256": str,
    "latency_ms": int,
}
```

`CaseSummary` (for the doctor):
```python
{
    "patient_summary_bn": str,
    "current_medications": list[StructuredMedication],
    "ai_concerns": list[{"claim_id": str, "claim_bn": str, "severity": str}],
    "questions_for_doctor": list[str],
    "referenced_history": list[str],
    "model_name": str, "model_version": str,
    "prompt_sha256": str, "output_sha256": str,
}
```

## Implementations

| Class | Module | Status |
|---|---|---|
| `AzureOpenAIProvider` | `backend/ai/azure.py` | **Active (D-004)** |
| `ClaudeProvider` | (not yet) | Fallback — Phase F if needed |
| `GeminiProvider` | (not yet) | Fallback — Phase F if needed |

Provider selected via `AI_PROVIDER` env var. Factory:
`backend.ai.provider.get_provider()` returns the cached instance.

## Hard rules (enforced)

1. **AI never gives final medical advice.** Banned imperative phrases
   scanned post-call by `ai/policy.py`. A hit raises `AIPolicyViolation`
   which the analyze route catches → audit + 422 response.
2. **Every AI call wrapped by audit logging.** `analyses.py` and
   `doctor.py` (case-summary path) both record an `ai.*` event.
3. **Confidence threshold = 0.5.** Below this, `recommend_human_review`
   is `True` and the UI surfaces an explicit "ask a doctor" CTA.

## Banned phrase patterns (`ai/policy.py`)

Bangla:
- `আপনি ... গ্রহণ করুন` (you should take ...)
- `আপনি ... খান`
- `ডোজ বাড়ান/কমান/পরিবর্তন`
- `নতুন ওষুধ নিন/শুরু করুন`
- `আপনার ... আছে।` (confident diagnosis)

English:
- `you should take`
- `increase/decrease your dose`
- `start taking ...`
- `you have <disease>` (regex with -itis/-emia/-osis/etc.)

False-positive risk: medication names matching patterns. We accept
this — if the linter trips, we ask for human review rather than show
the output.

## Prompts (`ai/prompts.py`)

All prompts versioned with a constant. Bump the patch version when
you edit a prompt body. Version is written to
`audit_log.detail.prompt_version`.

| Constant | Version |
|---|---|
| `PRESCRIPTION_PROMPT_BN` | `rx-bn-v1.0` |
| `LAB_REPORT_PROMPT_BN` | `lab-bn-v1.0` |
| `HISTORY_INTRO_BN` | `hist-bn-v1.0` |
| `CASE_SUMMARY_PROMPT_BN` | `case-bn-v1.0` |

In history-aware mode the analyze prompt is concatenated with
`HISTORY_INTRO_BN` + a summary of the last 3 analyses (medications +
short explanation). `prompt_version` becomes e.g. `rx-bn-v1.0+hist-bn-v1.0`.

## Calibration

Each prompt asks for `_meta.confidence` (0–1). Defaults to 0.7 if
missing. UI mapping:

| Confidence | UI tone | Behavior |
|---|---|---|
| `≥ 0.85` | Green | Show as authoritative |
| `0.5–0.85` | Amber | Show with caveat |
| `< 0.5` | Red | Show + auto-suggest human review |

## Latency we've actually measured

| Call | Latency |
|---|---|
| Bangla text only | 1-3s |
| Structured JSON from text | 2-4s |
| Vision (prescription) + structured | 8-12s |
| Vision (lab) + Bangla + history-aware | 15-24s |
| Case summary (text + history) | 5-9s |
| Probe small call | 1.27s (last run) |

## Operational notes

- **Auth header:** `Authorization: Bearer <key>` (NOT `api-key:`).
- **`max_tokens` rejected** by `gpt-chat-latest` — use `max_completion_tokens` or omit. We omit.
- **Image format:** `data:` URI with base64-encoded PNG/JPEG/WebP/PDF. See `niro/probe.py`.
- **JSON output:** always pass `response_format={"type":"json_object"}`.
- **History context:** capped at last 3 analyses to keep prompt size manageable.

## Phase F additions

- [ ] Golden test set (`niro/backend/tests/golden/`) — 5 fixed images with expected keys
- [ ] Prompt regression detection in CI
- [ ] Cost tracking script summing tokens × Azure unit cost
- [ ] Claude provider implementation (fallback)
- [ ] Gemini provider implementation (fallback)
