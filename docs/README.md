# Niro Documentation

Build-time engineering docs for the Niro project.

> **Looking for the product spec?** See [`PROJECT.md`](../PROJECT.md).
> **Looking for the full system design?** See [`DESIGN.md`](../DESIGN.md).
> **Want Claude Code to load context automatically?** That's [`CLAUDE.md`](../CLAUDE.md).
> **Non-Claude AI agent (Codex, Cursor, …)?** Start at [`AGENTS.md`](../AGENTS.md).

---

## Status — Phase 1 feature-complete (as of 23 May 2026)

| Phase | Status | PR |
|---|---|---|
| A — Foundation | ✅ Merged | [#1](https://github.com/kawsher-hridoy/niro/pull/1) |
| B — AI integration + upload | ✅ Merged | [#2](https://github.com/kawsher-hridoy/niro/pull/2) |
| C — Profile + verification + doctor portal | ✅ Merged | [#3](https://github.com/kawsher-hridoy/niro/pull/3) |
| D — Chamber + browser PDF + polish | ✅ Merged | [#4](https://github.com/kawsher-hridoy/niro/pull/4) |
| E — Record + submit video | ⏳ User action | by 27 May |
| F — Live-demo polish | Conditional | post 30 May shortlist |
| G — Demo day | Conditional | 15 June |

39 router endpoints plus health, 20 URL-visible frontend pages, 14 DB
models, 15+ distinct audit event types in use, 6 seeded doctors, and
dev-mode doctor applications that auto-verify for demos.

---

## Quick navigation

### Start here
- [`dev-setup.md`](dev-setup.md) — 10-minute onboarding from clone to working health check; 14-step Phase-1 smoke test
- [`env-vars.md`](env-vars.md) — every environment variable explained
- [`mocks.md`](mocks.md) — Phase-1 safe mocks (OTP, bKash, BMDC) — what's faked and why
- [`build-log.md`](build-log.md) — daily progress diary (Day 0 through active Day 5 fixes)
- [`decisions.md`](decisions.md) — locked decisions D-001..D-012
- [`open-questions.md`](open-questions.md) — still-TBD items with default answers
- [`glossary.md`](glossary.md) — Bangla terms, medical abbreviations, project acronyms

### Architecture
- [`architecture/overview.md`](architecture/overview.md) — system shape, components → `DESIGN.md §1–2`
- [`architecture/data-model.md`](architecture/data-model.md) — SQL schema + migrations → `DESIGN.md §3`
- [`architecture/api-surface.md`](architecture/api-surface.md) — current endpoint inventory with examples → `DESIGN.md §4`
- [`architecture/storage.md`](architecture/storage.md) — Postgres, blobs, pgvector → `DESIGN.md §8`

### AI safety
- [`ai-safety/contract.md`](ai-safety/contract.md) — `AIProvider` interface, prompt versions → `DESIGN.md §5`
- [`ai-safety/security-compliance.md`](ai-safety/security-compliance.md) — encryption, BMDC, DPA → `DESIGN.md §6`
- [`ai-safety/audit-logging.md`](ai-safety/audit-logging.md) — audit event taxonomy + actual event types in use

### Frontend
- [`frontend/overview.md`](frontend/overview.md) — actual route structure → `DESIGN.md §7`
- [`frontend/bangla-typography.md`](frontend/bangla-typography.md) — Noto Sans Bengali setup, ligature gotchas
- [`frontend/components.md`](frontend/components.md) — actual component inventory as built

### Deployment
- [`deployment/topology.md`](deployment/topology.md) — local vs prod → `DESIGN.md §10`
- [`deployment/docker-compose.md`](deployment/docker-compose.md) — local dev compose explained
- [`deployment/caddy.md`](deployment/caddy.md) — Phase F production Caddyfile
- [`deployment/backups.md`](deployment/backups.md) — Phase F backup procedure

### Observability / testing
- [`observability.md`](observability.md) — logging, metrics, errors, AI cost → `DESIGN.md §9`
- [`testing.md`](testing.md) — what we test vs what we skip → `DESIGN.md §11`

### Demo
- [`demo/video-script.md`](demo/video-script.md) — Phase-1 video shot list → `DESIGN.md §13`
- [`demo/live-script.md`](demo/live-script.md) — Phase-2 live demo + Q&A prep → `DESIGN.md §13`
- [`demo/risk-register.md`](demo/risk-register.md) — risks + pre-flight checklist → `DESIGN.md §14`
- [`demo/pitch.md`](demo/pitch.md) — verbal pitch text, 5 talking points

### Decisions
- [`adr/`](adr/) — Architecture Decision Records for major choices

---

## How to use this folder

**As a developer joining the project:**
1. Read `CLAUDE.md` then `dev-setup.md`. Get to a running health check.
2. Skim `architecture/overview.md` + `api-surface.md`.
3. Read `ai-safety/contract.md` before touching `niro/backend/ai/`.
4. Read `mocks.md` so you know what's fake in Phase 1.
5. Append to `build-log.md` at the end of every coding session.

**As a reviewer:**
1. Check the latest `build-log.md` entry.
2. Confirm new decisions are in `decisions.md`.
3. Run the 14-step smoke test in `dev-setup.md §7`.

**As Claude/Codex/another agent:**
- Read `CLAUDE.md` / `AGENTS.md` (auto-loaded for Claude).
- For specific work, pull the relevant `docs/` file plus its `DESIGN.md` section — do not load the whole dossier.

---

*Last updated: 24 May 2026 (post Day-5 Fix #4: doctor onboarding + verified doctor dashboard).*
