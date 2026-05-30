# CLAUDE.md — Niro engineering memory

Auto-loaded into every Claude Code session in this repo. Keep dense and
engineering-focused. Product spec is `PROJECT.md`. Don't duplicate it.

---

## What this project is

**Niro** — patient-owned medical record + AI document analyzer (Bangla)

- on-demand doctor verification. Submitted to **IEEE ICADHI 2026 Project
  Showcase, Track 1** (AI-Driven Telemedicine).

Full product spec: `PROJECT.md`. System design: `DESIGN.md`.
Generic-agent guidance: `AGENTS.md` (this complements that file).

---

## Status (live)

| Phase                            | Window          | Status                               |
| -------------------------------- | --------------- | ------------------------------------ |
| A — Foundation                   | 23 May (Day 1)  | ✅ **Merged** (PR #1)                |
| B — AI + upload                  | 23 May          | ✅ **Merged** (PR #2)                |
| C — Profile + verification       | 23 May          | ✅ **Merged** (PR #3)                |
| D — Chamber + directory + polish | 23 May          | ✅ **Merged** (PR #4)                |
| **E — Video submission**         | 27 May          | ⏳ **User action** — record + submit |
| F — Live-demo polish             | 28 May – 14 Jun | Conditional on 30 May shortlist      |
| G — Demo day                     | 15 Jun          | Conditional                          |

**Phase 1 build is feature-complete on `main`.** When picking up a new
session: read `docs/build-log.md` Day 4 entry first, then Day 5 (issue
fixes loop, currently active — see "Issue-fix workflow" section below).
Day-5 fixes already shipped the public landing rebuild, SaaS auth, the
authenticated patient shell/dashboard, the doctor onboarding +
verified-doctor dashboard, and PDF vision support (Fix #8 — PyMuPDF
rasterization at 200 DPI, 5-page cap). Three post-Phase-1 **features**
(not fixes) have merged: document chat + prompt-with-upload (D-014,
PR #8 — `conversations`/`chat_messages` tables, `/api/v1/conversations`
router, `chat_about_analysis` provider method, chat panel on the
analysis page); and the longitudinal medical-profile layer (D-015 +
D-016, commit `5f853a4` — report-type records, original-file download,
trendable `health_metrics`, `/records` + `/trends` pages, doctor
case-view metrics + consent-gated hardcopy download).

---

## Live tech stack (what's actually installed)

| Layer       | Locked version                                                                                   | Notes                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Python      | 3.12.3 (system)                                                                                  | Managed by `uv`                                                                                                                |
| Dep manager | `uv` 0.11.x                                                                                      | 10-100× faster than pip; venv at `niro/.venv`                                                                                  |
| Backend     | FastAPI 0.115, SQLAlchemy 2.0.49, Alembic 1.14, psycopg 3 (binary), pydantic-settings, structlog | Sync routes by design — see D-008                                                                                              |
| AI provider | Azure OpenAI `gpt-chat-latest` (Preview, retires 5 Aug 2026)                                     | Endpoint `https://ai-for-security.services.ai.azure.com/openai/v1`. **Use `Authorization: Bearer ...` header, not `api-key:`** |
| DB          | `postgres:16.3-alpine3.20` (cached locally — see D-007)                                          | pgvector deferred; Phase 1 has no vector queries                                                                               |
| Frontend    | **Next.js 16.2.6** (App Router, Turbopack default), React 19.2, Tailwind 4                       | See "Next.js 16 gotchas" below                                                                                                 |
| Auth        | Patient signup/password login/reset + legacy OTP, doctor application + OTP for seeded doctors, JWT HS256 | Passwords use Argon2id (D-012); OTP storage uses sha256(salt:code) (D-009). Dev doctor applications auto-verify when `APP_ENV != "prod"` |
| Hosting     | **LIVE: https://nirobd.tech** — Azure VM, single-domain (Caddy path-routes `/api/*`→:8000, else→:3000), systemd | Deploy updates with `./deploy.sh` on the VM. Single-origin ⇒ **no CORS**; relative API base. See `docs/deployment/`. |

---

## ⚠️ Next.js 16 gotchas — read before frontend code

These are the breaking changes from Next.js 14/15 that the model's
training may not reflect:

1. **Turbopack is default.** `next dev` and `next build` use it without flags. Don't add `--turbopack`.
2. **Async request APIs.** `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are now **Promises**. Pages with dynamic routes must:
   ```ts
   export default async function Page(props: PageProps<"/blog/[slug]">) {
     const { slug } = await props.params;
   }
   ```
   We use the `use(params)` hook in client components per `app/analyses/[id]/page.tsx`.
3. **`next lint` removed.** Use ESLint CLI directly (`npx eslint .`) or Biome. `next build` no longer lints.
4. **`middleware.ts` is now `proxy.ts`.** Edge runtime is **NOT** supported in `proxy`; runtime is `nodejs`.
5. **`images.domains` deprecated.** Use `images.remotePatterns`.
6. **`serverRuntimeConfig` / `publicRuntimeConfig` removed.** Use env vars + `connection()` from `next/server`.
7. **PPR via `cacheComponents: true`** at top-level config (not `experimental.ppr`).
8. **`revalidateTag` requires 2 args** now — pass a `cacheLife` profile.
9. **`allowedDevOrigins`** needed in `next.config.ts` for non-`localhost` dev access (we have `["127.0.0.1"]` set).
10. **`next dev` output is `.next/dev`**, not `.next`. Build output is `.next/`.
11. **`AGENTS.md` + `CLAUDE.md` in `niro/frontend/`** are Next's own warnings — **don't delete**.

When in doubt, read the local Next.js docs:
`niro/frontend/node_modules/next/dist/docs/01-app/01-getting-started/`.

---

## ⚠️ Tailwind 4 gotchas

- No `tailwind.config.ts` file. Theme tokens live in `globals.css` under `@theme inline { ... }`.
- Import via `@import "tailwindcss";` (not `@tailwind base; @tailwind components;`).
- `@tailwindcss/postcss` plugin is required.
- Custom CSS variables on `:root` flow through to `@theme inline` aliases.

---

## Theme tokens (post-Fix-#1 — 23 May)

Live palette in `niro/frontend/src/app/globals.css`. Light-mode only (the
`prefers-color-scheme: dark` override was removed in Fix #1). New pages
should use these tokens, not hard-coded hex values.

| Token                  | Hex       | Use                                       |
| ---------------------- | --------- | ----------------------------------------- |
| `--color-background`   | `#fafaf7` | Page background (warm off-white)          |
| `--color-foreground`   | `#1a1f1c` | Body text (slightly green-tinted black)   |
| `--color-primary`      | `#0f7b4a` | Buttons, links, hero accents              |
| `--color-primary-hover`| `#0a5e38` | Primary hover state                       |
| `--color-muted`        | `#6b7570` | Secondary text, captions                  |
| `--color-card`         | `#ffffff` | Card / panel backgrounds                  |
| `--color-card-border`  | `#e7e5df` | Card / section dividers                   |
| `--color-accent-soft`  | `#e8f4ed` | Soft tints (badges, hero blur shapes)     |
| `--color-accent`       | `#0f7b4a` | **Alias** of `--color-primary` — kept so existing `text-accent`/`bg-accent` utility classes on patient + doctor pages keep working without a churn-fix |

Apply via arbitrary values: `className="bg-[var(--color-primary)] text-white"`,
or via Tailwind utilities (`bg-primary`, `text-muted`, etc.) generated
from `@theme inline`. Both work because the tokens live on `:root`.

**Don't:**
- Don't reintroduce a `prefers-color-scheme: dark` override (light-mode is locked — see D-011).
- Don't add a hex literal where a token would do.
- Don't repurpose `--color-accent` as a separate hue — it's an alias.

---

## AI provider — operational reality

- Calls go through the `openai` Python SDK pointed at the Azure base URL
  (see `niro/probe.py` for the exact pattern, ported into `niro/backend/ai/azure.py`).
- Vision works via `image_url` content blocks with `data:` URIs (base64).
- `response_format={"type":"json_object"}` for structured output.
- Function/tool calling works.
- Bangla output uses Bangla numerals (২৪৫) natively — high quality.
- Content moderation does **not** flag medical content on this deployment (probed and confirmed).
- Latency: ~1.5s for small calls; **8–24s for vision + structured + history-aware output** (acceptable for demo).
- **Confidence threshold 0.5** — analyses below this set `recommend_human_review=True` in the UI.
- **Banned-phrase linter** (`backend/ai/policy.py`) catches imperative dosing language in Bangla + English. Raises `AIPolicyViolation` → audited.

If `gpt-chat-latest` ever fails: swap `AI_PROVIDER=claude` or `gemini`
in `.env`. The factory `backend.ai.provider.get_provider()` is the
single switch point.

---

## Repo layout (current)

```
.
├── PROJECT.md                    # product spec (canonical, don't rewrite)
├── DESIGN.md                     # system design dossier (canonical)
├── DESIGN_PROMPT.md              # design brief
├── CLAUDE.md                     # this file
├── AGENTS.md                     # generic-agent guidance (Claude/Codex)
├── .gitignore
├── .env.example                  # committed template
├── .env                          # gitignored, holds Azure key
├── docker-compose.yml            # Postgres (alpine)
├── docs/                         # 29+ engineering docs
├── .claude/
│   ├── skills/niro/SKILL.md      # Niro project skill
│   └── settings.local.json       # gitignored
└── niro/
    ├── .venv/                    # uv venv, gitignored
    ├── alembic.ini
    ├── probe.py                  # AI capability probe (6/6 passing)
    ├── sample_rx.png, sample_lab.png
    ├── backend/                  # FastAPI service
    │   ├── pyproject.toml
    │   ├── main.py               # app, structlog, CORS, all routers wired
    │   ├── config.py             # pydantic-settings, reads ../.env
    │   ├── db/
    │   │   ├── base.py
    │   │   ├── session.py        # sync engine + SessionLocal + get_db
    │   │   ├── models.py         # current SQLAlchemy models
    │   │   └── migrations/       # revisions through c5f4e8d20a17 (phase E: health_metrics)
    │   ├── ai/
    │   │   ├── provider.py       # AIProvider ABC + factory
    │   │   ├── azure.py          # AzureOpenAIProvider concrete impl
    │   │   ├── prompts.py        # versioned Bangla prompts (rx, lab, history, case)
    │   │   └── policy.py         # banned-phrase linter
    │   ├── services/
    │   │   ├── audit.py          # AuditWriter (append-only)
    │   │   ├── consent.py        # ConsentGuard.require + record_access
    │   │   ├── storage.py        # local blob writer with sha256
    │   │   └── auth.py           # JWT, password hashing, current_user, role/verified-doctor deps
    │   ├── api/routers/
    │   │   ├── auth.py           # signup, password login/reset, doctor apply, OTP, refresh/logout
    │   │   ├── documents.py      # upload, list, get, delete, download (consent-gated for doctors — D-015)
    │   │   ├── analyses.py       # AI analyze (history-aware, user_prompt, report_type/date + metric extraction) + list + get
    │   │   ├── chat.py           # per-analysis conversation: get thread, post message (D-014)
    │   │   ├── profile.py        # /me, /me/dashboard, /timeline, /access-log, /me/records, /me/metrics(+/{key}), DELETE /me
    │   │   ├── consent.py        # grant, revoke
    │   │   ├── verifications.py  # request, mock-pay, list, get
    │   │   ├── doctor.py         # status, dashboard, inbox, case view (consent-gated), submit review
    │   │   ├── doctors.py        # public directory + reviews
    │   │   └── chamber.py        # session lifecycle: open, scan, profile, prescription, close
    │   ├── seeds/doctors.py      # 6 BMDC-verified seed
    │   └── tests/                # empty (Phase F2 fills in golden tests)
    └── frontend/                 # Next.js 16 PWA
        ├── package.json          # next 16, react 19, tailwind 4, qrcode.react, html5-qrcode
        ├── next.config.ts        # allowedDevOrigins
        ├── AGENTS.md, CLAUDE.md  # Next.js's own warnings — DON'T DELETE
        └── src/
            ├── app/
            │   ├── layout.tsx, globals.css (print stylesheet), page.tsx (marketing landing — Fix #1)
            │   ├── signin/, signin/otp/, verify/, forgot-password/
            │   ├── (app)/layout.tsx                    # patient authenticated shell
            │   ├── (app)/home/, upload/, timeline/, access-log/
            │   ├── (app)/records/, (app)/records/[type]/    # health records grouped by report_type (D-015)
            │   ├── (app)/trends/, (app)/trends/[key]/       # health-metric trends + inline-SVG chart (D-016)
            │   ├── (app)/analyses/[id]/ (PDF via window.print + chat panel — D-014)
            │   ├── (app)/doctors/, (app)/doctors/[id]/
            │   ├── (app)/verifications/, (app)/verifications/[id]/ (auto-poll)
            │   ├── chamber/scan/, chamber/[token]/
            │   ├── doctor-portal/pending/              # unverified doctor state
            │   └── (doctor)/doctor-portal/             # verified doctor shell
            │       ├── dashboard/
            │       ├── inbox/
            │       ├── cases/[id]/
            │       └── chamber/    # QR + 2s polling state machine
            ├── components/        # EmptyState + app-shell components
            └── lib/
                ├── api.ts          # typed fetch wrapper + all response types
                └── i18n.ts         # toBangla, timeAgoBn
```

---

## Locked decisions (full table)

| ID        | Decision                                                                      | Where it shows up                       |
| --------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| **D-001** | Submit to ICADHI Track 1 (Telemedicine)                                       | ICADHI portal, all demo docs            |
| **D-002** | Keep DESIGN.md intact, add docs/ folder alongside                             | This file structure                     |
| **D-003** | FastAPI + Next.js 16 + Postgres; pgvector deferred                           | All code                                |
| **D-004** | Azure OpenAI `gpt-chat-latest` as primary                                     | `.env`, `backend/ai/azure.py`           |
| **D-005** | Project name = Niro                                                           | Everywhere                              |
| **D-006** | Phase A docs-skeleton-first                                                   | Done                                    |
| **D-007** | Use `postgres:16.3-alpine3.20` for Phase A; pgvector deferred                 | `docker-compose.yml`                    |
| **D-008** | Sync SQLAlchemy 2.0 (not async)                                               | `backend/db/session.py`                 |
| **D-009** | OTP storage: `sha256(salt:code)` (not bcrypt) — passlib + bcrypt 5.x incompat | `backend/api/routers/auth.py`           |
| **D-010** | PDF "export" via browser print stylesheet (not WeasyPrint)                    | `globals.css`, `analyses/[id]/page.tsx` |
| **D-011** | Landing `/` is a full marketing site (6 sections, light-mode only, no global disclaimer banner) | `app/page.tsx`, `app/globals.css`, `app/layout.tsx` |
| **D-012** | Password hashing via Argon2id (`argon2-cffi`) | `services/auth.py`, `routers/auth.py`, migration `0004` |
| **D-013** | PDF rasterization via PyMuPDF (AGPL, swap to pypdfium2 before commercial launch — see OQ-17) | `backend/ai/azure.py` (`_data_uris_for`, `_PDF_MAX_PAGES=5`, `_PDF_DPI=200`), `backend/ai/provider.py` (`DocumentReadError`), `backend/api/routers/analyses.py` |
| **D-014** | Document chat + prompt-with-upload: text-grounded (reads stored analysis, not re-sent image), blocking, one conversation per analysis | `backend/db/models.py` (`Conversation`, `ChatMessage`), migration `7c1a9f4b2e10`, `backend/ai/prompts.py` (`CHAT_PROMPT_BN`), `backend/ai/azure.py` (`chat_about_analysis`), `backend/api/routers/chat.py`, `frontend/src/components/AnalysisChat.tsx` |
| **D-015** | Report-type-aware health records + original-file download: AI classifies fine-grained `report_type` + `report_date` onto `Analysis`; `/me/records` groups by type; `/documents/{id}/download` (patient-owner direct, doctor consent-gated) | `backend/db/models.py` (`Analysis.report_type`/`report_date`), migration `b3e2d7a91c44`, `backend/ai/azure.py` (`_clean_report_type`/`_clean_iso_date`), `backend/api/routers/{analyses,documents,profile}.py`, `frontend/src/app/(app)/records/`, `frontend/src/lib/api.ts` (`getRecords`, `downloadDocument`) |
| **D-016** | Health-metrics trend layer: lab values extracted into `health_metrics` (canonical `metric_key` vocabulary, numeric value + ref range, forward-only); `/me/metrics`(+`/{key}`) with computed directional trend insight; `/trends` pages + inline-SVG chart; doctor case-view metrics | `backend/db/models.py` (`HealthMetric`), migration `c5f4e8d20a17`, `backend/ai/prompts.py` (lab-bn-v1.2), `backend/api/routers/{analyses,profile,doctor}.py`, `frontend/src/app/(app)/trends/`, `frontend/src/app/(app)/home/page.tsx` (`HealthMetricsWidget`), `frontend/src/lib/api.ts` (`getMetrics`, `getMetricHistory`) |

See `docs/decisions.md` for rationale + alternatives on each.

---

## Hard rules (do not violate)

### Security

- Never commit `.env`, real API keys, or PHI to git.
- All secrets via env vars. `pydantic-settings` is the only allowed reader.
- TLS everywhere in prod. No plain HTTP.
- PHI columns marked **★** in `niro/backend/db/models.py`.

### AI safety

- AI never gives final medical advice — only extracts, explains, flags.
- Every AI call logged via `services.audit.record()` with: model+version, prompt SHA256, output SHA256, confidence, timestamp.
- `recommend_human_review` flag surfaces in UI when confidence < 0.5.
- `policy.assert_compliant()` runs on every AI return; violation → audit + 422.
- **Disclaimer copy lives on the AI result pages, not globally.** The standalone `DisclaimerBanner` component was deleted in Fix #1 (it was visually heavy on every screen). The visible "this is not medical advice" message must still appear in any UI that shows AI output — see `app/analyses/[id]/page.tsx` for the pattern, and add an inline disclaimer on any new AI-output surface.

### Consent and privacy

- Doctor never sees patient data without explicit, time-bound consent.
- Default consent expiry: 24h (verification flow) / 2h (chamber flow).
- Every doctor view logged via `consent.record_access()` → both `access_logs` (patient-visible) and `audit_log` (forensic).
- Patient can delete all their data via `DELETE /api/v1/me` (DPA 2023 compliant).
- Doctor portal patient-data routes use `require_verified_doctor`; pending doctors can only see `/doctor-portal/pending` and `/doctor/status`.

### Bangla-first

- Default UI language is Bangla. English is a toggle (Phase F).
- Use Bangla numerals (২৪৫) via `lib/i18n.ts toBangla()`.
- Body font: Noto Sans Bengali via `next/font/google`.
- OpenType ligature features set in `globals.css`.

---

## Build / run / verify commands

```bash
# Start Postgres
docker compose up -d postgres

# Backend (terminal 1)
cd niro
source .venv/bin/activate
alembic -c alembic.ini upgrade head    # current head: c5f4e8d20a17
python -m backend.seeds.doctors        # idempotent; seeds 6 doctors
uvicorn backend.main:app --reload --port 8000

# Frontend (terminal 2)
cd niro/frontend
npm run dev                            # http://localhost:3000

# Verify backend
curl http://localhost:8000/api/v1/health        # → {"ok":true,...}

# AI probe (any time)
cd niro
set -a && source ../.env && set +a
.venv/bin/python probe.py              # → 6/6 tests passed

# Frontend type-check
cd niro/frontend && npx tsc --noEmit   # → exit 0

# Open psql
docker compose exec postgres psql -U niro -d niro

# See audit log activity
docker compose exec -T postgres psql -U niro -d niro \
  -c "SELECT event, count(*) FROM audit_log GROUP BY event ORDER BY count(*) DESC;"

# Deploy latest main to prod (run ON the VM, /opt/niro)
./deploy.sh                            # ff-pull + selective rebuild/migrate/restart + health-check
```

**Prod is live at https://nirobd.tech** (Azure VM, single-domain). Code
updates: SSH to the VM and run `./deploy.sh` (never touches `.env`,
no-ops when up to date, refuses on a dirty tree). Single-origin path
routing means **no CORS config in prod** and a relative `NEXT_PUBLIC_API_BASE`.
Full guide + Caddyfile/systemd templates in `docs/deployment/`.

---

## Conventions

- Python: ruff + black defaults; type hints on public functions.
- TypeScript: strict mode on. Default to server components; mark client with `"use client"` only when needed.
- Commits: imperative mood with scope prefix (`backend:`, `frontend:`, `ai:`, `docs:`, `phase-<x>:`, `fix:`).
- One concern per PR. Each phase is squashed-merged.
- Update `docs/build-log.md` at the end of every session.

---

## Issue-fix workflow (active since 23 May — see Day 5 build-log)

Phase 1 build is on `main`. The current loop is **branch-per-issue fixes
driven by the user**. Future agents picking up mid-loop must follow this
algorithm — do not commit fixes directly to `main`:

1. **Branch off `main`:** `git checkout main && git checkout -b fix/<short-slug>`.
2. **Investigate** the targeted files only. Confirm the issue before editing.
3. **Edit** uncommitted; dev server hot-reloads. Report which files changed.
4. **User verifies** in the browser. They say "approved" or describe what's still wrong.
5a. **Approved** → commit on branch → `git checkout main && git merge --squash fix/<slug>` → squash commit with `fix(<scope>): <summary> (#fix-N)` → delete branch → append a Day-5 entry to `docs/build-log.md` → push only when the user explicitly asks.
5b. **Rejected** → `git restore .` (small tweak) or `git checkout main && git branch -D fix/<slug>` (wrong approach), then iterate.

The full workflow plan lives at `/home/l0minex/.claude/plans/twinkly-inventing-pebble.md` v2.0.
`main` is the safety net — never force-push, never `git reset --hard main`.

---

## What NOT to do here

- Don't introduce a new AI provider client outside `backend/ai/`. Extend `AIProvider`.
- Don't log raw patient documents at INFO/WARN. Hashes + IDs only.
- Don't add features outside the current phase scope without updating `docs/decisions.md`.
- Don't write defensive fallbacks for impossible scenarios. Trust the schema.
- Don't write multi-paragraph docstrings or comment blocks. One line max.
- Don't use Next.js 14/15 patterns (sync `params`, `next lint`, `middleware.ts`).
- Don't use `tailwind.config.ts` — Tailwind 4 uses `@theme inline`.
- Don't reach for bcrypt for short-lived secrets (D-009), and don't replace Argon2id for user passwords (D-012).
- Don't try to use `images.domains` (deprecated in Next 16).
- Don't pull `pgvector/pgvector:pg16` blindly — Docker Hub IPv6 is broken on this network (D-007).
- **Don't recreate `DisclaimerBanner`** — deleted in Fix #1 (D-011). If you need to add a disclaimer on an AI-output page, render it inline at the top of that page.
- **Don't reintroduce dark mode** for Phase 1 — the `prefers-color-scheme: dark` override was removed in Fix #1 (D-011). Light-mode only until explicitly reopened.
- **Don't commit a fix directly to `main`** — use the issue-fix workflow above (branch per issue → squash-merge after user approval).
- **Don't put authenticated patient/doctor pages back at top-level routes** — keep patient pages under `(app)` and verified doctor pages under `(doctor)`. Route groups preserve URLs.

---

## When stuck

- Product question → read `PROJECT.md`.
- Architecture question → read `DESIGN.md §<N>`.
- "Will the model handle X?" → re-run `niro/probe.py` with a test case.
- Scope creep temptation → re-read `docs/decisions.md`.
- "How was X last done?" → grep `docs/build-log.md`.
- "What routes exist?" → see `docs/architecture/api-surface.md` or run `python -c "from backend.main import app; ..."`.
- AI returning 401 → check `.env` `AZURE_OPENAI_KEY` for trailing whitespace/typos. See `docs/build-log.md` Day 2 for the diagnostic curl.
