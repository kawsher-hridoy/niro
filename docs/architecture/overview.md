# Architecture — Overview

> **Canonical reference:** [`DESIGN.md §1–2`](../../DESIGN.md#1-architecture-overview).
> This file adds operational notes (deployment process diagram, ER overview)
> as the build progresses.

## Quick summary

Niro is a three-tier web app:

1. **Frontend** — Next.js 16 PWA with authenticated patient and verified-doctor route groups plus public auth/chamber routes.
2. **Backend** — FastAPI service, stateless, all DB writes and AI orchestration here.
3. **Storage** — PostgreSQL 16 for structured data; local FS (dev) or S3-compatible (prod) for blobs. pgvector is deferred.

External dependency: **Azure OpenAI `gpt-chat-latest`** (with `AIProvider` abstraction for Claude/Gemini fallback).

For the full ASCII diagram, component responsibility table, and rationale, see [`DESIGN.md §1–2`](../../DESIGN.md#1-architecture-overview).

## To be added during the build

- [ ] Phase B: actual deployment diagram with port numbers and process boundaries
- [ ] Phase B: ER diagram (extracted from migrations) — Mermaid or Graphviz
- [ ] Phase D: data-flow diagram of the chamber QR flow
- [ ] Phase F: production deployment topology (Caddy + systemd units + Postgres)

## Cross-references

- Data model: [`data-model.md`](data-model.md)
- API surface: [`api-surface.md`](api-surface.md)
- Storage: [`storage.md`](storage.md)
- Frontend: [`../frontend/overview.md`](../frontend/overview.md)
- Deployment: [`../deployment/topology.md`](../deployment/topology.md)
