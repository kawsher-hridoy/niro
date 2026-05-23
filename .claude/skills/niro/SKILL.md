---
name: niro
description: Use when working on the Niro health-app codebase — implementing features (AI document analysis, patient profile, doctor verification, consent flow, audit log), debugging the AI provider integration, or reasoning about ICADHI submission constraints. Knows Niro's locked Phase-1 scope, AI safety rules, Bangla-first conventions, current Phase status, Next.js 16 gotchas, and Azure OpenAI setup.
---

# Niro project skill

Use this when work touches Niro (the IEEE ICADHI 2026 health app in this
repo). Reflects state **as of end of Phase A — 23 May 2026**.

## What Niro is in one sentence

Patient-owned medical record + AI document analyzer (Bangla) + on-demand
doctor verification, built for Bangladesh.

Full product spec: `PROJECT.md` (root).
System design: `DESIGN.md` (root).
Engineering memory loaded automatically: `CLAUDE.md` (root).
Live engineering docs: `docs/` folder.

## Current Phase status

| Phase | Status |
|---|---|
| A — Foundation (docker-compose, FastAPI scaffold, Next.js scaffold, docs/, first migration) | **Complete** — PR #1 |
| B — AI integration + upload path | Next up |
| C–E — Profile, chamber, video submission | Pending |

Read `docs/build-log.md` last entry first when picking up.

## Key constraints to keep in mind

1. **Phase-1 video deadline: 27 May 2026.** Final demo: 15 June 2026.
   Phase-1 scope is locked in `DESIGN.md §12` and `docs/decisions.md D-006`.
2. **AI never gives final medical advice.** Only extracts, explains, flags.
3. **Bangla is the default output language.** Bangla numerals (২৪৫) where natural.
4. **Every AI call logged** with model version, prompt hash, output hash, confidence, timestamp.
5. **Every doctor view of patient data requires explicit, time-bound consent.**
   Default expiry: 24 hours. Patient sees an access log.
6. **Never commit secrets.** All keys via env vars. `.env` is gitignored.

## Locked architectural decisions

| ID | Decision | Source |
|---|---|---|
| D-001 | Submit to ICADHI Track 1 — Telemedicine | `docs/decisions.md` |
| D-002 | Keep DESIGN.md intact, add docs/ alongside | same |
| D-003 | FastAPI + Next.js 15 (now 16) + Postgres + pgvector | same |
| D-004 | Azure OpenAI `gpt-chat-latest` as primary AI | same |
| D-005 | Project name = Niro | same |
| D-006 | Phase A docs-skeleton-first before coding | same |
| **D-007** | **Phase A uses `postgres:16.3-alpine3.20` (Docker Hub IPv6 blocked); pgvector deferred to Phase C** | same |
| **D-008** | **Sync SQLAlchemy 2.0 (not async)** | same |

When making a new architectural decision, append `D-NNN` to `docs/decisions.md`. For load-bearing decisions, also create an ADR in `docs/adr/`.

## AI provider — what works right now

- **Provider:** Azure OpenAI, deployment `gpt-chat-latest` (Preview, retires 5 Aug 2026).
- **Endpoint:** `https://ai-for-security.services.ai.azure.com/openai/v1`
- **Account caveat:** under `jamontedominguez105@gmail.com`, not the user's. Fine for ICADHI; migrate post-final.
- **Capability probe:** `niro/probe.py`. Last result: **6/6 passing**, latency 1.32s.
- **Re-run after any key/provider/model change.** Tests Bangla quality, JSON output, vision on prescription, vision on lab report + Bangla explanation, function calling, latency.
- **Pattern to port to backend:** see probe for the exact `OpenAI(base_url=..., api_key=...)` construction, `response_format={"type":"json_object"}`, base64 image encoding for vision, function/tool calling.

## Current code paths (what exists, where)

### Backend

| Path | Purpose | Phase that wrote it |
|---|---|---|
| `niro/backend/pyproject.toml` | FastAPI 0.115, SQLAlchemy 2.0.49, Alembic, openai, psycopg 3, structlog, pydantic-settings, python-jose, passlib, qrcode, httpx | A |
| `niro/backend/main.py` | FastAPI app, `/api/v1/health`, structlog config, CORS for localhost:3000, lifespan handler | A |
| `niro/backend/config.py` | `Settings` via pydantic-settings reading `.env`. **Never read os.environ directly elsewhere** | A |
| `niro/backend/db/base.py` | `DeclarativeBase` | A |
| `niro/backend/db/session.py` | `engine`, `SessionLocal`, `get_db` dependency. Sync. | A |
| `niro/backend/db/models.py` | `User`, `OtpCode`, `PatientProfile`, `DoctorProfile`, `Document`. PHI inline-marked (★). | A |
| `niro/backend/db/migrations/env.py` | Reads DB URL from `backend.config`, imports `db.models` so autogenerate sees them | A |
| `niro/alembic.ini` | `script_location = backend/db/migrations`; `prepend_sys_path = .` | A |
| `niro/backend/ai/` | **empty — Phase B target** | — |
| `niro/backend/api/routers/` | **empty — Phase B target** | — |
| `niro/backend/services/` | **empty — Phase B target (`AuditWriter`, `ConsentGuard`)** | — |
| `niro/backend/tests/` | **empty — Phase B target (golden tests)** | — |

### Frontend

| Path | Purpose |
|---|---|
| `niro/frontend/package.json` | Next.js 16.2.6, React 19.2, Tailwind 4 |
| `niro/frontend/next.config.ts` | `allowedDevOrigins: ["127.0.0.1"]` |
| `niro/frontend/src/app/layout.tsx` | Noto Sans Bengali, `lang="bn"`, global `<DisclaimerBanner/>` |
| `niro/frontend/src/app/globals.css` | Tailwind 4 (`@theme inline`), Bangla OpenType ligature features |
| `niro/frontend/src/app/page.tsx` | Niro landing with 3 Bangla feature cards |
| `niro/frontend/src/components/DisclaimerBanner.tsx` | Always-on Bangla disclaimer |
| `niro/frontend/AGENTS.md` | **Next.js's own warning — don't delete** |
| `niro/frontend/CLAUDE.md` | references AGENTS.md |

## ⚠️ Next.js 16 — read before frontend code

Pre-2026 training data has Next.js 14/15 patterns. v16 changed several things — see `CLAUDE.md` "Next.js 16 gotchas" for the full list. The big ones:

- Turbopack default (don't pass `--turbopack`)
- **Async `params` and `searchParams`** — must `await` them in pages
- `next lint` removed → use ESLint CLI
- `middleware.ts` → `proxy.ts` (Node runtime only)
- `images.domains` → `images.remotePatterns`
- `allowedDevOrigins` required for non-`localhost` dev access

## ⚠️ Tailwind 4 — also new

No `tailwind.config.ts` file. Theme is in `globals.css` under `@theme inline { ... }`.

## Code patterns to follow

### Calling the AI (Phase B+)

```python
# Good (post-Phase-B)
from backend.ai.provider import get_provider
result = get_provider().analyze_document(image_bytes, mime="image/png")

# Bad — never call OpenAI client directly from feature code
from openai import OpenAI
client = OpenAI(...)
client.chat.completions.create(...)
```

### Audit logging (Phase B+)

Every AI call goes through a wrapper that records:
- model name + version
- prompt content hash (sha256, not the prompt itself)
- output content hash
- confidence score
- patient_id (FK, never PHI)
- timestamp

PHI must never appear in logs at INFO or WARN level. Use the redaction
middleware from `backend.middleware.logging` (Phase B).

### Consent check (Phase B+)

Before any code path that surfaces patient data to a doctor:

```python
consent_guard.require(patient_id=p, doctor_id=d, context="async_review")
consent_guard.record_access(patient_id=p, doctor_id=d, view="case_summary")
```

Enforced at the repository layer, not the route layer.

### Bangla output (Phase B+)

System prompts in `backend/ai/prompts.py` explicitly request Bangla and
discourage English mixing. Bangla numerals where natural.

### Frontend page with dynamic params (Phase B+)

```tsx
// Next.js 16 — params is a Promise
export default async function Page(props: PageProps<'/analyses/[id]'>) {
  const { id } = await props.params
  // ...
}
```

## Anti-patterns to avoid

- Calling the OpenAI client directly from anywhere except `backend/ai/`.
- Logging raw patient documents.
- Writing defensive checks for AI returning malformed JSON without first using `response_format={"type":"json_object"}`.
- Adding features beyond current phase scope (DESIGN.md §12).
- Routing doctor screens that don't check consent.
- English-default UI. Bangla is the default; English is a toggle.
- Long docstrings or multi-line comment blocks. One-line max.
- Using Next.js 14/15 patterns — read CLAUDE.md "Next.js 16 gotchas".
- Adding a `tailwind.config.ts` — Tailwind 4 uses `@theme inline`.

## Common operations

| Task | How |
|---|---|
| Bring up Postgres | `docker compose up -d postgres` (from repo root) |
| Apply migrations | `cd niro && source .venv/bin/activate && alembic -c alembic.ini upgrade head` |
| New migration | `alembic -c alembic.ini revision --autogenerate -m "<message>"` then review the generated file before committing |
| Run backend | `cd niro && source .venv/bin/activate && uvicorn backend.main:app --reload --port 8000` |
| Run frontend | `cd niro/frontend && npm run dev` |
| Re-run AI probe | `cd niro && set -a && source ../.env && set +a && .venv/bin/python probe.py` |
| Add Python dep | `cd niro && source .venv/bin/activate && uv pip install <pkg>`; then add to `backend/pyproject.toml` |
| Add npm dep | `cd niro/frontend && npm install <pkg>` |
| Format Python | `ruff check --fix niro/backend && ruff format niro/backend` |
| Open psql | `docker compose exec -it postgres psql -U niro -d niro` |
| Check current branch + status | `git status --short && git log --oneline -5` |

## When this skill is helpful

- "Add an AI explanation for X document type"
- "The probe failed — why?"
- "Swap to Claude as a fallback"
- "Build the consent dialog"
- "Add an audit log entry for the doctor verification screen"
- "What does ICADHI Phase-1 require?"
- "Can I add feature Y before the deadline?" → answer is usually no; read `DESIGN.md §12`
- "How do I write a new migration?"
- "Why is the frontend rendering boxes for Bangla text?"
- "How do I scaffold a new router?"

## When this skill is NOT helpful

- Generic Python or Next.js questions unrelated to Niro
- ICADHI website / registration help (already done)
- Pre-Niro AI provider research (decided — Azure OpenAI)
