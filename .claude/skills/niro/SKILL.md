---
name: niro
description: Use when working on the Niro health-app codebase — implementing features (AI document analysis, patient profile, doctor verification, consent flow, audit log), debugging the AI provider integration, or reasoning about ICADHI submission constraints. Knows Niro's locked Phase-1 scope, AI safety rules, Bangla-first conventions, and Azure OpenAI setup.
---

# Niro project skill

Use this when the task touches Niro (the IEEE ICADHI 2026 health app
in this repo).

## What Niro is in one sentence

Patient-owned medical record + AI document analyzer (Bangla) + on-demand
doctor verification, built for Bangladesh.

Full product spec: `PROJECT.md` (root of repo).
Engineering memory: `CLAUDE.md` (root of repo).

## Key constraints to keep in mind

1. **Phase-1 video deadline: 27 May 2026.** Final demo: 15 June 2026.
   Phase-1 scope is locked in `PROJECT.md §9` — do not add features.
2. **AI never gives final medical advice.** Only extracts, explains, and flags.
3. **Bangla is the default output language.** Use Bangla numerals (২৪৫) for
   medical values where natural.
4. **Every AI call must be logged** with model version, prompt hash,
   output hash, confidence, timestamp. This is the audit trail.
5. **Every doctor view of patient data requires explicit, time-bound consent.**
   Default expiry: 24 hours. Patient sees an access log.
6. **Never commit secrets.** All keys via env vars. `.env` is gitignored.

## AI provider

- **Azure OpenAI**, deployment `gpt-chat-latest` (Preview, retires 5 Aug 2026).
- Endpoint: `https://ai-for-security.services.ai.azure.com/openai/v1`
- Used via the official `openai` Python SDK pointed at the Azure base URL.
- All AI calls must go through `niro/backend/ai/provider.py` (the `AIProvider`
  abstract base + `AzureOpenAIProvider` concrete). Provider is selected by
  `AI_PROVIDER` env var.
- If Azure becomes unstable, swap by setting `AI_PROVIDER=claude` or `gemini`
  and implementing the matching provider class — no feature code changes.
- Capability probe: `niro/probe.py`. Re-run after any provider/key/model
  change. Tests Bangla quality, JSON output, vision on prescription, vision
  on lab report, function calling, latency.

## Code patterns to follow

### Calling the AI
```python
# Good
from backend.ai.provider import get_provider
result = get_provider().analyze_document(image_bytes, doc_type="prescription")

# Bad — never call OpenAI client directly from feature code
client = OpenAI(...)
client.chat.completions.create(...)
```

### Audit logging
Every AI call goes through a wrapper that records:
- model name + version
- prompt content hash (sha256, not the prompt itself)
- output content hash
- confidence score
- patient_id (FK, not PHI)
- timestamp

PHI must never appear in logs at INFO or WARN level.

### Consent check
Before any code path that surfaces patient data to a doctor:
```python
if not consent.is_valid(patient_id=p, doctor_id=d, at=now):
    raise PermissionDenied("No active consent")
consent.record_access(patient_id=p, doctor_id=d, at=now, view=screen_name)
```

### Bangla output
System prompts must explicitly request Bangla and discourage English mixing.
Use the system prompts in `backend/ai/prompts.py` — do not write ad-hoc system
prompts in feature code.

## Anti-patterns to avoid

- Calling the OpenAI client directly from anywhere except `backend/ai/`.
- Logging raw patient documents.
- Writing defensive checks for AI returning malformed JSON without first
  using `response_format={"type": "json_object"}`.
- Adding features beyond `PROJECT.md §9` Phase-1 scope before 27 May.
- Routing doctor screens that don't check consent.
- English-default UI. Bangla is the default; English is a toggle.
- Long docstrings or multi-line comment blocks. Niro code is terse.

## Common operations

| Task | How |
|---|---|
| Re-run AI capability probe | `cd niro && AZURE_OPENAI_KEY=<key> .venv/bin/python probe.py` |
| Test a new model deployment | Same command with `AZURE_OPENAI_DEPLOYMENT=<name>` |
| Add a new AI provider | Subclass `AIProvider` in `backend/ai/<name>.py`, register in `get_provider()` |
| Add a new patient-facing AI flow | Add system prompt to `backend/ai/prompts.py`, route in `backend/api/`, UI in `frontend/app/(patient)/` |
| Check what the AI knows about Niro decisions | Read `PROJECT.md §12` (locked decisions) and `§13` (open questions) |

## When this skill is helpful

- "Add an AI explanation for X document type"
- "The probe failed — why?"
- "Swap to Claude as a fallback"
- "Build the consent dialog"
- "Add an audit log entry for the doctor verification screen"
- "What does ICADHI Phase-1 require?"
- "Can I add feature Y before the deadline?" → answer is usually no; read PROJECT.md §12

## When this skill is NOT helpful

- Generic Python or Next.js questions unrelated to Niro
- ICADHI website / registration help (that's already done, see prior session)
