# Niro Documentation

Build-time engineering docs for the Niro project.

> **Looking for the product spec?** See [`PROJECT.md`](../PROJECT.md).
> **Looking for the full system design?** See [`DESIGN.md`](../DESIGN.md).
> **Want Claude Code to load context automatically?** That's [`CLAUDE.md`](../CLAUDE.md).

This folder holds **engineering documentation** — onboarding, runbooks,
operational guides, decisions, build progress. It complements `DESIGN.md`
(which stays as the canonical system-design dossier) rather than
replacing it. Each architecture/security/deployment file here is short
and points back to the relevant `DESIGN.md` section for long-form
rationale; the **new** material is the operational stuff `DESIGN.md`
doesn't cover.

## Quick navigation

### Start here
- [`dev-setup.md`](dev-setup.md) — 10-minute onboarding from clone to working health check
- [`env-vars.md`](env-vars.md) — every environment variable explained
- [`mocks.md`](mocks.md) — Phase-1 safe mocks (OTP, bKash, BMDC) — what's faked and why
- [`build-log.md`](build-log.md) — daily progress diary (append-only)
- [`decisions.md`](decisions.md) — locked decisions with rationale
- [`open-questions.md`](open-questions.md) — still-TBD items with default answers
- [`glossary.md`](glossary.md) — Bangla terms, medical abbreviations, project acronyms

### Architecture
- [`architecture/overview.md`](architecture/overview.md) — system shape, components → `DESIGN.md §1–2`
- [`architecture/data-model.md`](architecture/data-model.md) — SQL schema + migrations → `DESIGN.md §3`
- [`architecture/api-surface.md`](architecture/api-surface.md) — REST endpoints + curl examples → `DESIGN.md §4`
- [`architecture/storage.md`](architecture/storage.md) — Postgres, blobs, pgvector → `DESIGN.md §8`

### AI safety
- [`ai-safety/contract.md`](ai-safety/contract.md) — `AIProvider` interface, prompts → `DESIGN.md §5`
- [`ai-safety/security-compliance.md`](ai-safety/security-compliance.md) — encryption, BMDC, DPA → `DESIGN.md §6`
- [`ai-safety/audit-logging.md`](ai-safety/audit-logging.md) — audit event taxonomy, retention, tamper evidence

### Frontend
- [`frontend/overview.md`](frontend/overview.md) — route structure, server vs client → `DESIGN.md §7`
- [`frontend/bangla-typography.md`](frontend/bangla-typography.md) — Noto Sans Bengali, ligature gotchas
- [`frontend/components.md`](frontend/components.md) — component inventory, filled as we build

### Deployment
- [`deployment/topology.md`](deployment/topology.md) — local vs prod → `DESIGN.md §10`
- [`deployment/docker-compose.md`](deployment/docker-compose.md) — local dev compose explained
- [`deployment/caddy.md`](deployment/caddy.md) — production Caddyfile, TLS, HSTS
- [`deployment/backups.md`](deployment/backups.md) — pg_dump → age → B2; restore procedure

### Observability / testing
- [`observability.md`](observability.md) — logging, metrics, errors, AI cost → `DESIGN.md §9`
- [`testing.md`](testing.md) — what we test vs what we skip → `DESIGN.md §11`

### Demo
- [`demo/video-script.md`](demo/video-script.md) — Phase-1 video shot list → `DESIGN.md §13`
- [`demo/live-script.md`](demo/live-script.md) — Phase-2 live demo + Q&A prep → `DESIGN.md §13`
- [`demo/risk-register.md`](demo/risk-register.md) — risks + pre-flight checklist → `DESIGN.md §14`
- [`demo/pitch.md`](demo/pitch.md) — verbal pitch text, 5 talking points

### Decisions
- [`adr/`](adr/) — Architecture Decision Records for major choices made during the build

---

## How to use this folder

**As a developer joining the project:**
1. Read `dev-setup.md` first. Get to a running health check.
2. Skim `architecture/overview.md` and `DESIGN.md §1–4`.
3. Read `ai-safety/contract.md` before touching anything in `niro/backend/ai/`.
4. Read `mocks.md` so you know what's fake in Phase 1.
5. Append to `build-log.md` at the end of every coding day.

**As a reviewer:**
1. Check the latest `build-log.md` entry against the relevant phase in
   the [implementation plan](../../home/l0minex/.claude/plans/twinkly-inventing-pebble.md).
2. Confirm every new decision has been logged in `decisions.md`.
3. Run the smoke test at the bottom of the plan file.

**As Claude/Codex:**
Read `CLAUDE.md` and `.claude/skills/niro/SKILL.md` automatically. For
specific work, pull only the relevant `docs/` file plus its `DESIGN.md`
section — do not load the whole dossier.

---

*Last updated: 23 May 2026 (Phase A, Day 1 evening).*
