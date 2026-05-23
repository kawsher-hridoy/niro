# Deployment — docker-compose

The local dev `docker-compose.yml` runs only Postgres + pgvector.
Backend and frontend run on host (faster reload, easier debugging).

> **File to be written in Phase A.** This doc explains what it'll contain.

## Planned compose file

```yaml
# docker-compose.yml (at repo root)
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: niro-postgres
    ports:
      - "5432:5432"
    volumes:
      - ./.data/pg:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: niro
      POSTGRES_PASSWORD: niro
      POSTGRES_DB: niro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U niro"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
```

## Why pgvector

`pgvector` is a PostgreSQL extension that adds vector similarity search.
Niro uses it for RAG over the DGDA drug formulary (Phase C+). Keeping
vectors in the same DB as our structured data simplifies operations —
no separate Qdrant or Pinecone instance.

The image `pgvector/pgvector:pg16` is Postgres 16 with pgvector
pre-installed. Free, reasonable.

## Why backend/frontend aren't in compose

For dev:

- Hot reload is much faster when uvicorn/next run on host.
- Easier to attach a debugger.
- Less Docker resource overhead on the dev machine.

For prod, both run via systemd, not Docker. We keep Docker for stateful
services only.

## Useful commands

```bash
# Start
docker compose up -d postgres

# Tail logs
docker compose logs -f postgres

# Stop (keep data)
docker compose stop

# Stop + nuke data (destroys local DB)
docker compose down -v

# Run psql interactively
docker compose exec postgres psql -U niro -d niro
```

## Data location

Volume mount: `./.data/pg/` (gitignored). Wipe with
`docker compose down -v` and re-init with migrations.

## To be added

- [ ] Phase A: actual `docker-compose.yml` once written
- [ ] Phase F: production overlay (`docker-compose.prod.yml`) — or none, if we use systemd-managed Postgres outside Docker
