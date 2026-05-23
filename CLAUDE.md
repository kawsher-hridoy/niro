# CLAUDE.md — Niro engineering memory

This file is loaded automatically into every Claude Code session in this repo.
Keep it short, dense, and engineering-focused. Product-level spec lives in
`PROJECT.md` — do not duplicate it here.

---

## What this project is

**Niro** — patient-owned medical record + AI document analysis (Bangla) +
on-demand doctor verification. Built for the IEEE ICADHI 2026 Project Showcase
(Track 1 — AI-Driven Telemedicine).

Full product spec: see `PROJECT.md`. Read it before changing scope.

---

## Status

- **Phase 1 video submission due:** 27 May 2026
- **Selection phase result:** 30 May 2026
- **Final demo (if shortlisted):** 15 June 2026
- Currently building Phase-1 MVP. Phase-1 scope is **locked** (PROJECT.md §9).
  Do not add features before 27 May.

---

## Tech stack (decided)

| Layer | Choice |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Frontend | Next.js 15 (App Router) + Tailwind |
| DB | PostgreSQL + pgvector (for RAG over DGDA formulary) |
| File storage | Local disk in dev, S3-compatible in prod |
| AI provider | **Azure OpenAI — `gpt-chat-latest`** (Preview, retires 5 Aug 2026) |
| Auth | TBD (Lucia or Supabase Auth) |
| Payments | bKash + Nagad (later phase) |
| Hosting | DigitalOcean / Hetzner VPS |

---

## AI provider — important

- Endpoint: `https://ai-for-security.services.ai.azure.com/openai/v1`
- Deployment: `gpt-chat-latest` (Azure OpenAI, OpenAI-compatible API)
- Used via official `openai` Python SDK pointed at the Azure base URL
- Capability probe lives at `niro/probe.py` — re-run to verify capability
  after any provider/key change

**All AI calls must go through `niro/backend/ai/provider.py`** (when built).
Never call the OpenAI client directly from feature code. This abstraction is
load-bearing — it's how we swap to Claude/Gemini if Azure becomes unstable.

---

## Repo layout (target)

```
.
├── CLAUDE.md                  # this file
├── PROJECT.md                 # product spec
├── .gitignore
├── .env.example
└── niro/
    ├── .venv/                 # local Python venv (gitignored)
    ├── probe.py               # AI capability probe (keep it working)
    ├── sample_rx.png          # synthetic prescription for probe
    ├── sample_lab.png         # synthetic lab report for probe
    ├── backend/               # FastAPI service (not built yet)
    │   ├── main.py
    │   ├── ai/
    │   │   ├── provider.py        # AIProvider abstract base
    │   │   ├── azure_openai.py    # current implementation
    │   │   └── prompts.py         # system prompts (Bangla-first)
    │   ├── api/                   # FastAPI routers
    │   ├── db/                    # SQLAlchemy models + migrations
    │   └── audit/                 # AI decision audit logging
    └── frontend/              # Next.js app (not built yet)
        ├── app/
        │   ├── (patient)/         # patient-facing routes
        │   └── (doctor)/          # doctor portal routes
        └── components/
```

---

## Hard rules (do not violate)

### Security
- **Never** commit `.env`, real API keys, or any PHI to git.
- All secrets via env vars. `.env.example` shows the template.
- TLS everywhere in prod. No plain HTTP.
- Encrypt patient data at rest in prod. Per-patient encryption key when feasible.

### AI safety
- The AI **never** issues final medical advice. It only:
  - extracts data from documents
  - explains what was prescribed
  - flags concerns and suggests questions for the doctor
- Every AI output must carry a visible disclaimer in the UI:
  *"This is not medical advice. Confirm with a doctor."*
- Every AI call must be logged: timestamp, model version, prompt hash,
  output hash, confidence score. This is the audit trail.
- If confidence drops below threshold, auto-suggest human verification.

### Consent and privacy
- A doctor never sees patient data without explicit, time-bound consent.
- Default consent expiry: 24 hours.
- Every doctor view is logged and visible to the patient.
- Patients have a one-tap "delete my data" button (DPA 2023 right).

### Bangla-first
- All patient-facing output defaults to Bangla.
- Use Bangla numerals (২৪৫) for medical values when possible — feels native.
- English is a toggle, not the default.

---

## Build / run commands

Will be filled in as code lands. Today:

```bash
# Run the AI capability probe (sanity check the model is alive)
cd niro
AZURE_OPENAI_KEY=<key> .venv/bin/python probe.py

# Use a different deployment for the probe
AZURE_OPENAI_KEY=<key> AZURE_OPENAI_DEPLOYMENT=gpt-chat-latest .venv/bin/python probe.py
```

---

## Conventions

- Python: ruff + black defaults. Type hints required on public functions.
- TypeScript: strict mode on. Prefer server components in Next.js.
- Commits: imperative mood, scope prefix where helpful (`backend:`, `frontend:`,
  `ai:`). Don't bundle unrelated changes.
- One concern per PR. Phase-1 deadline is tight — small, reviewable diffs win.

---

## What NOT to do here

- Don't introduce a new AI provider client — extend `AIProvider` instead.
- Don't log raw patient document contents at INFO/WARN. Only hashes + IDs.
- Don't add features outside PROJECT.md §9 before 27 May.
- Don't write defensive fallbacks for impossible scenarios. Trust the schema.
- Don't write multi-paragraph docstrings or comment blocks. One-line max.

---

## When stuck

- Product question → read `PROJECT.md`.
- "Will the model handle X?" → re-run `niro/probe.py` with a test case for X.
- Scope creep temptation → re-read PROJECT.md §12 (decisions already locked).
