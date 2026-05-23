# CLAUDE.md — Niro engineering memory

Auto-loaded into every Claude Code session in this repo. Keep dense and
engineering-focused. Product spec is `PROJECT.md`. Don't duplicate it.

---

## What this project is

**Niro** — patient-owned medical record + AI document analyzer (Bangla)
+ on-demand doctor verification. Submitted to **IEEE ICADHI 2026 Project
Showcase, Track 1** (AI-Driven Telemedicine).

Full product spec: `PROJECT.md`. System design: `DESIGN.md`.
Implementation plan: see commit history + `docs/decisions.md`.

---

## Status (live)

| Phase | Window | Status |
|---|---|---|
| A — Foundation | 23 May (Day 1) | **Complete** — PR #1 merged onto `main` |
| B — AI + upload | 24 May (Day 2) | Pending |
| C — Profile + verification | 25 May (Day 3) | Pending |
| D — Chamber + directory + polish | 26 May (Day 4) | Pending |
| E — Submit Phase-1 video | 27 May (Day 5) | Pending |
| F — Live-demo polish | 28 May – 14 Jun | Conditional on 30 May shortlist |
| G — Demo day | 15 Jun | Conditional |

When picking up a session: read `docs/build-log.md` last entry first.

---

## Live tech stack (what's actually installed, not what was planned)

| Layer | Locked version | Notes |
|---|---|---|
| Python | 3.12.3 (system) | Managed by uv |
| Dep manager | `uv` 0.11.x | 10-100× faster than pip |
| Backend | FastAPI 0.115, SQLAlchemy 2.0.49, Alembic 1.14, psycopg 3 (binary), pydantic-settings, structlog | Sync routes by design — see D-008 |
| AI provider | Azure OpenAI `gpt-chat-latest` (Preview, retires 5 Aug 2026) | Endpoint `https://ai-for-security.services.ai.azure.com/openai/v1`. Account is not user's — `jamontedominguez105@gmail.com`, fine for ICADHI, migrate post-final |
| DB | `postgres:16.3-alpine3.20` (cached locally, not pgvector — see D-007) | Phase A migrations don't need vectors; swap in Phase C |
| Frontend | **Next.js 16.2.6** (App Router, Turbopack default), React 19.2, Tailwind 4 | Newer than the plan said; see "Next.js 16 gotchas" below |
| Auth | Phone OTP (mock `123456` in dev) | JWT planned in Phase B |
| Hosting | Local dev now, single VPS later (Caddy + systemd) | Phase F4 |

---

## ⚠️ Next.js 16 gotchas — read before writing frontend code

These are the breaking changes from Next.js 14/15 that the model's
training may not reflect:

1. **Turbopack is default.** `next dev` and `next build` use it without flags. Don't add `--turbopack`.
2. **Async request APIs.** `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are now **Promises**. Pages with dynamic routes must:
   ```ts
   export default async function Page(props: PageProps<'/blog/[slug]'>) {
     const { slug } = await props.params
   }
   ```
3. **`next lint` removed.** Use ESLint CLI directly (`npx eslint .`) or Biome. `next build` no longer lints.
4. **`middleware.ts` is now `proxy.ts`.** Same idea, different name. Edge runtime is **NOT** supported in `proxy`; runtime is `nodejs`.
5. **`images.domains` deprecated.** Use `images.remotePatterns`.
6. **`serverRuntimeConfig` / `publicRuntimeConfig` removed.** Use env vars + `connection()` from `next/server` for runtime reads.
7. **PPR via `cacheComponents: true`** at top-level config (not `experimental.ppr`).
8. **`revalidateTag` requires 2 args** now — pass a `cacheLife` profile (e.g. `'max'`). Single-arg form deprecated.
9. **`allowedDevOrigins`** needed in `next.config.ts` when dev resources are accessed from anything other than `localhost` (including `127.0.0.1`).
10. **`next dev` output is `.next/dev`**, not `.next`. Build output is `.next/`.
11. **AGENTS.md/CLAUDE.md in `niro/frontend/`** warn AI agents to read `node_modules/next/dist/docs/` before writing code — heed it.

When in doubt, read the local Next.js docs:
`niro/frontend/node_modules/next/dist/docs/01-app/01-getting-started/`.

---

## ⚠️ Tailwind 4 gotchas

- No `tailwind.config.ts` file. Theme tokens live in `globals.css` under `@theme inline { ... }`.
- Import via `@import "tailwindcss";` (not `@tailwind base; @tailwind components;`).
- `@tailwindcss/postcss` plugin is required.
- Custom CSS variables on `:root` flow through to `@theme inline` aliases.

---

## AI provider — operational reality

- Calls go through the `openai` Python SDK pointed at the Azure base URL
  (see `niro/probe.py` for the exact pattern, port to `backend/ai/azure.py` in Phase B).
- Vision works via `image_url` content blocks with `data:` URIs (base64).
- `response_format={"type":"json_object"}` for structured output.
- Function/tool calling works.
- Bangla output is genuinely good — uses Bangla numerals (২৪৫) natively.
- Content moderation does **not** flag medical content on this deployment (probed and confirmed).
- Latency: ~1.5s for small calls, ~3-5s for vision + structured output.

If `gpt-chat-latest` ever fails: swap `AI_PROVIDER=claude` or `gemini`
in `.env`. The provider abstraction at `backend/ai/provider.py` (Phase B)
keeps feature code unaware of which provider is active.

---

## Repo layout (current)

```
.
├── PROJECT.md                    # product spec
├── DESIGN.md                     # system design dossier
├── DESIGN_PROMPT.md              # design brief that produced DESIGN.md
├── CLAUDE.md                     # this file
├── .gitignore
├── .env.example
├── .env                          # gitignored, holds Azure key
├── docker-compose.yml            # Postgres + future pgvector
├── docs/                         # 29 build-time engineering docs
│   ├── README.md
│   ├── dev-setup.md              # how to bring up the whole stack
│   ├── env-vars.md
│   ├── decisions.md              # D-001..D-008 (live, append new)
│   ├── open-questions.md
│   ├── mocks.md                  # Phase-1 safe mocks
│   ├── glossary.md
│   ├── build-log.md              # daily diary, append-only
│   ├── architecture/             # stubs pointing into DESIGN.md
│   ├── ai-safety/                # audit-logging.md is full; others stubs
│   ├── frontend/
│   ├── deployment/
│   ├── demo/                     # video-script, live-script, risk-register, pitch
│   └── adr/0001-template.md
├── .claude/
│   └── skills/niro/SKILL.md      # Niro project skill
└── niro/
    ├── .venv/                    # Python venv (uv-managed, gitignored)
    ├── alembic.ini               # Alembic config — sqlalchemy.url is set from backend.config
    ├── probe.py                  # AI capability probe — 6/6 passing
    ├── sample_rx.png             # synthetic prescription (Phase A test fixture)
    ├── sample_lab.png            # synthetic lab report
    ├── backend/                  # FastAPI service
    │   ├── pyproject.toml
    │   ├── main.py               # app + /api/v1/health
    │   ├── config.py             # pydantic-settings, reads .env
    │   ├── db/
    │   │   ├── base.py           # DeclarativeBase
    │   │   ├── session.py        # engine + SessionLocal + get_db dep
    │   │   ├── models.py         # 5 tables for Phase A
    │   │   └── migrations/       # Alembic env.py + versions/
    │   ├── api/routers/          # empty (Phase B onward)
    │   ├── ai/                   # empty (Phase B)
    │   ├── services/             # empty (Phase B)
    │   └── tests/                # empty
    └── frontend/                 # Next.js 16 PWA
        ├── package.json
        ├── next.config.ts        # allowedDevOrigins: ["127.0.0.1"]
        ├── tsconfig.json
        ├── postcss.config.mjs
        ├── AGENTS.md             # Next.js's own warning — DON'T DELETE
        ├── CLAUDE.md             # references AGENTS.md
        └── src/
            ├── app/
            │   ├── layout.tsx     # Noto Sans Bengali + lang="bn" + <DisclaimerBanner/>
            │   ├── globals.css    # Tailwind 4 @theme + Bangla OpenType features
            │   └── page.tsx       # Niro landing page
            └── components/
                └── DisclaimerBanner.tsx
```

---

## Hard rules (do not violate)

### Security
- Never commit `.env`, real API keys, or PHI to git.
- All secrets via env vars. `pydantic-settings` is the only allowed reader.
- TLS everywhere in prod. No plain HTTP.
- PHI columns marked **★** in `niro/backend/db/models.py`.

### AI safety
- AI never gives final medical advice — only extracts, explains, flags.
- Every AI output carries a visible disclaimer in the UI (we have `DisclaimerBanner`).
- Every AI call logged via `AuditWriter` (Phase B). Audit row has: model+version, prompt SHA256, output SHA256, confidence, timestamp, patient_id (FK).
- If confidence < threshold, auto-suggest human verification.
- Banned-phrase linter (Phase B) catches imperative dosing language.

### Consent and privacy
- Doctor never sees patient data without explicit, time-bound consent (Phase B+).
- Default consent expiry: 24 hours.
- Every doctor view logged, visible to patient.
- Patient can delete all their data (DPA 2023).

### Bangla-first
- Default UI language is Bangla. English is a toggle.
- Use Bangla numerals (২৪৫) for medical values when natural.
- Body font: Noto Sans Bengali via `next/font/google`.

---

## Build / run / verify commands

```bash
# Start Postgres
docker compose up -d postgres

# Backend
cd niro
source .venv/bin/activate
alembic -c alembic.ini upgrade head      # apply migrations
uvicorn backend.main:app --reload --port 8000

# Verify backend
curl http://localhost:8000/api/v1/health   # → {"ok":true,...}

# Frontend (separate terminal)
cd niro/frontend
npm run dev

# Verify frontend
# Open http://localhost:3000 — Bangla landing page with disclaimer.

# AI probe (any time — sanity check the AI provider is alive)
cd niro
.venv/bin/python probe.py     # → 6/6 tests passed
```

---

## Conventions

- Python: ruff + black defaults; type hints on public functions. `ruff check niro/backend` before commit.
- TypeScript: strict mode on. Prefer server components in Next.js; mark client with `"use client"` only when needed.
- Commits: imperative mood with scope prefix (`backend:`, `frontend:`, `ai:`, `docs:`, `phase-<x>:`).
- One concern per PR. Phase deadlines are tight — small, reviewable diffs win.
- Update `docs/build-log.md` at the end of every coding session.

---

## What NOT to do here

- Don't introduce a new AI provider client outside `backend/ai/`. Extend `AIProvider`.
- Don't log raw patient documents at INFO/WARN. Hashes + IDs only.
- Don't add features outside the current phase scope. Check `docs/decisions.md` D-006.
- Don't write defensive fallbacks for impossible scenarios. Trust the schema.
- Don't write multi-paragraph docstrings or comment blocks. One line max.
- Don't use Next.js 14/15 patterns (sync `params`, `next lint`, `middleware.ts`). See gotchas above.
- Don't use `tailwind.config.ts` — Tailwind 4 uses `@theme inline` in CSS.

---

## When stuck

- Product question → read `PROJECT.md`.
- Architecture question → read `DESIGN.md §<N>`.
- "Will the model handle X?" → re-run `niro/probe.py` with a test case.
- Scope creep temptation → re-read `DESIGN.md §12` (decisions locked) and `docs/decisions.md` (live).
- "How was X last done?" → grep `docs/build-log.md`.
