# Observability

> **Canonical reference:** [`DESIGN.md §9`](../../DESIGN.md#9-observability).
> This file adds sample log lines and operational notes.

## Stack

| Layer | Tool | Phase |
|---|---|---|
| Structured logs | `structlog` → JSON to stdout | B |
| Error capture | Sentry (free tier) | F |
| Metrics | Prometheus `/metrics` endpoint (optional) | F |
| Tracing | none | — |
| Cost tracking | daily script summing `audit_log` AI rows × Azure unit cost | F |

## Logging rules

1. **PHI never appears in logs.** Not at INFO, not at WARN, not at ERROR.
   Only IDs, hashes, and metadata.
2. **Log fields are fixed.** Adding a new field = adding a row in this doc.
3. **Levels:**
   - DEBUG — local dev only, request bodies (without PHI), SQL queries
   - INFO — every request, AI call summary, consent events
   - WARN — 4xx responses, AI policy violations, retry-able failures
   - ERROR — 5xx responses, unrecoverable errors

## Sample log lines (target format)

```json
{"ts":"2026-05-24T14:32:01Z","level":"info","event":"request","request_id":"01H...","user_id":"a1b2","user_role":"patient","route":"POST /analyses","status":200,"latency_ms":4123}
{"ts":"2026-05-24T14:32:05Z","level":"info","event":"ai.analyze.document","model":"gpt-chat-latest","model_version":"2026-05-05","prompt_sha256":"abc...","output_sha256":"def...","confidence":0.92,"latency_ms":3812,"document_id":"x9y8"}
{"ts":"2026-05-24T14:32:12Z","level":"warn","event":"ai.policy_violation","prompt_sha256":"abc...","banned_phrase":"আপনি ... গ্রহণ করুন"}
{"ts":"2026-05-24T14:35:00Z","level":"info","event":"consent.granted","patient_id":"a1b2","doctor_id":"d3e4","consent_id":"c5f6","scope":"full_history","expires_at":"2026-05-25T14:35:00Z"}
```

## What never logs

- Document text content.
- Medication names.
- Patient name, DOB, phone number, address.
- OTP codes (even hashed).
- Any secret or token.

If a developer needs to log something that looks PHI-adjacent, they
should ask "would a screenshot of this log row be acceptable in the
DESIGN.md §6 incident playbook example?"

## Redaction middleware

The FastAPI middleware in `niro/backend/middleware/logging.py` (Phase B):

1. Logs the request with sanitized fields (method, path, status, latency, user_id).
2. Redacts request bodies on PHI routes (`/documents`, `/analyses`, `/profile`).
3. Replaces redacted bodies with `<redacted len=N>`.

## AI cost tracking (Phase F)

Daily cron job:

```python
# scripts/ai_cost.py
SELECT
  model_name,
  model_version,
  date_trunc('day', ts) AS day,
  COUNT(*) AS calls,
  SUM((detail->>'prompt_tokens')::int) AS prompt_tokens,
  SUM((detail->>'output_tokens')::int) AS output_tokens
FROM audit_log
WHERE event LIKE 'ai.%'
  AND ts >= now() - interval '1 day'
GROUP BY 1, 2, 3;
```

Multiply by Azure unit cost → post to Slack / console.

## To be added during the build

- [ ] Phase B: actual middleware code reference
- [ ] Phase B: confirmation that `structlog` is the chosen lib
- [ ] Phase F: Sentry DSN setup; PII scrubbing config
- [ ] Phase F: actual AI cost script
