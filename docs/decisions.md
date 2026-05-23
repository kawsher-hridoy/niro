# Decisions

Locked decisions, in reverse chronological order. Open questions live
in [`open-questions.md`](open-questions.md). When an open question is
resolved, move it here.

Format per decision:
- **What:** the decision in one sentence
- **When:** date
- **Owner:** who decided
- **Why:** the rationale
- **Alternatives considered:** what we rejected
- **Status:** Locked / Provisional / Under review
- **Affected files / sections:** where this shows up

---

## D-007 — Phase A uses `postgres:16.3-alpine3.20`; pgvector deferred to Phase C

- **What:** `docker-compose.yml` uses the locally-cached `postgres:16.3-alpine3.20` instead of `pgvector/pgvector:pg16` for Phase A.
- **When:** 23 May 2026
- **Owner:** kawsher-hridoy
- **Why:** Docker Hub IPv6 connectivity is broken from this dev network (`connection reset by peer` on every pull). The alpine Postgres image is already in the local Docker cache, so we use it. Phase A's migrations (`users`, `otp_codes`, `patient_profiles`, `doctor_profiles`, `documents`) need no vector columns — pgvector is a Phase C concern when we add RAG over the DGDA drug formulary.
- **Alternatives considered:** Force IPv4 via `/etc/docker/daemon.json` (intrusive, needs sudo + daemon restart). Build a custom pgvector image locally from source (extra hour). Switch ISP / use a VPN (off-table). All deferred.
- **Status:** Provisional. Swap to `pgvector/pgvector:pg16` in Phase C when the RAG migration lands — by then network may be fine, or we'll need a custom Dockerfile.
- **Affected files:** `docker-compose.yml`, `docs/deployment/docker-compose.md`, `docs/architecture/storage.md` (pgvector mentions)

## D-008 — Sync SQLAlchemy 2.0 (not async)

- **What:** Backend uses sync SQLAlchemy 2.0 + sync FastAPI routes (with `def`, not `async def`). FastAPI runs `def` routes in a thread pool, which is fine for our workload.
- **When:** 23 May 2026
- **Owner:** kawsher-hridoy
- **Why:** AI calls dominate latency (1–5s) and we use the openai client which is sync-friendly; DB calls are sub-10ms each, so async DB buys no real throughput. Sync is simpler to test (no event loop tangles), simpler to debug, and easier for solo dev. Phase F can flip to async if profiling shows it's needed.
- **Alternatives considered:** Async SQLAlchemy 2 + `async def` everywhere. Rejected as premature complexity for an MVP.
- **Status:** Locked for ICADHI.
- **Affected files:** `niro/backend/db/session.py`, all routers from Phase B onward.



- **What:** Phase A starts with creating the `docs/` skeleton only. Backend/frontend/docker-compose scaffolding waits for explicit go-ahead in the next session.
- **When:** 23 May 2026
- **Owner:** kawsher-hridoy
- **Why:** Solo dev prefers reviewing the docs structure and the implementation plan before any code lands. Reduces risk of building toward a misaligned plan.
- **Alternatives considered:** Start scaffolding immediately. Rejected because there's still time before the 27 May deadline to add a 1-session review buffer.
- **Status:** Locked
- **Affected files:** `docs/*`

## D-005 — Project name: Niro

- **What:** The product is named **Niro** (from Bangla *Nirog* / নীরোগ — "disease-free").
- **When:** 23 May 2026
- **Owner:** kawsher-hridoy
- **Why:** Short (2 syllables), Bangla-rooted, pronounces cleanly in both languages, no existing BD health-brand collision, brandable.
- **Alternatives considered:** ShasthyaSathi, ShasthyaKhata, Apon Health, Arogya, Drogo, Doko. Niro picked over Doko for cultural rooting; over Apon Health for length.
- **Status:** Locked
- **Affected files:** `PROJECT.md §0`, all UI copy, this entire repo

## D-004 — AI provider: Azure OpenAI `gpt-chat-latest`

- **What:** Production AI provider is the Azure OpenAI deployment `gpt-chat-latest`.
- **When:** 23 May 2026
- **Owner:** kawsher-hridoy
- **Why:** Probed against `niro/probe.py` — passes all 6 tests (Bangla generation, structured JSON, vision on prescription, vision+Bangla on lab report, function calling, latency 1.5s). Retirement date 5 Aug 2026 covers entire ICADHI competition. 500k TPM / 5k RPM is generous. Bangla quality is *better* than the alternative `gpt-5.3-chat` we initially tried — uses Bangla numerals (২৪৫) natively.
- **Alternatives considered:** Claude Sonnet 4.6 (more stable, more expensive, no shared key access); Gemini 2.5 Pro (good free tier, less proven on Bangla); Azure `gpt-5.3-chat` (rejected — retires 9 June 2026, before our final demo).
- **Status:** Locked, but provider-abstracted. Switching is one env var (`AI_PROVIDER=claude` or `gemini`).
- **Caveat:** Deployment is under `jamontedominguez105@gmail.com`, not our subscription. Fine for ICADHI; must migrate post-final.
- **Affected files:** `niro/probe.py`, future `niro/backend/ai/azure.py`, `.env.example`, `CLAUDE.md`, `docs/ai-safety/contract.md`

## D-003 — Tech stack: FastAPI + Next.js 15 + PostgreSQL + pgvector

- **What:** Python 3.12 + FastAPI for the backend; Next.js 15 (App Router) + Tailwind for the frontend; PostgreSQL 16 with pgvector for storage.
- **When:** 23 May 2026
- **Owner:** kawsher-hridoy
- **Why:** FastAPI: best-in-class Python AI integration, type-safe, async, fits the openai SDK ergonomics. Next.js 15: single PWA serves patient + doctor + chamber flows; server components reduce client-side complexity. Postgres+pgvector: one DB for both structured and embedding data, no second service to operate.
- **Alternatives considered:** Node/NestJS backend (rejected — Python wins for AI tooling). Flutter mobile (rejected for ICADHI — too much surface area in 23 days; revisit post-launch). Separate vector DB like Qdrant (rejected — Postgres + pgvector is sufficient at our scale).
- **Status:** Locked
- **Affected files:** `niro/backend/`, `niro/frontend/`, `docker-compose.yml`, `docs/architecture/*`, `DESIGN.md §1, §7, §8`

## D-002 — Doc strategy: keep DESIGN.md intact, add docs/

- **What:** `DESIGN.md` stays as the canonical 940-line system-design dossier. The new `docs/` folder contains build-time engineering docs (dev-setup, env-vars, decisions, mocks, glossary, ADRs, etc.) that **point into** `DESIGN.md` sections rather than duplicating them.
- **When:** 23 May 2026
- **Owner:** kawsher-hridoy
- **Why:** Avoids the maintenance burden of mirroring 940 lines into 20 files. `DESIGN.md` is a coherent single artifact that loads cleanly into a fresh AI session. `docs/` adds operational content (setup runbooks, decision logs) that's awkward to put in a design doc.
- **Alternatives considered:** Split `DESIGN.md` into `docs/architecture/*`, `docs/ai-safety/*`, etc., and shrink `DESIGN.md` to a 50-line hub. Rejected because of churn.
- **Status:** Locked
- **Affected files:** `docs/*`, `DESIGN.md` (no changes)

## D-001 — Submit to ICADHI 2026 Track 1 (AI-Driven Telemedicine)

- **What:** Submit Niro to the IEEE ICADHI 2026 Project Showcase under Track 1.
- **When:** 22 May 2026
- **Owner:** kawsher-hridoy
- **Why:** Strong fit — Niro is exactly an AI telemedicine application, and the Bangladesh-Inclusive theme aligns with the patient-owned EMR + offline-chamber pitch. Track 7 (Ethical AI) is a possible cross-claim but Track 1 is the clearest match for judges.
- **Alternatives considered:** Track 2 (GenAI/LLMs) and Track 7 (Ethical AI). Track 1 wins because it covers the chamber + verification flow, not just the AI document analyzer.
- **Status:** Locked
- **Affected files:** ICADHI submission portal, `docs/demo/*`, `PROJECT.md §9`

---

## How to add a new decision

1. Append a new section above as **D-007**, **D-008**, etc.
2. Fill all six fields (what, when, owner, why, alternatives, status).
3. Cross-reference from any affected doc.
4. Commit with message `decisions: D-NNN — <one-line summary>`.

For larger architectural decisions, also create an ADR in
[`adr/`](adr/) using [`adr/0001-template.md`](adr/0001-template.md).
