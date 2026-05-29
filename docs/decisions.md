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

## D-013 — PyMuPDF for PDF rasterization (AGPL, swap-later)

- **What:** Uploaded `application/pdf` documents are rasterized to PNGs server-side via `pymupdf` (200 DPI, capped at 5 pages) before being sent to Azure OpenAI's vision endpoint as multiple `image_url` content blocks. Image MIMEs (PNG/JPEG/WebP) continue to be sent directly. Failure to decode the PDF surfaces as `DocumentReadError` → HTTP 422 with an `ai.document_unreadable` audit event.
- **When:** 2026-05-27 (Fix #6, Day-5).
- **Owner:** kawsher-hridoy
- **Why:** Azure OpenAI's `image_url` block only accepts PNG/JPEG/GIF/WebP, so PDFs were silently broken end-to-end despite the upload path accepting them. PyMuPDF is the fastest renderer with the best quality output for handwritten Bangladeshi prescriptions; the user picked it explicitly over `pypdfium2` for ICADHI demo speed. Cost vector to watch: a 5-page lab report ≈ 5× single-image vision tokens.
- **Alternatives considered:** `pypdfium2` (Apache-2.0 + BSD-3, no AGPL trigger — **preferred for any commercial future**; quality difference is invisible to a vision model at 200 DPI). `pdf2image` + Poppler (extra system dep, adds Docker layer). Server-side text extraction for digital PDFs (deferred — vision path already handles them adequately).
- **Status:** **Provisional.** **Must swap to `pypdfium2` before the first paying patient.** PyMuPDF is licensed AGPL-3.0; the "network use" clause would otherwise require either open-sourcing the entire Niro codebase under AGPL or paying Artifex's commercial license. Acceptable for ICADHI demo (academic showcase, not yet a service offered to users). Tracked as an open question.
- **Affected files:** `niro/backend/pyproject.toml`, `niro/backend/ai/azure.py`, `niro/backend/ai/provider.py` (`DocumentReadError`), `niro/backend/api/routers/analyses.py`, `niro/probe.py` (TEST 7).
- **Related:** New OQ in `docs/open-questions.md` tracks the pypdfium2 swap.

## D-012 — Password hashing via argon2-cffi (not bcrypt, not passlib)

- **What:** User passwords (introduced in Fix #2 — sign-up + password login + reset) are hashed with `argon2-cffi` (`PasswordHasher.hash()` / `.verify()`). Stored in `users.password_hash` (Argon2id, default params: t=3, m=64 MiB, p=4). OTP codes still use `sha256(salt:code)` per D-009.
- **When:** 23 May 2026 (Fix #2)
- **Owner:** kawsher-hridoy
- **Why:** OWASP recommends Argon2id for new password storage; it has no maintenance issues. `passlib + bcrypt 5.x` is broken on init (D-009) and we already eliminated `passlib` from the OTP path. Adding `passlib` back just for passwords would resurrect the same compat trap. `argon2-cffi` is a pure direct dep, no `passlib` shim layer, no `__about__` introspection bug.
- **Alternatives considered:** Pin `bcrypt<4.0` + `passlib` (rejected — `passlib` is unmaintained since 2020 and we'd carry a deprecated dep into prod). `bcrypt` directly without `passlib` (rejected — Argon2 is the modern OWASP recommendation; bcrypt's only advantage was passlib's interop). `scrypt` (rejected — less attacker resistance per unit memory than Argon2id). pbkdf2 (rejected — weakest of the bunch).
- **Status:** Locked.
- **Affected files:** `niro/backend/pyproject.toml` (new dep), `niro/backend/services/auth.py` (`hash_password`, `verify_password`), `niro/backend/api/routers/auth.py` (signup + password login + reset flows), `niro/backend/db/migrations/versions/0004_email_password_auth.py` (`users.password_hash` column).
- **Related:** D-009 (OTPs intentionally still use sha256+salt — different threat model, short-lived 6-digit code).

## D-011 — Landing `/` is a full marketing site (light-mode only); `DisclaimerBanner` removed

- **What:** `/` is a 6-section marketing landing (sticky nav → hero with CSS phone mockup → trust strip → features → how-it-works → final CTA → footer), with a new healthcare token palette (`--color-primary` deep medical green, warm off-white background) in `globals.css`. Light-mode only — the `prefers-color-scheme: dark` override was removed. The `DisclaimerBanner` component (previously mounted globally in `layout.tsx`) was deleted.
- **When:** 23 May 2026 (Fix #1, post-Phase-D)
- **Owner:** kawsher-hridoy
- **Why:** The Phase-A placeholder landing (single hero + 3 cards + ICADHI footer + flat black background) didn't feel like a professional healthcare product, blocking the Phase-1 video on 27 May. Light-mode is what hospital/clinic UIs use; dark mode was unused and forcing readers into a black page on first load was hostile. The global amber `DisclaimerBanner` cluttered every screen (auth, home, doctor portal, chamber) where it added no signal — the disclaimer copy now lives inline on AI-output pages (e.g. `analyses/[id]`) where it actually matters.
- **Alternatives considered:** Keep dark-mode toggle (deferred — Phase F). Use a shadcn/ui `Card` + `Button` set (deferred — keeps Phase 1 dep-free). Hero illustration / framer-motion animations (rejected — adds deps for a static page). Replace `DisclaimerBanner` with a smaller pill at the nav (rejected — disclaimer belongs on AI-output pages, not the global shell).
- **Status:** Locked for Phase 1. Reopen in Phase F if a dark-mode toggle or shadcn/ui port becomes a priority.
- **Affected files:** `niro/frontend/src/app/page.tsx` (rewrite), `niro/frontend/src/app/layout.tsx` (remove `<DisclaimerBanner />` + import), `niro/frontend/src/app/globals.css` (new token palette, drop dark-mode override), `niro/frontend/src/components/DisclaimerBanner.tsx` (deleted). Commit: `caaa8f9`.

## D-007 — Phase A uses `postgres:16.3-alpine3.20`; pgvector deferred to Phase C

- **What:** `docker-compose.yml` uses the locally-cached `postgres:16.3-alpine3.20` instead of `pgvector/pgvector:pg16` for Phase A.
- **When:** 23 May 2026
- **Owner:** kawsher-hridoy
- **Why:** Docker Hub IPv6 connectivity is broken from this dev network (`connection reset by peer` on every pull). The alpine Postgres image is already in the local Docker cache, so we use it. Phase A's migrations (`users`, `otp_codes`, `patient_profiles`, `doctor_profiles`, `documents`) need no vector columns — pgvector is a Phase C concern when we add RAG over the DGDA drug formulary.
- **Alternatives considered:** Force IPv4 via `/etc/docker/daemon.json` (intrusive, needs sudo + daemon restart). Build a custom pgvector image locally from source (extra hour). Switch ISP / use a VPN (off-table). All deferred.
- **Status:** Provisional. Swap to `pgvector/pgvector:pg16` in Phase C when the RAG migration lands — by then network may be fine, or we'll need a custom Dockerfile.
- **Affected files:** `docker-compose.yml`, `docs/deployment/docker-compose.md`, `docs/architecture/storage.md` (pgvector mentions)

## D-010 — PDF export via browser `window.print()` (not WeasyPrint)

- **What:** The "Save as PDF" feature on `/analyses/[id]` calls `window.print()`. A `@media print` stylesheet in `globals.css` hides nav/buttons/banners. User picks "Save as PDF" in the browser's print dialog.
- **When:** 23 May 2026 (Phase D)
- **Owner:** kawsher-hridoy
- **Why:** WeasyPrint needs Cairo + Pango system deps that add ~100 MB to the deploy image and 30 min of Docker setup. Playwright server-side needs Chromium (~150 MB). Both for a feature judges will use once. Browser print is identical output, zero added deps.
- **Alternatives considered:** WeasyPrint; Playwright; ReportLab. All deferred.
- **Status:** Locked for Phase 1.
- **Affected files:** `niro/frontend/src/app/globals.css`, `niro/frontend/src/app/analyses/[id]/page.tsx`

## D-009 — OTP storage: `sha256(salt:code)` (not bcrypt)

- **What:** OTP codes stored as `salt$sha256(salt:code)` in `otp_codes.code_hash`; verified via `hmac.compare_digest`.
- **When:** 23 May 2026 (Phase B)
- **Owner:** kawsher-hridoy
- **Why:** `passlib`'s bcrypt backend init fails on bcrypt 5.x (the new bcrypt removed `__about__`). For 6-digit codes with 10-minute TTL, bcrypt's cost factor offers no security benefit — sha256+salt with constant-time comparison is sufficient.
- **Alternatives considered:** Pin `bcrypt<4.0`; passlib's pbkdf2; argon2.
- **Status:** Locked. Reconsider if we ever store actual passwords (we currently don't).
- **Affected files:** `niro/backend/api/routers/auth.py`

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
