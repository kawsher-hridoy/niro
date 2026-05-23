# Testing

> **Canonical reference:** [`DESIGN.md §11`](../../DESIGN.md#11-testing-strategy).
> This file adds the actual test catalog as tests are written.

## Strategy

We test **what would lose us the demo if it broke.** Comprehensive
coverage is a v1.1 concern.

| Test type | Coverage target | Tool |
|---|---|---|
| AI golden tests | 5 fixed (image, expected_keys) pairs | `pytest` |
| Contract tests | `analyze_document` returns valid `DocumentAnalysis` | `pytest` + JSON Schema |
| Consent guard unit tests | Every rule has yes/no test | `pytest` |
| Audit writer integration | Each AI call writes exactly one row | `pytest` + testcontainers Postgres |
| Frontend smoke | Login → upload → analyze → view works | Playwright, headless Chromium |
| Manual demo dry-run | Full 5-min demo runs cleanly | human |

What we **skip:** E2E coverage, load tests, fuzz tests, accessibility
beyond manual checks.

## Running tests

```bash
# Backend unit + integration
cd niro/backend
pytest -v

# Just AI golden tests
pytest tests/golden/

# Frontend smoke (Phase F)
cd niro/frontend
npx playwright test
```

## AI golden test format

```python
# niro/backend/tests/golden/test_prescription.py
def test_metformin_prescription(provider):
    with open("../sample_rx.png", "rb") as f:
        result = provider.analyze_document(f.read(), "image/png")
    assert result["confidence"] > 0.7
    meds = {m["name"].lower() for m in result["structured"]["medications"]}
    assert "metformin" in meds
    assert "glimepiride" in meds
    assert len(result["red_flags"]) > 0
```

## Banned-phrase regression test

```python
def test_banned_phrase_rejection():
    bad_output = {"explanation_bn": "আপনি Metformin 500mg গ্রহণ করুন।"}
    with pytest.raises(AIPolicyViolation):
        policy.assert_compliant(bad_output)
```

## Catalog (filled in as tests are written)

| Test | File | Phase | Status |
|---|---|---|---|
| Health endpoint returns 200 | `tests/test_health.py` | A | pending |
| OTP verify accepts 123456 in dev | `tests/test_auth.py` | B | pending |
| Document upload writes blob + DB row | `tests/test_documents.py` | B | pending |
| AI prescription extraction (golden) | `tests/golden/test_prescription.py` | B | pending |
| AI lab report extraction (golden) | `tests/golden/test_lab_report.py` | B | pending |
| Audit writer writes exactly one row per AI call | `tests/test_audit.py` | B | pending |
| Banned-phrase linter rejects bad outputs | `tests/test_policy.py` | B | pending |
| Consent guard denies without active consent | `tests/test_consent.py` | C | pending |
| Verification flow: request → pay → review | `tests/test_verifications.py` | C | pending |
| Chamber session lifecycle | `tests/test_chamber.py` | D | pending |
| Frontend smoke: full happy path | `e2e/happy-path.spec.ts` | F | pending |
| Smoke: history cross-reference | `e2e/history.spec.ts` | F | pending |
| Smoke: chamber QR flow | `e2e/chamber.spec.ts` | F | pending |

## CI

For Phase 1 we run tests locally only.
Phase F: GitHub Actions workflow runs `pytest` + Playwright on every PR.
