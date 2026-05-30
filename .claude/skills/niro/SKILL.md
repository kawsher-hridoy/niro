---
name: niro
description: Use when working on the Niro health-app codebase — implementing features, debugging the AI provider integration, reasoning about ICADHI submission constraints, or extending the current FastAPI/Next.js codebase. Reflects state as of Day-5 Fix #8 + three post-Phase-1 features: SaaS auth, app shell, patient dashboard, doctor onboarding, verified-doctor dashboard, PDF vision support, per-analysis AI chat + prompt-with-upload (D-014), and the longitudinal medical-profile layer (D-015 + D-016: report-type records, trendable health metrics, /records + /trends pages, doctor case-view metrics) are merged; iterative issue-fix loop active.
---

# Niro project skill

Use this when work touches Niro (the IEEE ICADHI 2026 health app in this
repo). Reflects state **as of Day-5 Fix #8 — Phase 1 is
feature-complete; the user is driving an iterative issue-fix loop until
the 27 May Phase-1 video submission**.

## What Niro is in one sentence

Patient-owned medical record + AI document analyzer (Bangla) + on-demand
doctor verification, built for Bangladesh.

Full product spec: `PROJECT.md` (root).
System design: `DESIGN.md` (root).
Engineering memory loaded automatically: `CLAUDE.md` (root).
Live engineering docs: `docs/` folder.

## Current Phase status

| Phase | Status |
|---|---|
| A — Foundation | ✅ Merged (PR #1) |
| B — AI integration + upload path | ✅ Merged (PR #2) |
| C — Profile + verification + doctor portal | ✅ Merged (PR #3) |
| D — Chamber QR + browser PDF + polish | ✅ Merged (PR #4) |
| **Day 5 — iterative issue fixes** | 🔧 **Active** — Fix #1 landing, Fix #2 SaaS auth, Fix #3 app shell/dashboard, Fix #4 doctor onboarding/dashboard, Fix #8 PDF vision support merged; **Features: D-014 document chat (PR #8), D-015 + D-016 health-records + trends (commit 5f853a4) merged** |
| **E — Video submission** | ⏳ **User action** — record + upload by 27 May |
| F — Live-demo polish + VPS deploy | Conditional on 30 May shortlist |
| G — Demo day | 15 June |

`main` has the D-014 document-chat feature merged (PR #8, squashed as
`0a9bc7a`) on top of the Day-5 fixes.
Read `docs/build-log.md` Day 4 first, then Day 5 for the active fix loop.

**Active workflow plan:** `/home/l0minex/.claude/plans/twinkly-inventing-pebble.md` v2.0
(branch-per-issue → squash-merge after user approval → Day-5 log entry).

## Key constraints

1. **Phase-1 video deadline: 27 May 2026.** Final demo: 15 June 2026.
   Code freeze for Phase 1 already past — only bug fixes from here.
2. **AI never gives final medical advice.** Only extracts, explains, flags.
3. **Bangla is the default output language.** Bangla numerals (২৪৫) via
   `lib/i18n.ts toBangla()`.
4. **Every AI call logged** via `services.audit.record()` — model+version,
   prompt SHA256, output SHA256, confidence, timestamp.
5. **Every doctor view of patient data goes through `ConsentGuard`** —
   no direct query is allowed.
6. **Never commit secrets.** All keys via env vars. `.env` is gitignored.

## Locked architectural decisions

| ID | Decision | Status |
|---|---|---|
| D-001 | Submit to ICADHI Track 1 — Telemedicine | Locked |
| D-002 | Keep DESIGN.md intact, add docs/ alongside | Locked |
| D-003 | FastAPI + Next.js (16) + Postgres (+ future pgvector) | Locked |
| D-004 | Azure OpenAI `gpt-chat-latest` as primary | Locked, provider-abstracted |
| D-005 | Project name = Niro | Locked |
| D-006 | Phase A docs-skeleton-first | Done |
| D-007 | `postgres:16.3-alpine3.20` for Phase A; pgvector deferred | Provisional |
| D-008 | Sync SQLAlchemy 2.0 (not async) | Locked for ICADHI |
| D-009 | OTP storage: `sha256(salt:code)` (not bcrypt) | Locked |
| D-010 | PDF export via browser `window.print()` (not WeasyPrint) | Locked for Phase 1 |
| D-011 | Landing `/` is a full marketing site, light-mode only; `DisclaimerBanner` removed | Locked for Phase 1 |
| D-012 | Password hashing via Argon2id (`argon2-cffi`) | Locked |
| D-013 | PDF rasterization via PyMuPDF (200 DPI, 5-page cap) before vision call | Provisional — swap to `pypdfium2` before commercial launch (OQ-17, AGPL) |
| D-014 | Document chat + prompt-with-upload: text-grounded, blocking, one conversation per analysis | Locked |
| D-015 | Report-type-aware health records + original-file download: AI classifies `report_type` + `report_date`; `/me/records` groups by type; consent-gated download | Locked |
| D-016 | Health-metrics trend layer: lab values → `health_metrics` table (canonical `metric_key`, numeric extraction); `/me/metrics` + `/trends` pages with directional insight | Locked |

Adding new D-NNN: append to `docs/decisions.md`. Load-bearing decisions also need an ADR.

## AI provider — operational reality

- **Provider:** Azure OpenAI, deployment `gpt-chat-latest` (Preview, retires 5 Aug 2026).
- **Endpoint:** `https://ai-for-security.services.ai.azure.com/openai/v1`
- **Auth header:** `Authorization: Bearer <key>` — **not** `api-key: <key>`. The v1 compatibility endpoint uses Bearer.
- **Account caveat:** under user's own Gmail Azure subscription; fine for ICADHI; migrate to org account post-final.
- **Capability probe:** `niro/probe.py`. Last result: 6/6 PASS, latency 1.27s small calls. **TEST 7** added in Fix #8 covers the PDF round-trip (`sample_rx.png` → in-memory PDF → PyMuPDF rasterize → vision call); requires the optional `pymupdf` dep.
- **Latency reality:**
  - Bangla text generation: ~1-3s
  - Vision + structured JSON: ~8-12s
  - Vision + history-aware: ~15-24s
  - Case-summary generation: ~5-9s
  - Vision on multi-page PDF (5 pages, history-aware): ~20-30s
- **PDF handling:** Azure OpenAI's `image_url` block accepts only PNG/JPEG/GIF/WebP. The provider rasterizes `application/pdf` server-side via PyMuPDF (`_data_uris_for` in `backend/ai/azure.py`) at **200 DPI**, capped at **5 pages** (`_PDF_MAX_PAGES`). One `image_url` block per page is splatted into the same chat message. Unreadable PDFs raise `DocumentReadError` → HTTP 422 + `ai.document_unreadable` audit event. PyMuPDF is AGPL — see D-013 + OQ-17 for the swap-to-`pypdfium2` plan before commercial launch.
- **Re-run probe after any key/provider/model change.**

## Current code paths — what exists, where

### Database (current schema, 4 migrations)

| Migration | Tables added |
|---|---|
| `d99530cae0c6` (Phase A) | users, otp_codes, patient_profiles, doctor_profiles, documents |
| `a376ab1ca234` (Phase B) | analyses, audit_log, access_logs, consents |
| `28e9c4a069e8` (Phase C) | verification_requests, verification_reviews, doctor_reviews, chamber_sessions |
| `0004_email_password_auth` (Fix #2) | email/password auth fields, pending_signups, otp purpose |
| `7c1a9f4b2e10` (Feature #1, D-014) | conversations, chat_messages |
| `b3e2d7a91c44` (Feature #2, D-015) | Analysis.report_type, Analysis.report_date, index ix_analyses_patient_reporttype_date |
| `c5f4e8d20a17` (Feature #3, D-016) | health_metrics table, index ix_health_metrics_patient_key_date |

### Backend (41 router endpoints + health)

| Module | Routes |
|---|---|
| `routers/auth.py` | signup, signup verify/resend, doctor apply, password login/reset, legacy OTP login, refresh, logout |
| `routers/documents.py` | `POST /documents`, `GET /documents`, `GET /documents/{id}`, `DELETE /documents/{id}`, `GET /documents/{id}/download` (consent-gated for doctors, D-015) |
| `routers/analyses.py` | `POST /analyses` (with `use_history`, optional `user_prompt`, extracts report_type/date + health_metrics), `GET /analyses/{id}`, `GET /analyses` |
| `routers/chat.py` | `GET /conversations/{analysis_id}`, `POST /conversations/{analysis_id}/messages` (per-analysis AI chat, D-014) |
| `routers/profile.py` | `GET /me`, `PATCH /me`, `GET /me/dashboard`, `GET /me/timeline`, `GET /me/access-log`, `GET /me/records` (D-015), `GET /me/metrics`, `GET /me/metrics/{key}` (D-016), `DELETE /me` |
| `routers/consent.py` | `POST /consents`, `POST /consents/{id}/revoke` |
| `routers/verifications.py` | `POST /verifications`, `POST /verifications/{id}/pay`, `GET /verifications`, `GET /verifications/{id}` |
| `routers/doctor.py` | `GET /doctor/status`, `GET /doctor/dashboard`, `GET /doctor/inbox`, `GET /doctor/cases/{id}`, `POST /doctor/cases/{id}/review` |
| `routers/doctors.py` | `GET /doctors`, `GET /doctors/{id}`, `POST /doctors/{id}/reviews` |
| `routers/chamber.py` | `POST /chamber/session`, `POST /chamber/session/{token}/scan`, `GET /chamber/session/{id}`, `GET /chamber/session/{id}/profile`, `POST /chamber/session/{id}/prescription`, `POST /chamber/session/{id}/close` |
| `main.py` | `GET /api/v1/health` |

### Services

| File | Public API |
|---|---|
| `services/audit.py` | `record(db, event, **kwargs)` |
| `services/consent.py` | `find_active_consent`, `require`, `record_access`, `PermissionDenied` |
| `services/storage.py` | `write_blob`, `read_blob`, `absolute_path`, `ext_for_mime` |
| `services/auth.py` | `make_token`, `decode_token`, password hash/verify, `current_user`, `require_patient`, `require_doctor`, `require_verified_doctor`, `require_admin` |

### AI layer

| File | Purpose |
|---|---|
| `ai/provider.py` | `AIProvider` ABC (`analyze_document` with optional `user_prompt`, `prepare_case_summary`, `chat_about_analysis`); types `DocumentAnalysis`, `CaseSummary`, `ChatReply`, `ChatTurn`, `Medication`, `LabValue`, `RedFlag`; `DocumentReadError`; `get_provider()` factory |
| `ai/azure.py` | `AzureOpenAIProvider` — vision + Bangla + JSON + tools; `_data_uris_for` rasterizes PDFs via PyMuPDF (200 DPI, 5-page cap); `chat_about_analysis` grounds on the stored analysis brief + prior turns |
| `ai/prompts.py` | Versioned Bangla prompts: `PRESCRIPTION_PROMPT_BN` (rx-bn-v1.0), `LAB_REPORT_PROMPT_BN` (lab-bn-v1.0), `HISTORY_INTRO_BN` (hist-bn-v1.0), `CASE_SUMMARY_PROMPT_BN` (case-bn-v1.0), `CHAT_PROMPT_BN` (chat-bn-v1.0) |
| `ai/policy.py` | `assert_compliant(payload)` raises `AIPolicyViolation` on banned phrases |

### Frontend (route groups + 19 URL-visible pages)

| Path | Notes |
|---|---|
| `app/page.tsx` | Public landing — **post-Fix-#1 it's a 6-section marketing site** (sticky nav, hero + CSS phone mockup, trust strip, feature cards, how-it-works, final CTA, footer). All subcomponents inline in this file (`SiteNav`, `Hero`, `PhoneMockup`, `TrustStrip`, `Stat`, `Features`, `FeatureCard`, `HowItWorks`, `Step`, `FinalCTA`, `SiteFooter`). Server component, no client interactivity. |
| `app/signin/`, `app/signin/otp/`, `app/verify/`, `app/forgot-password/` | patient signup/password login/reset, legacy OTP, doctor application |
| `app/(app)/home/` | Patient SaaS dashboard inside authenticated shell |
| `app/upload/` | File picker + auto-analyze (supports `?document=` re-analyze) + optional প্রশ্ন textarea threaded into the analyze call (D-014) |
| `app/analyses/[id]/` | Result view + 🖨 PDF (browser print) + `<AnalysisChat>` panel (D-014) + মূল ফাইল download button — handles async `params` via `use(params)` |
| `app/records/`, `app/records/[type]/` | Health records grouped by report_type (D-015) — chronological list with download + analysis links |
| `app/trends/`, `app/trends/[key]/` | Health-metric trends (D-016) — cards + inline-SVG line chart with reference band, value table, directional insight |
| `app/timeline/` | Vertical timeline of all events |
| `app/doctors/`, `app/doctors/[id]/` | Directory + filter + profile + request CTA |
| `app/verifications/`, `app/verifications/[id]/` | List + detail with auto-poll while doctor reviews |
| `app/access-log/` | Patient-visible access log |
| `app/chamber/scan/` | Camera QR scanner (html5-qrcode) + manual fallback |
| `app/chamber/[token]/` | Patient consent dialog (scope picker + duration slider) |
| `app/doctor-portal/pending/` | unverified doctor pending state |
| `app/(doctor)/doctor-portal/dashboard/` | verified doctor dashboard |
| `app/(doctor)/doctor-portal/inbox/` | Doctor inbox (Pending / Done split) |
| `app/(doctor)/doctor-portal/cases/[id]/` | Case view (AI summary + target analysis + history + review form) |
| `app/(doctor)/doctor-portal/chamber/` | 4-phase state machine: init → waiting (QR + poll) → bound → closed |

## Code patterns to follow

### Calling the AI

```python
from backend.ai.provider import get_provider
result = get_provider().analyze_document(image_bytes, mime="image/png")
# Bad — never call OpenAI client directly from feature code
```

### Audit logging

```python
from backend.services import audit
audit.record(db, "doctor.view.timeline", actor_id=user.id, actor_role="doctor",
             patient_id=p, doctor_id=user.id, detail={"chamber_address": "..."})
db.commit()  # audit rows commit with the transaction
```

### Consent enforcement (doctor-side reads)

```python
from backend.services.consent import find_active_consent, record_access

consent = find_active_consent(db, patient_id=p, doctor_id=user.id, context="async_review")
if consent is None:
    raise HTTPException(403, "consent expired or revoked")
# ... read patient data ...
record_access(db, consent=consent, screen="case_summary", document_id=doc.id, location="async")
db.commit()
```

### Bangla output (frontend)

```tsx
import { toBangla } from "@/lib/i18n";
<p>রোগী: {toBangla(54)} বছর</p>     // → রোগী: ৫৪ বছর
```

### Next.js 16 dynamic params

```tsx
"use client";
import { use as usePromise } from "react";
type PageProps = { params: Promise<{ id: string }> };
export default function Page({ params }: PageProps) {
  const { id } = usePromise(params);
  // ...
}
```

## Anti-patterns to avoid

- Calling the OpenAI client directly outside `backend/ai/`.
- Logging raw patient documents.
- Adding routes that read patient data without a `ConsentGuard.require` or `find_active_consent` check.
- Using Next.js 14/15 patterns — see CLAUDE.md "Next.js 16 gotchas".
- Adding a `tailwind.config.ts` — Tailwind 4 uses `@theme inline`.
- Reaching for bcrypt for short-lived secrets (D-009), or replacing Argon2id for stored passwords (D-012).
- Importing `images.domains` config (deprecated in Next 16).
- **Recreating `DisclaimerBanner`** — deleted in Fix #1 (D-011). The disclaimer copy belongs inline on AI-output pages, not in a global banner.
- **Reintroducing dark mode** for Phase 1 — light-mode only (D-011). Don't add `prefers-color-scheme: dark` overrides.
- **Hard-coding hex colors** in new pages — use the tokens in `globals.css` (`--color-primary`, `--color-muted`, `--color-card`, `--color-card-border`, `--color-accent-soft`, etc.). `--color-accent` is an alias of `--color-primary`, kept for backward compatibility with existing `text-accent`/`bg-accent` utility classes.
- **Committing fixes directly to `main`** during the issue-fix loop — branch per issue, squash-merge after user approval (see CLAUDE.md "Issue-fix workflow").
- Moving authenticated patient/doctor routes out of `(app)` / `(doctor)` route groups; the shell depends on those groups while preserving public URLs.
- Letting pending doctors reach patient data; doctor portal data routes require `require_verified_doctor`.

## Common operations

| Task | How |
|---|---|
| Start everything | `docker compose up -d postgres` then `uvicorn backend.main:app --port 8000` then `npm run dev` |
| Apply migrations | `cd niro && source .venv/bin/activate && alembic -c alembic.ini upgrade head` |
| New migration | `alembic -c alembic.ini revision --autogenerate -m "..."` — review the generated file before commit |
| Re-seed doctors | `python -m backend.seeds.doctors` (idempotent) |
| AI probe | `set -a && source ../.env && set +a && .venv/bin/python probe.py` |
| Type-check frontend | `npx tsc --noEmit` |
| Sign in as seeded doctor | OTP request `+88017000DOCTR1` through `DOCTR6`, code `123456`; lands on `/doctor-portal/dashboard` |
| Audit log peek | `docker compose exec -T postgres psql -U niro -d niro -c "SELECT event, count(*) FROM audit_log GROUP BY event;"` |

## When this skill is helpful

- "Add a new field to the analysis output"
- "Why is the AI returning 401?" → check `.env` whitespace, see Day 2 build-log
- "Add a new audit event type"
- "How do I extend the case-summary prompt?"
- "Build the BMDC live verification (Phase F2)"
- "Add a new doctor portal screen"
- "What's the migration history?"

## When this skill is NOT helpful

- Generic Python / Next.js questions
- ICADHI registration / submission portal questions (done)
- Pre-Niro AI provider research (decided — Azure OpenAI)
