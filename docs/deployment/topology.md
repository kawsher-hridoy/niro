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

## Production (single VPS)

Target: Hetzner CX22 (€4.51/mo) or DigitalOcean 2vCPU/2GB ($12/mo).

```
Caddy (TLS, reverse proxy, HSTS)
  ├── niro.<domain>          → Next.js (3000)
  └── api.niro.<domain>      → FastAPI (8000)

systemd units:
  - niro-postgres.service
  - niro-backend.service       (uvicorn --workers 4)
  - niro-frontend.service      (next start)
  - niro-backup.timer          (nightly pg_dump → encrypted to B2)
```

See [`caddy.md`](caddy.md) for the Caddyfile and [`backups.md`](backups.md) for the backup procedure.

## Deploy procedure (Phase F4)

1. Provision VPS, set up firewall (allow 80, 443, 22 from your IP only).
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

| Concern | Phase 1 (dev) | Phase F (prod) |
|---|---|---|
| TLS | none | Caddy + Let's Encrypt |
| Backups | none | nightly pg_dump → age → B2 |
| Monitoring | logs to stdout | journalctl + Sentry for errors |
| Restart on crash | manual | systemd `Restart=always` |
| Process supervision | Ctrl+C | systemd |
| Health checks | manual `curl` | uptimerobot or similar |

## To be added during the build

- [ ] Phase F: actual Caddyfile (see [`caddy.md`](caddy.md))
- [ ] Phase F: systemd unit files
- [ ] Phase F: deploy script (or `Makefile`) that runs the 12 steps above
- [ ] Phase F: rollback procedure
