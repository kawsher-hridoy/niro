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

## D-015 — Report-type-aware health records + original-file download

- **What:** Phase 1 of the longitudinal health-record feature. The AI now classifies each document's **fine-grained `report_type`** (slug: `echocardiography`, `cbc`, `lipid_panel`, `ecg`, `chest_xray`, …) and extracts the **`report_date`** printed on the report; both are persisted on `Analysis` (new nullable columns + index `ix_analyses_patient_reporttype_date`). A new `GET /me/records` groups a patient's analyses by `report_type` (Bangla labels, items sorted by `report_date` falling back to upload time), surfaced as `/records` + `/records/[type]` pages. A new `GET /documents/{id}/download` streams the original file back to its owner (ownership-checked, audited `document.download`, IDs-only detail). Frontend `downloadDocument()` fetches with the Bearer token → blob → object-URL click (a plain `<a href>` can't carry the JWT).
- **When:** 2026-05-30
- **Owner:** kawsher-hridoy
- **Why:** Niro's pitch is a patient-owned longitudinal record, but everything was a flat chronological list and the coarse `Document.kind` (prescription/lab_report/discharge/other) couldn't answer "show me all my previous echocardiography reports." Letting the model classify the specific report type (rather than trusting the upload dropdown, which mislabels imaging as "lab_report") makes per-type history possible. `report_date` (not `uploaded_at`) is the correct chronology key for a health record. Reuses `storage.read_blob`, `audit.record`, the timeline query pattern.
- **Alternatives considered:** **Separate `health_metrics` table + trend charts** (LVEF over time, etc.) — deferred to Phase 2: reliable cross-lab trending needs a canonical metric-key vocabulary + unit normalization and shouldn't block the MVP. **A `report_type` column on `Document`** (vs `Analysis`) — rejected: the type is an AI-derived classification, so it belongs with the model output and is versioned alongside it. **Doctor-via-consent download** — deferred: Phase 1 download is patient-owner-only; consent-gated doctor download can extend the same endpoint later.
- **Status:** Locked (Phase 1); Phase 2 (trendable metrics) open — see [`open-questions.md`](open-questions.md).
- **Affected files:** `niro/backend/db/models.py` (`Analysis.report_type`, `Analysis.report_date`, index), migration `b3e2d7a91c44_phase_e_analysis_report_type_date.py`, `niro/backend/ai/prompts.py` (rx-bn-v1.1 / lab-bn-v1.1 emit `report_type`+`report_date`), `niro/backend/ai/azure.py` (`_clean_report_type`, `_clean_iso_date`), `niro/backend/ai/provider.py` (`DocumentAnalysis`), `niro/backend/api/routers/analyses.py` (persist + `AnalysisOut`), `niro/backend/api/routers/documents.py` (`GET /{id}/download`), `niro/backend/api/routers/profile.py` (`GET /me/records`), `niro/frontend/src/lib/api.ts` (`RecordGroup`, `getRecords`, `downloadDocument`), `niro/frontend/src/app/(app)/records/page.tsx`, `niro/frontend/src/app/(app)/records/[type]/page.tsx`, `niro/frontend/src/components/app-shell/Sidebar.tsx`, `niro/frontend/src/app/(app)/analyses/[id]/page.tsx`.

## D-016 — Health metrics extraction + trend visualization (living medical profile)

- **What:** Phase 2 of the longitudinal health-record feature. Lab reports now extract **trendable numeric values** into a new `health_metrics` table (patient_id, analysis_id, document_id, metric_key, value_num, unit, ref_low/ref_high, abnormal, measured_at). The AI prompt emits structured lab values with a **canonical `metric_key` vocabulary** (~28 keys: `blood_glucose_fasting`, `hba1c`, `ldl_cholesterol`, `creatinine`, `hemoglobin`, `tsh`, `lvef`, etc.) + numeric extraction (`value_num`, `ref_low`, `ref_high`). Backend routes: `GET /me/metrics` (summary: latest value + count per key), `GET /me/metrics/{key}` (time series). Frontend: `/trends` page (metric cards), `/trends/[key]` page (inline-SVG line chart with reference band, value table, links to source analysis + hardcopy download via `downloadDocument`), "স্বাস্থ্য ট্রেন্ড" sidebar nav, dashboard widget (top 6 metrics). Doctor case view includes patient metrics (latest per key) so reviewing doctors see trends. `GET /documents/{id}/download` extended: patient-owner → direct allow; doctor → `consent.require()` + `record_access(screen="document_download")` so doctors can verify AI against the hardcopy.
- **When:** 2026-05-30
- **Owner:** kawsher-hridoy
- **Why:** Niro's value proposition is a **living medical profile**, not a filing cabinet. Patients need to see "my blood sugar over the last 6 months" and doctors need to see trends (LVEF improving post-treatment, creatinine creeping up) without manually comparing 8 PDFs. The canonical metric-key vocabulary (AI maps "FBS"/"Fasting Glucose"/"গ্লুকোজ" → `blood_glucose_fasting`) makes cross-lab trending reliable. Forward-only extraction (new analyses only, no risky bulk backfill) keeps the migration safe. Inline-SVG chart (no external lib) keeps the bundle small and print-friendly. Consent-gated doctor download closes the loop: AI extracts → patient sees trends → doctor verifies against hardcopy.
- **Alternatives considered:** **Bulk backfill existing analyses** — rejected: risky (re-runs AI on old data, could change results), expensive, and unnecessary (new uploads populate the table naturally). **Chart.js / Recharts** — rejected: adds 50–100 KB; inline SVG is 2 KB and sufficient for line charts. **Separate metric vocabulary service** — deferred: 28 hardcoded keys cover ICADHI demo scope; a dynamic registry is Phase F. **Patient-editable manual entries** — deferred: Phase 1 is AI-extracted only; manual glucose logs are a future feature.
- **Status:** Locked
- **Affected files:** `niro/backend/db/models.py` (`HealthMetric`, index `ix_health_metrics_patient_key_date`), migration `c5f4e8d20a17_phase_e_health_metrics.py`, `niro/backend/ai/prompts.py` (lab-bn-v1.2 emits `metric_key`+`value_num`+`ref_low`+`ref_high` per value), `niro/backend/ai/provider.py` (`StructuredLabValue`), `niro/backend/ai/azure.py`, `niro/backend/api/routers/analyses.py` (`_extract_metrics`, `METRIC_LABEL_BN`, audit `metric_count`), `niro/backend/api/routers/profile.py` (`GET /me/metrics`, `GET /me/metrics/{key}`, `MetricSummaryOut`, `MetricHistoryOut`), `niro/backend/api/routers/doctor.py` (`CaseView.metrics`), `niro/backend/api/routers/documents.py` (doctor download consent path), `niro/frontend/src/lib/api.ts` (`MetricSummary`, `MetricHistory`, `getMetrics`, `getMetricHistory`), `niro/frontend/src/app/(app)/trends/page.tsx`, `niro/frontend/src/app/(app)/trends/[key]/page.tsx`, `niro/frontend/src/components/app-shell/Sidebar.tsx`, `niro/frontend/src/app/(app)/home/page.tsx` (`HealthMetricsWidget`).

## D-014 — Document chat + prompt-with-upload (text-grounded, blocking, per-analysis)

- **What:** Two patient-facing additions on top of the AI analysis flow. (1) **Prompt-with-upload** — an optional free-text question on the upload screen, threaded into `analyze_document(... user_prompt=)` so the AI addresses it inside `explanation_bn` (prompt text shapes output, is **not** persisted as its own column in v1; audit records only a `has_user_prompt` bool). (2) **Chat-over-analysis** — a multi-turn Bangla conversation grounded in the stored `Analysis` (structured + explanation + red flags + questions), persisted in two new tables `conversations` (one per analysis) + `chat_messages`, served by `routers/chat.py` (`GET /conversations/{analysis_id}`, `POST /conversations/{analysis_id}/messages`).
- **When:** 2026-05-29
- **Owner:** kawsher-hridoy
- **Why:** Patients want to ask "is this safe / what does this mean" follow-ups without paying for a doctor review. Grounding chat in the **stored analysis** (not a re-sent image) keeps replies fast (~1.5s vs 8–24s) and cheap, and reuses the history-aware infra. Every chat reply still runs `policy.assert_compliant()` and is audited (`ai.chat.message` / `ai.chat.policy_violation`) — same safety contract as analyze. Inline disclaimer on the chat panel satisfies the AI-output-surface rule without resurrecting `DisclaimerBanner` (D-011).
- **Alternatives considered:** **Vision-enabled chat** (re-send the document each turn so the model can re-read handwriting) — rejected for v1: slow + costly, and the analysis already extracted the content; revisit as an on-demand toggle. **Streaming (SSE)** — rejected: breaks the app's all-blocking sync convention (D-008) for marginal UX. **Cross-record assistant** (chat over the whole timeline) — rejected: bigger build; per-analysis thread matches "chat about THIS report."
- **Status:** Locked
- **Affected files:** `niro/backend/db/models.py` (`Conversation`, `ChatMessage`), migration `7c1a9f4b2e10_phase_e_conversations_chat.py` (down_revision `0004_email_password_auth`), `niro/backend/ai/prompts.py` (`CHAT_PROMPT_BN`, `CHAT_PROMPT_VERSION="chat-bn-v1.0"`), `niro/backend/ai/provider.py` (`ChatReply`, `ChatTurn`, `chat_about_analysis` ABC + `user_prompt` on `analyze_document`), `niro/backend/ai/azure.py`, `niro/backend/api/routers/analyses.py` (`AnalyzeIn.user_prompt`), `niro/backend/api/routers/chat.py`, `niro/backend/main.py`, `niro/frontend/src/lib/api.ts`, `niro/frontend/src/components/AnalysisChat.tsx`, `niro/frontend/src/app/(app)/upload/page.tsx`, `niro/frontend/src/app/(app)/analyses/[id]/page.tsx`.

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
## D-017 — Live /docs module with YC-style pitch deck + admin access control

- **What:** A comprehensive `/docs` endpoint serving as pitch deck, technical documentation, and live system dashboard, with admin-controlled visibility scheduling (default: June 10-14, 2026). Combines YC-style business pitch (Problem, Solution, Market, Business Model, Traction, Competition, Go-To-Market, Team, Vision) with technical documentation (Architecture, Security, AI Safety, Features, Tech Stack, Roadmap) and real-time system statistics. Admin panel at `/docs/admin` provides WYSIWYG editing, team member management, and visibility scheduling with quick presets.
- **When:** 2026-05-30
- **Owner:** kawsher-hridoy
- **Why:** ICADHI judges need a single authoritative source to evaluate Niro during the judging window (June 10-14). Combining business pitch + technical depth + live data in one place is more effective than scattered docs. Admin scheduling allows controlled access for judging, investor preview, or public showcase without code changes. Live stats (total users, documents, analyses, verifications, health metrics, conversations, chamber sessions) demonstrate real system traction. Team section with photos provides human context. Access control prevents premature public exposure before the judging window.
- **Alternatives considered:** 
  - **Static Markdown files in `/docs` folder** — rejected: no live data integration, no access control, no admin editing capability
  - **Separate pitch deck + docs sites** — rejected: fragmented experience, judges would need to visit multiple URLs
  - **Always-public docs** — rejected: need controlled judging window, don't want competitors seeing full system before demo
  - **Notion/Google Docs** — rejected: not integrated with live system data, no custom branding
  - **Docusaurus/VitePress** — rejected: overkill for single-page docs, no access control, no live data
- **Status:** Locked
- **Affected files:** 
  - Backend: `niro/backend/db/models.py` (DocsConfig, DocsSection, DocsTeamMember models), migration `a9b5d9e308af_docs_module_tables.py`, `niro/backend/api/routers/docs.py` (13 endpoints: 8 public, 5 admin), `niro/backend/main.py` (router wiring), `niro/backend/seeds/docs_content.py` (initial content seed)
  - Frontend: `niro/frontend/src/app/docs/page.tsx` (public view with navigation, live stats, team section), `niro/frontend/src/app/docs/admin/page.tsx` (admin panel with visibility toggle, scheduling, content editing, team management)
  - Database: 3 new tables (`docs_config`, `docs_sections`, `docs_team_members`), default config row (June 10-14, 2026, is_public=false)
  - Commit: `751be92`

**Implementation Details:**

**Backend Endpoints:**
- Public: `GET /docs/config` (availability check), `GET /docs/sections` (content), `GET /docs/team` (team members), `GET /docs/live-stats` (real-time metrics), `GET /docs/features` (feature matrix with counts), `GET /docs/tech-stack` (technology info)
- Admin: `PATCH /docs/config` (visibility + scheduling), `POST/PATCH/DELETE /docs/sections` (content management), `POST/PATCH/DELETE /docs/team` (team management)

**Access Control Logic:**
- `is_public` flag (ON/OFF toggle)
- Optional `start_datetime` and `end_datetime` (time window)
- Default: June 10-14, 2026 (ICADHI judging window)
- Admin can override to "always public" or custom windows
- Quick presets: "ICADHI Judging", "Always Public"

**Live Data Integration:**
- Total users, patients, verified doctors
- Documents uploaded, AI analyses performed
- Doctor verifications completed
- Average AI confidence score
- Health metrics extracted
- Conversations (document chat)
- Chamber sessions conducted
- All stats fetched in real-time from database

**Frontend Features:**
- Sticky navigation sidebar with section jump links
- YC-style pitch deck sections (Problem → Vision)
- Team section with photo grid (uniform styling, fallback avatars)
- Live statistics dashboard (8 metric cards)
- Feature matrix with status badges (live/beta/planned) + counts
- Tech stack by category (Frontend, Backend, Database, AI, Infrastructure)
- Markdown-to-HTML rendering for content sections
- PDF export via `window.print()` (consistent with D-010)
- Mobile responsive design
- "Not Available" page when outside time window

**Admin Panel Features:**
- Three tabs: Visibility & Scheduling, Content Sections, Team Members
- Visibility toggle (Public/Private) with live status indicator
- Date/time pickers for scheduling window
- Quick preset buttons (ICADHI Judging, Always Public)
- Section editing with textarea (Markdown support)
- Team member CRUD with photo URL field
- Save/Cancel workflow for all edits
- Preview link to public docs page

**Seed Data:**
- 13 documentation sections (Problem, Solution, Why Now, Market, Business Model, Traction, Competition, Go-To-Market, Vision, Architecture, Security, AI Safety, Roadmap)
- 1 team member (placeholder for kawsher-hridoy)
- Content sourced from PROJECT.md, DESIGN.md, docs/build-log.md

**Use Cases:**
- **ICADHI Judging (June 10-14)**: Judges visit `/docs` during window, see full pitch + technical depth + live stats
- **Investor Preview**: Admin sets custom window (e.g., June 1-5), shares link with investors
- **Public Showcase**: Admin toggles "Always Public" after demo day
- **Team Editing**: Admin updates team photos, roles, adds new members as team grows
- **Content Updates**: Admin edits sections to reflect new features, updated metrics, roadmap changes
