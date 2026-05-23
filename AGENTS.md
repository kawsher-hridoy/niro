# AGENTS.md

Guidance for AI agents working in this repo (Claude Code, OpenAI Codex,
Cursor, Continue, etc.). Claude Code also reads `CLAUDE.md` — read that
first if you are Claude. Other agents: this file is the entry point.

---

## Mission

**Niro** is a patient-owned medical record + AI document analyzer +
on-demand doctor verification platform for Bangladesh. Submitted to
**IEEE ICADHI 2026 Project Showcase, Track 1**.

Phase 1 build is **feature-complete** as of 23 May 2026. The current
work is **iterative issue fixes** (Day 5 in `docs/build-log.md`, driven
by the user — branch per issue, squash-merge after approval) until
27 May submission. Live-demo polish (post-30 May if shortlisted) follows.

---

## Read these before making changes

| Concern | File |
|---|---|
| Product spec — what Niro is | `PROJECT.md` |
| System design — how it's built | `DESIGN.md` |
| Engineering memory (Claude auto-loads) | `CLAUDE.md` |
| This repo's locked decisions | `docs/decisions.md` |
| Open questions still TBD | `docs/open-questions.md` |
| Build progress per day | `docs/build-log.md` |
| Phase-1 mocks (OTP, bKash, BMDC) | `docs/mocks.md` |
| 14-step smoke test | `docs/dev-setup.md §7` |

---

## Hard rules — every agent

1. **AI never gives final medical advice.** Only extracts, explains, flags. `backend/ai/policy.py` enforces this with a banned-phrase linter. Don't loosen it.
2. **Bangla is the default UI language.** Use `lib/i18n.ts toBangla()` for medical values (২৪৫, not 245). Don't introduce English-default copy.
3. **Doctor-side patient-data reads require `ConsentGuard`.** No direct query allowed. See `backend/services/consent.py`.
4. **Every AI call must be audit-logged.** Use `backend/services/audit.record()`. Don't bypass.
5. **No PHI in logs.** INFO/WARN logs carry IDs and hashes only.
6. **No secrets in code or commits.** `.env` is gitignored. `pydantic-settings` is the only allowed reader.

---

## Stack constraints — pre-2026 training data may be wrong about these

- **Next.js 16.2.6** — `params` and `searchParams` are **Promises**. Use `await props.params` in server components or `use(params)` in client components. `next lint` removed; `middleware.ts → proxy.ts`. Turbopack is the default dev runtime. Read `niro/frontend/AGENTS.md` for the local Next.js note. Full list of breaking changes in `CLAUDE.md` "Next.js 16 gotchas".
- **Tailwind 4** — no `tailwind.config.ts`. Theme tokens in `globals.css` under `@theme inline { ... }`. Import via `@import "tailwindcss";`. **Current palette** is documented in `CLAUDE.md` "Theme tokens" — use `--color-primary`, `--color-muted`, `--color-card`, `--color-card-border`, `--color-accent-soft`. `--color-accent` is an alias of `--color-primary` (kept for backward compat). **Light-mode only** (D-011); don't reintroduce a `prefers-color-scheme: dark` override.
- **React 19.2** — use latest patterns. Avoid legacy class components.
- **SQLAlchemy 2.0 sync** — not async (per D-008). FastAPI runs sync `def` routes in a thread pool. Don't introduce `async def` with sync DB calls; pick one consistently per file.
- **Azure OpenAI auth** uses `Authorization: Bearer <key>` (not `api-key:` header) for the `/openai/v1` compatibility endpoint.

---

## Where things are

```
backend/
  ai/          provider abstraction + Azure impl + Bangla prompts + policy linter
  services/    audit, consent, storage, JWT auth
  api/routers/ 29 endpoints across 9 modules
  db/          11 SQLAlchemy models + 3 Alembic migrations
  seeds/       6 BMDC-verified doctors
frontend/
  src/app/             14 pages across patient + doctor portal + chamber; `app/page.tsx` is the post-Fix-#1 marketing landing (6 sections, all subcomponents inline)
  src/components/      empty (DisclaimerBanner deleted in Fix #1 — see D-011; page-local subcomponents live inline in their page.tsx)
  src/lib/             api.ts (typed fetch + all response types) + i18n.ts (Bangla helpers)
```

The detailed map is in `CLAUDE.md` "Repo layout".

---

## Common pitfalls — already burned, don't repeat

- **passlib + bcrypt 5.x** is broken on init. Use `sha256(salt:code)` for OTPs (D-009).
- **Docker Hub IPv6** is unreachable from many BD networks. We use the cached `postgres:16.3-alpine3.20` (D-007).
- **Azure key typos** — the user once pasted with a trailing `s`. If you see HTTP 401, check `.env` key length and last 4 chars. See `docs/build-log.md` Day 2.
- **`max_tokens` rejected by `gpt-chat-latest`** — this is a GPT-5-class model. Use `max_completion_tokens` if you need a limit, or omit (we omit).
- **Frontend dir is `niro/frontend/`, not `frontend/`** — `mkdir frontend/...` from the wrong cwd creates a sibling repo.
- **`DisclaimerBanner` no longer exists** — deleted in Fix #1 (D-011). Don't import it. Inline AI disclaimer copy on result pages instead.
- **Don't recreate `prefers-color-scheme: dark`** — Phase 1 is light-mode only (D-011).
- **Don't commit fixes to `main` directly during the issue-fix loop** — branch per issue, squash-merge after user approval. See CLAUDE.md "Issue-fix workflow".

---

## Conventions

- Commits: imperative, scope-prefixed (`backend:`, `frontend:`, `ai:`, `docs:`, `phase-<x>:`).
- One concern per PR. Squash-merge each phase.
- Update `docs/build-log.md` at the end of every session.
- New decisions → `docs/decisions.md` with `D-NNN`. Load-bearing → ADR in `docs/adr/`.
- Python: ruff + black. TypeScript: strict mode.

---

## How to know your change is good

```bash
# Backend
cd niro && source .venv/bin/activate && pytest         # when tests land in F2
# Frontend
cd niro/frontend && npx tsc --noEmit                   # exit 0

# AI is still alive
cd niro && set -a && source ../.env && set +a && .venv/bin/python probe.py  # 6/6 PASS

# Full smoke (14 steps)
# See docs/dev-setup.md §7
```

---

## Two-agent workflow (post-Phase E)

If running Codex (builder) + Claude (reviewer) per `docs/build-log.md` user notes:

1. **Builder** picks up a task defined in `TODO.md` (one task, sharp exit criteria).
2. Builder commits on a branch and pushes.
3. **Reviewer** runs against `CLAUDE.md` + `DESIGN.md`: matches design? consent-gated? audit-logged? Bangla-first? no PHI in logs? Verdict: **ship** or **fix-these-N-things**.
4. **Human** merges. Read every diff. Non-negotiable.
5. Update `docs/build-log.md`.

Some code stays human-owned regardless: `backend/ai/prompts.py`, `backend/services/consent.py`, `backend/services/audit.py`, the demo script. Don't let agents edit these without human review.

---

## When stuck

Read `CLAUDE.md`. If the answer isn't there:
- Product question → `PROJECT.md`
- Architecture question → `DESIGN.md §<N>`
- "Was this already decided?" → `docs/decisions.md`
- "Has this broken before?" → grep `docs/build-log.md`
- "Will the AI handle X?" → re-run `niro/probe.py`
