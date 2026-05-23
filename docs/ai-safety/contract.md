# AI Safety — Contract

> **Canonical reference:** [`DESIGN.md §5`](../../DESIGN.md#5-ai-integration-contract).
> This file adds prompt versioning, calibration, and operational notes.

## The interface

```python
# niro/backend/ai/provider.py
class AIProvider(ABC):
    @abstractmethod
    def analyze_document(image_or_pdf_bytes, mime, hint_kind, history) -> DocumentAnalysis
    @abstractmethod
    def prepare_case_summary(target_analysis, history) -> CaseSummary
    @abstractmethod
    def check_drug_interaction(drug_a, drug_b) -> dict
```

Full types and concrete impl: see `DESIGN.md §5`.

## Implementations

| Class | Module | Status |
|---|---|---|
| `AzureOpenAIProvider` | `niro/backend/ai/azure.py` | Phase B |
| `ClaudeProvider` | `niro/backend/ai/claude.py` | Fallback, Phase F if needed |
| `GeminiProvider` | `niro/backend/ai/gemini.py` | Fallback, Phase F if needed |

Selection via `AI_PROVIDER` env var. The factory `get_provider()` lives
in `provider.py` and is the **only** import path feature code should use.

## Hard rules (enforced)

1. AI **never** gives final medical advice — only extracts, explains, flags.
2. Banned imperative phrases scanned post-call by `ai/policy.py`. A hit raises `AIPolicyViolation`.
3. Every AI call wrapped by `AuditWriter.record_ai_call(...)` before returning.
4. Confidence < threshold (0.5) → result returned but `recommend_human_review=True`.

Banned phrase examples (Bangla regex list in `ai/prompts.py`):
- `আপনি .* গ্রহণ করুন` (you should take ...)
- `ডোজ বাড়ান` / `ডোজ কমান` (increase/decrease the dose)
- `নতুন ওষুধ নিন` (take a new drug)

## Prompt versioning

Every system prompt gets a version string:

```python
PRESCRIPTION_PROMPT_VERSION = "rx-bn-v1.0"
PRESCRIPTION_PROMPT_BN = """..."""
```

When you edit a prompt, **bump the patch version**. The version is written to `audit_log.detail.prompt_version` for traceability.

Golden tests in `niro/backend/tests/golden/` keep the prompts honest:
fixed `(image, expected_keys)` pairs run on CI. A prompt edit that breaks
a golden test = blocked merge.

## Calibration

Each prompt asks the model to emit `_meta.confidence` (0–1).
Empirically calibrate by running the golden set:

```
confidence ≥ 0.85 → "high"   (auto-display)
confidence 0.50-0.85 → "medium" (display with caveat)
confidence < 0.50 → "low"     (display "Please request human review")
```

Re-calibrate when switching providers.

## To be added during the build

- [ ] Phase B: actual prompt texts, with versions
- [ ] Phase B: golden test results table (per-prompt accuracy)
- [ ] Phase C: prompt for `prepare_case_summary` + version
- [ ] Phase F: calibration sweep after any provider switch
