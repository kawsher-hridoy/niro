# Deployment — Topology

> **Canonical reference:** [`DESIGN.md §10`](../../DESIGN.md#10-deployment-topology).
> This file adds operational notes as the build progresses.

## Local dev

`docker compose up -d postgres` starts Postgres + pgvector.

Backend and frontend run on host (faster iteration than in containers):

```
docker compose: postgres (5432)
host:           uvicorn backend.main:app  (8000)
host:           next dev                  (3000)
```

See [`docker-compose.md`](docker-compose.md) for the compose file walk-through.

## Production (single VPS) — LIVE at nirobd.tech

**Live as of 30 May 2026.** Single **Azure VM** (Ubuntu 24.04, `/opt/niro`),
**single domain** `nirobd.tech` with **path-based routing** — not the
two-subdomain scheme earlier docs describe.

```
Caddy (TLS, reverse proxy, HSTS) — system package, ports 80/443
  nirobd.tech
    ├── handle /api/*  → FastAPI  (127.0.0.1:8000)   # keeps /api prefix
    └── handle  (else) → Next.js  (127.0.0.1:3000)
  www.nirobd.tech → 301 redirect → nirobd.tech

systemd units (templates in docs/deployment/):
  - niro-backend.service        (uvicorn --workers 2, loopback)
  - niro-frontend.service       (next start -H 127.0.0.1 -p 3000)
  Postgres runs via docker compose, bound to 127.0.0.1:5432 only.
```

**Why single-domain matters:** frontend and API share one origin, so the
client uses a **relative** API base (`NEXT_PUBLIC_API_BASE=/api/v1`, pinned
in `niro/frontend/.env.production`) and there is **no CORS** — the
`backend/main.py` CORS allow-list is irrelevant in prod. Postgres password
comes from `/opt/niro/.env` via `${POSTGRES_PASSWORD}` compose interpolation.

> Earlier sizing notes (Hetzner CX22 / DigitalOcean, `niro.` + `api.niro.`
> subdomains) are **superseded** by this Azure single-domain setup. The
> full linear walkthrough is [`deployment.md`](deployment.md); config
> templates are `Caddyfile`, `niro-backend.service`, `niro-frontend.service`
> in this folder.

See [`caddy.md`](caddy.md) for Caddyfile background and [`backups.md`](backups.md) for the backup procedure.

## Deploy procedure — `deploy.sh` (current)

A code update from `main` is now **one command on the VM**:

```bash
cd /opt/niro && ./deploy.sh
```

`deploy.sh` (repo root) fast-forward-pulls `origin/main`, then rebuilds /
migrates / restarts **only what changed**, and health-checks
`https://nirobd.tech/api/v1/health`. It refuses to run on a dirty tree or
off `main`, never touches `.env`, and is a no-op when already up to date.

The manual 12-step sequence below is the **first-time provisioning** path
(what `deploy.sh` automates for subsequent updates):

1. Provision Azure VM, firewall (allow 80, 443, 22 from your IP only).
2. Install Docker + Caddy + Postgres-16 from official packages.
3. Create non-root user `niro`; clone the repo into `/opt/niro`.
4. Copy `.env` from password manager; verify all required vars present.
5. `docker compose up -d postgres`.
6. Apply migrations: `alembic upgrade head`.
7. Build frontend: `npm install && npm run build`.
8. Start systemd units: `sudo systemctl start niro-backend niro-frontend`.
9. Caddy: set up DNS, restart Caddy → cert auto-provisions in ~30s.
10. Smoke test: `curl https://api.niro.<domain>/api/v1/health` → 200.
11. Run full smoke test (14 steps in the plan).
12. Enable backup timer.

## Operational checklist

| Concern | Phase 1 (dev) | Prod (LIVE at nirobd.tech) |
|---|---|---|
| TLS | none | ✅ Caddy + Let's Encrypt (auto) |
| Restart on crash | manual | ✅ systemd `Restart=always` |
| Process supervision | Ctrl+C | ✅ systemd |
| Deploy/update | n/a | ✅ `deploy.sh` (ff-pull + selective rebuild + health-check) |
| DB exposure | `5432` open | ✅ Postgres bound to `127.0.0.1` only |
| CORS | localhost allow-list | ✅ N/A — single-origin, relative API base |
| Backups | none | ⏳ nightly pg_dump → age → B2 (see [`backups.md`](backups.md)) |
| Monitoring | logs to stdout | ⏳ journalctl now; Sentry pending (Phase F) |
| Health checks | manual `curl` | ⏳ `deploy.sh` checks once; uptimerobot pending |

## Done / still pending

- [x] Caddyfile — `docs/deployment/Caddyfile` (single-domain, path-routed)
- [x] systemd unit files — `niro-backend.service`, `niro-frontend.service`
- [x] deploy script — `deploy.sh` at repo root
- [x] rollback procedure — see [`deployment.md §11`](deployment.md)
- [ ] nightly backup timer (see [`backups.md`](backups.md))
- [ ] Sentry error tracking + uptime monitor
- [ ] CI/CD (currently `./deploy.sh` run manually on the VM)
