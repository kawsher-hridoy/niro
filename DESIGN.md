# Niro — System Design Dossier

> Generated against the brief in `DESIGN_PROMPT.md`.
> Status: design complete; ready for implementation.
> Authors should treat this as the source of truth. If you change scope,
> update this file and `PROJECT.md` together.

---

## 1. Architecture Overview

Niro is a **single-VPS, three-tier web application** with a stateless
FastAPI backend, a Next.js 15 PWA frontend (patient + doctor + chamber
flows in one app), PostgreSQL+pgvector for storage, and a single
external dependency: Azure OpenAI. Everything else (BMDC registry,
bKash, SMS/IVR) is **mocked** for Phase 1 and integrated post-final.

```
                           ┌──────────────────────────────┐
                           │      Browser / PWA           │
                           │  Next.js 15 App Router       │
                           │  (Bangla-first, offline-cap) │
                           │ ┌────────┬────────┬───────┐  │
                           │ │Patient │ Doctor │Chamber│  │
                           │ └────────┴────────┴───────┘  │
                           └──────────────┬───────────────┘
                                          │  HTTPS / JWT
                                          ▼
            ┌────────────────────────────────────────────────────┐
            │              FastAPI backend (Python 3.12)         │
            │  ┌────────────────────────────────────────────┐    │
            │  │ Routers: auth · documents · analyses ·     │    │
            │  │ profile · consent · verification · doctors │    │
            │  │ reviews · chamber · audit                  │    │
            │  └────────────────────────────────────────────┘    │
            │  ┌────────────────────────────────────────────┐    │
            │  │ Services: AIProvider · ConsentGuard ·      │    │
            │  │ AuditWriter · BMDCVerifier (mock) ·        │    │
            │  │ PaymentGateway (mock) · Notifier (mock)    │    │
            │  └────────────────────────────────────────────┘    │
            └───────┬───────────────────┬─────────────┬──────────┘
                    │                   │             │
                    ▼                   ▼             ▼
        ┌────────────────────┐  ┌──────────────┐  ┌────────────────┐
        │ PostgreSQL 16      │  │ Blob store   │  │ Azure OpenAI   │
        │ + pgvector         │  │ /var/niro/   │  │ gpt-chat-latest│
        │  (PHI encrypted    │  │  uploads/    │  │  (Vision +     │
        │   at rest)         │  │  (encrypted) │  │   Bangla + JSON│
        │                    │  │              │  │   + tools)     │
        └────────────────────┘  └──────────────┘  └────────────────┘
```

**Why this shape:**

- One process per concern, no microservices. We are 23 days from a demo.
- The frontend is a single PWA with three route groups, not three apps,
  because shipping one is easier than shipping three.
- AI is the only external network hop in the hot path. Everything else
  is local, which means our demo doesn't fail because a third-party API
  rate-limited us at the wrong moment.

---

## 2. Component Responsibilities

| Component | Owns | Does NOT own | Scaling profile |
|---|---|---|---|
| **Next.js PWA** | All UI, OTP entry, file selection, QR scanning, route-level auth, language toggle | Business rules, AI calls, persistence | Static + edge; 1 instance handles thousands |
| **FastAPI backend** | Auth, business rules, all DB writes, AI orchestration, consent enforcement, audit log writes | Direct AI SDK calls outside `ai/` package | Single uvicorn worker × 4 = fine for demo |
| **AIProvider** | Abstracting the AI vendor, structured prompts, JSON enforcement, confidence scoring, retry, fallback | Knowing about patients or business rules | Stateless |
| **ConsentGuard** | Yes/no on "may doctor D see patient P's data X right now"; logs every check | Enforcing in the UI — UI is advisory; DB queries call the guard | Pure function over DB |
| **AuditWriter** | Append-only insertions into `audit_log`; one row per AI call and per doctor view | Reads, deletes, mutations | Pure append |
| **BMDCVerifier (mock)** | Returns `{verified: bool, qualifications: [...]}` for a BMDC #; mocked to seeded list in Phase 1 | Real registry integration | Replace with HTTP client post-final |
| **PaymentGateway (mock)** | Initiates payment, polls, returns transaction_id; bKash sandbox in Phase 2 | Refunds, disputes | Replace post-final |
| **PostgreSQL** | All structured data including documents.meta, analyses.json, audit_log | Files themselves | Single instance, daily backups |
| **Blob store** | Encrypted document bytes (originals + thumbnails) | Metadata | Local FS in MVP; S3-compatible post-final |
| **Azure OpenAI** | Vision + structured output + Bangla generation + tool calls | Anything that needs durability | Vendor-managed |

---

## 3. Data Model

All PHI-bearing tables marked **★**. Encryption at rest applies via
column-level encryption (`pgcrypto`) for `★` columns marked **enc**;
remaining `★` columns are inside the DB which is itself encrypted at
rest on disk.

```sql
-- ---------- USERS ----------
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role            TEXT NOT NULL CHECK (role IN ('patient','doctor','admin')),
  phone           TEXT UNIQUE NOT NULL,            -- ★ E.164
  full_name       TEXT NOT NULL,                   -- ★
  language        TEXT NOT NULL DEFAULT 'bn',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at   TIMESTAMPTZ
);

CREATE TABLE otp_codes (
  phone           TEXT PRIMARY KEY,
  code_hash       TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  attempts        INT NOT NULL DEFAULT 0
);

-- ---------- PATIENT ----------
CREATE TABLE patient_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dob             DATE,                            -- ★
  sex             TEXT CHECK (sex IN ('M','F','O')),
  allergies       JSONB NOT NULL DEFAULT '[]',     -- ★ enc
  conditions      JSONB NOT NULL DEFAULT '[]',     -- ★ enc
  height_cm       INT,
  weight_kg       NUMERIC(5,2)
);

-- ---------- DOCTOR ----------
CREATE TABLE doctor_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bmdc_number     TEXT UNIQUE NOT NULL,
  qualifications  JSONB NOT NULL DEFAULT '[]',     -- [{degree, year, institution}]
  specialties     TEXT[] NOT NULL DEFAULT '{}',    -- ['eye','diabetes',...]
  fee_tier        INT NOT NULL CHECK (fee_tier IN (1,2,3)),  -- 200/400/800 BDT
  chambers        JSONB NOT NULL DEFAULT '[]',     -- [{name, address, hours}]
  verified        BOOLEAN NOT NULL DEFAULT false,
  device_id_hash  TEXT,                            -- SHA256 of doctor's bound device
  bio            TEXT,
  photo_url      TEXT
);

-- ---------- DOCUMENTS ----------
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('prescription','lab_report','discharge','other')),
  original_name   TEXT,                            -- ★
  storage_key     TEXT NOT NULL,                   -- path in blob store
  mime_type       TEXT NOT NULL,
  sha256          TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  source          TEXT NOT NULL CHECK (source IN ('patient_upload','doctor_added'))
);

-- ---------- AI ANALYSES ----------
CREATE TABLE analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_name      TEXT NOT NULL,                   -- 'gpt-chat-latest'
  model_version   TEXT NOT NULL,                   -- '2026-05-05'
  structured      JSONB NOT NULL,                  -- ★ enc — extracted data
  explanation_bn  TEXT NOT NULL,                   -- ★ enc — Bangla narrative
  red_flags       JSONB NOT NULL DEFAULT '[]',     -- ★ enc
  questions_bn    JSONB NOT NULL DEFAULT '[]',     -- ★ enc
  confidence      NUMERIC(4,3) NOT NULL,
  prompt_sha256   TEXT NOT NULL,
  output_sha256   TEXT NOT NULL,
  latency_ms      INT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX analyses_patient_created ON analyses(patient_id, created_at DESC);

-- ---------- TIMELINE ----------
-- Timeline is a VIEW unioning documents + reviews so we never write
-- duplicated state. Patient's timeline = chronological events.
CREATE VIEW timeline_entries AS
SELECT
  d.id                            AS entry_id,
  d.patient_id                    AS patient_id,
  'document'                      AS entry_type,
  d.kind                          AS subtype,
  d.uploaded_at                   AS occurred_at,
  jsonb_build_object('document_id', d.id) AS ref
FROM documents d
UNION ALL
SELECT
  r.id, r.patient_id, 'doctor_review', r.disposition,
  r.submitted_at, jsonb_build_object('review_id', r.id)
FROM verification_reviews r
WHERE r.submitted_at IS NOT NULL;

-- ---------- CONSENT ----------
CREATE TABLE consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope           TEXT NOT NULL CHECK (scope IN ('single_document','last_3_months','full_history')),
  document_id     UUID REFERENCES documents(id),   -- when scope=single_document
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,                     -- non-null = revoked
  context         TEXT NOT NULL CHECK (context IN ('async_review','chamber','export'))
);

CREATE INDEX consents_patient_doctor_active
  ON consents(patient_id, doctor_id)
  WHERE revoked_at IS NULL;

-- ---------- ACCESS LOG (patient-visible) ----------
CREATE TABLE access_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_id      UUID NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  screen          TEXT NOT NULL,                   -- 'case_summary','timeline','document'
  document_id     UUID REFERENCES documents(id),
  viewed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  location        TEXT                             -- 'chamber:<address>' or 'async'
);

CREATE INDEX access_logs_patient_time ON access_logs(patient_id, viewed_at DESC);

-- ---------- VERIFICATION REQUESTS ----------
CREATE TABLE verification_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES documents(id),
  consent_id      UUID NOT NULL REFERENCES consents(id),
  fee_bdt         INT NOT NULL,
  payment_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending','paid','refunded','failed')),
  transaction_id  TEXT,
  ai_summary_id   UUID,                            -- pointer to the case-summary analysis
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_by          TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL UNIQUE REFERENCES verification_requests(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL,
  doctor_id       UUID NOT NULL,
  disposition     TEXT NOT NULL CHECK (disposition IN ('agree','concerns','escalate')),
  ai_claims_eval  JSONB NOT NULL DEFAULT '[]',     -- [{claim_id, agree:bool, note}]
  doctor_notes_bn TEXT NOT NULL,                   -- ★ enc
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- DOCTOR REVIEWS BY PATIENTS ----------
CREATE TABLE doctor_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_id UUID UNIQUE REFERENCES verification_requests(id)
                  ON DELETE CASCADE,              -- proof of verified consult
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text            TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  hidden          BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX doctor_reviews_doctor ON doctor_reviews(doctor_id);

-- ---------- CHAMBER SESSIONS ----------
CREATE TABLE chamber_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES users(id),
  consent_id      UUID REFERENCES consents(id),
  qr_token        TEXT UNIQUE NOT NULL,            -- short-lived, doctor-side
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  bound_at        TIMESTAMPTZ,                     -- when patient scanned
  expires_at      TIMESTAMPTZ NOT NULL,
  closed_at       TIMESTAMPTZ,
  chamber_address TEXT
);

-- ---------- AUDIT LOG (append-only, system-wide) ----------
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  ts              TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id        UUID,                            -- nullable for system events
  actor_role      TEXT,
  event           TEXT NOT NULL,
  -- common refs (any may be null)
  patient_id      UUID,
  doctor_id       UUID,
  document_id     UUID,
  analysis_id     UUID,
  consent_id      UUID,
  -- AI-specific
  model_name      TEXT,
  model_version   TEXT,
  prompt_sha256   TEXT,
  output_sha256   TEXT,
  confidence      NUMERIC(4,3),
  -- context
  detail          JSONB NOT NULL DEFAULT '{}'      -- never PHI; redacted
);

CREATE INDEX audit_log_ts ON audit_log(ts DESC);
CREATE INDEX audit_log_patient ON audit_log(patient_id, ts DESC);
```

**Why a view for timeline:** the timeline is read-heavy and reconstructible
from sources of truth. Writing a denormalized `timeline_entries` table
just doubles the consistency bugs. View it is.

**Why an audit_log table separate from access_logs:** access_logs are
patient-visible. audit_log is system-wide forensics and includes AI
events (which patients don't need to see in a list). One serves UX,
the other serves compliance.

---

## 4. API Surface

All endpoints under `/api/v1`. Auth via `Authorization: Bearer <jwt>`
header. JWTs short-lived (1h), refresh tokens 30d.

| Method | Path | Body / Params | Auth | Phase |
|---|---|---|---|---|
| POST | `/auth/otp/request` | `{phone}` | none | 1 |
| POST | `/auth/otp/verify` | `{phone, code}` → `{access, refresh, role}` | none | 1 |
| POST | `/auth/refresh` | `{refresh}` → `{access}` | refresh | 1 |
| POST | `/auth/logout` | — | bearer | 1 |
| **Patient — documents** | | | | |
| POST | `/documents` | multipart `file`, `kind` → `{document_id}` | patient | 1 |
| GET | `/documents/{id}` | — → document meta + signed url | owner | 1 |
| GET | `/documents` | `?since=...` → paged list | owner | 1 |
| DELETE | `/documents/{id}` | — | owner | 1 |
| **Patient — analyses** | | | | |
| POST | `/analyses` | `{document_id, use_history?: true}` → `{analysis_id, status}` (sync 200 if fast, 202 if queued) | owner | 1 |
| GET | `/analyses/{id}` | — → analysis JSON | owner OR consented doctor | 1 |
| GET | `/analyses` | `?patient_id=` | self OR consented doctor | 1 |
| GET | `/analyses/{id}/export.pdf` | — → PDF bytes | owner | 1 |
| **Patient — profile** | | | | |
| GET | `/me` | — | bearer | 1 |
| PATCH | `/me` | `{full_name?, dob?, sex?, allergies?, conditions?}` | bearer | 1 |
| GET | `/me/timeline` | — | patient | 1 |
| DELETE | `/me` | confirm header | bearer | 1 (DPA 2023) |
| **Consent** | | | | |
| POST | `/consents` | `{doctor_id, scope, document_id?, expires_in_hours, context}` → `{consent_id}` | patient | 1 |
| POST | `/consents/{id}/revoke` | — | patient | 1 |
| GET | `/me/access-log` | `?since=` | patient | 1 |
| **Verification** | | | | |
| POST | `/verifications` | `{doctor_id, document_id, scope, expires_in_hours}` → `{request_id, fee_bdt, payment_intent}` | patient | 1 |
| POST | `/verifications/{id}/pay` | `{transaction_id}` (mock OK) | patient | 1 |
| GET | `/verifications/{id}` | — | patient OR doctor | 1 |
| GET | `/me/verifications` | `?status=` | patient | 1 |
| **Doctor portal** | | | | |
| GET | `/doctor/inbox` | — → pending requests | doctor | 1 |
| GET | `/doctor/cases/{request_id}` | — → AI case summary + history (consent-gated) | doctor | 1 |
| POST | `/doctor/cases/{request_id}/review` | `{disposition, ai_claims_eval, doctor_notes_bn}` | doctor | 1 |
| **Doctor directory** | | | | |
| GET | `/doctors` | `?specialty=&fee_tier=&q=` | bearer | 1 |
| GET | `/doctors/{id}` | — → public profile + reviews | bearer | 1 |
| POST | `/doctors/{id}/reviews` | `{rating, text, verification_id}` (verification ownership checked) | patient | 1 |
| **Chamber** | | | | |
| POST | `/chamber/session` | — → `{qr_token, expires_at}` | doctor | 1 |
| POST | `/chamber/session/{qr_token}/scan` | `{scope, expires_in_hours}` → `{consent_id}` | patient | 1 |
| GET | `/chamber/session/{id}/profile` | — → AI summary + timeline (consent-gated) | doctor | 1 |
| POST | `/chamber/session/{id}/prescription` | multipart `file`+`structured` | doctor | 1 |
| POST | `/chamber/session/{id}/close` | — | doctor or system (expiry) | 1 |
| **Audit (patient view)** | | | | |
| GET | `/me/audit` | `?event=&since=` | patient | 1 |
| **Admin** | | | | |
| POST | `/admin/doctors/{id}/verify` | — | admin | 1 |

Response envelope is direct JSON, not wrapped. Errors:
`{error: {code, message_bn, message_en, detail?}}`.

---

## 5. AI Integration Contract

### Interface (`backend/ai/provider.py`)

```python
from abc import ABC, abstractmethod
from typing import Literal, TypedDict
from datetime import datetime

class StructuredMedication(TypedDict):
    name: str
    strength: str | None
    dosage: str | None        # "1+0+1"
    frequency: str | None     # "after meal"
    duration: str | None
    notes: str | None

class StructuredLabValue(TypedDict):
    parameter: str
    value: str
    unit: str | None
    reference: str | None
    abnormal: bool

class DocumentAnalysis(TypedDict):
    kind: Literal["prescription", "lab_report", "discharge", "other"]
    structured: dict          # shape depends on kind
    explanation_bn: str
    red_flags: list[dict]     # [{label_bn, severity:'info'|'warn'|'danger'}]
    questions_bn: list[str]
    confidence: float         # 0..1
    model_name: str
    model_version: str

class CaseSummary(TypedDict):
    patient_summary_bn: str   # 1-paragraph in Bangla
    current_medications: list[StructuredMedication]
    ai_concerns: list[dict]   # [{claim_id, claim_bn, severity}]
    questions_for_doctor: list[str]
    referenced_history: list[str]  # IDs of past analyses cited

class AIProvider(ABC):
    @abstractmethod
    def analyze_document(
        self,
        image_or_pdf_bytes: bytes,
        mime: str,
        hint_kind: str | None = None,
        history: list[DocumentAnalysis] | None = None,
    ) -> DocumentAnalysis: ...

    @abstractmethod
    def prepare_case_summary(
        self,
        target_analysis: DocumentAnalysis,
        history: list[DocumentAnalysis],
    ) -> CaseSummary: ...

    @abstractmethod
    def check_drug_interaction(
        self, drug_a: str, drug_b: str
    ) -> dict: ...  # backed by RAG over DGDA formulary
```

### Concrete: `AzureOpenAIProvider`

- Uses the `openai` SDK pointed at `AZURE_OPENAI_ENDPOINT`.
- Model: `AZURE_OPENAI_DEPLOYMENT` (= `gpt-chat-latest`).
- All calls use `response_format={"type":"json_object"}` where possible.
- Image inputs sent as `data:` URIs (base64) in `image_url` content blocks.
- Confidence: derived from a structured `_meta.confidence` field the
  prompt explicitly asks the model to emit, calibrated against a fixed
  golden set in CI.
- All calls go through `AuditWriter.record_ai_call(...)` before
  returning to caller.

### System prompts (Bangla, abbreviated)

`prompts.ANALYZE_PRESCRIPTION_BN`:
```
আপনি একজন সতর্ক চিকিৎসা সহকারী। ছবিতে একটি বাংলাদেশি ডাক্তারের
প্রেসক্রিপশন আছে। কাজ:
1) ওষুধগুলো structured JSON-এ বের করো (নাম, শক্তি, ডোজ, ফ্রিকোয়েন্সি, সময়কাল)।
2) "explanation_bn" — রোগীর জন্য সহজ বাংলায় ৩-৫ লাইনে ব্যাখ্যা।
3) "red_flags" — যেসব বিষয় সতর্কতার দরকার (যেমন অজানা ওষুধ, অসামঞ্জস্য)।
4) "questions_bn" — ডাক্তারকে জিজ্ঞাসা করার মতো ৩টি প্রশ্ন।
5) "_meta.confidence" — ০ থেকে ১, কতটা নিশ্চিত আপনি extraction-এ।

নিষেধাজ্ঞা:
- নতুন ওষুধের পরামর্শ দেবেন না।
- ডোজ পরিবর্তনের পরামর্শ দেবেন না।
- "আপনি X গ্রহণ করুন" — এই ধরনের বাক্য ব্যবহার করবেন না।
- শুধু ব্যাখ্যা ও সতর্কতা দিন।

কেবলমাত্র JSON ফেরত দিন। কোনো prose না।
```

(Equivalent prompts for lab report, case summary, and tool-aware
drug-interaction live in `backend/ai/prompts.py`.)

### Forbidden by contract

The AI must not:
- Emit imperative dosing instructions ("আপনি ... গ্রহণ করুন").
- Diagnose conditions.
- Recommend new drugs.
- Speculate on values not present in the source.

We enforce this via a post-call linter that scans the output for
banned phrases (regex list); a hit raises `AIPolicyViolation` and
sends the analysis to a "low confidence, recommend human review"
fallback.

---

## 6. Security & Compliance Architecture

| Concern | Approach |
|---|---|
| **Patient auth** | Phone + SMS OTP. SMS via mock in dev; SSL Wireless / BulkSMSBD post-final. JWT access 1h, refresh 30d. Refresh rotation on use. |
| **Doctor auth** | Same OTP, plus device binding: first login captures device fingerprint (SHA256), stored in `doctor_profiles.device_id_hash`. Subsequent logins must match or trigger re-verification. WebAuthn passkey for biometric on supported devices. |
| **Admin auth** | Manual seeding only; not exposed via signup. |
| **Encryption at rest** | Postgres on a LUKS-encrypted volume. PHI-marked columns additionally column-encrypted via `pgcrypto` with a master key in env (rotated separately). Blob store directory is encrypted with `gocryptfs` or `age` per file. |
| **Encryption in transit** | TLS 1.2+ everywhere; HSTS preload; cert via Caddy auto-Let's Encrypt. |
| **BMDC verification** | Phase 1: mock — admin manually flips `verified=true` for seeded doctors. Phase 2: HTTP client against the BMDC public registry lookup with a cached result. |
| **Consent enforcement** | `ConsentGuard.require(patient_id, doctor_id, scope, context)` is called by **every** doctor-side data fetch. No SQL for patient data runs without it. Enforced via repository wrappers, not UI. |
| **Audit log integrity** | `audit_log` is append-only at the application layer; the DB role used by the app has `INSERT, SELECT` but not `UPDATE, DELETE`. A nightly job copies new rows to an offline log file with rolling hash for tamper evidence (Phase 2). |
| **DPA 2023 — deletion** | `DELETE /me` cascades through FK; blob storage purged by background worker. Tombstone row in `audit_log` records the event without PHI. |
| **DPA 2023 — export** | `GET /me/export` returns a ZIP: profile JSON + all documents + all analyses + access log + audit log filtered to this patient. |
| **Incident playbook** | Stored in `docs/runbook.md` (post-final). Phase 1: only the `revoke_all_consents(patient_id)` admin script exists for emergency. |

### Doctor identity at chamber

Two-factor at every chamber session:

1. Doctor must be logged in on the **device bound** to their account.
2. Doctor scans patient's QR (or vice versa); patient confirms scope
   from their own device. No data loads on the doctor's tablet until
   the patient's app POSTs `/chamber/session/{qr_token}/scan`.

Even if a compounder steals the tablet, they can't see a profile
without the patient's app actively approving.

---

## 7. Frontend Architecture

Single Next.js 15 app, App Router, **three route groups + shared shell**.

```
frontend/app/
├── layout.tsx                    # shell, language toggle, font load
├── globals.css                   # tailwind + Bangla typography
├── (auth)/
│   ├── signin/page.tsx
│   └── verify/page.tsx
├── (patient)/
│   ├── home/page.tsx             # dashboard: upload CTA + recent timeline
│   ├── upload/page.tsx           # camera/gallery + kind selector
│   ├── analyses/[id]/page.tsx    # AI result view, Bangla, red flags, CTA "Request review"
│   ├── timeline/page.tsx
│   ├── doctors/page.tsx          # directory search
│   ├── doctors/[id]/page.tsx     # doctor profile + book review
│   ├── verifications/page.tsx
│   ├── verifications/[id]/page.tsx
│   ├── access-log/page.tsx
│   └── settings/page.tsx
├── (doctor)/
│   ├── inbox/page.tsx
│   ├── cases/[id]/page.tsx       # case summary + history + write review
│   ├── chamber/page.tsx          # show QR, wait for scan, then load profile
│   └── chamber/[session_id]/page.tsx
├── (chamber-tablet)/
│   └── tablet/page.tsx           # full-screen doctor-tablet UI
├── components/
│   ├── BanglaText.tsx
│   ├── ConfidenceBadge.tsx
│   ├── ConsentDialog.tsx
│   ├── RedFlagChip.tsx
│   ├── TimelineEntry.tsx
│   ├── CaseSummaryCard.tsx
│   ├── DisclaimerBanner.tsx      # always-on disclaimer
│   └── QRDisplay.tsx
├── lib/
│   ├── api.ts                    # typed fetch wrapper
│   ├── auth.ts                   # token storage (httpOnly cookie via API proxy)
│   ├── i18n.ts
│   └── consent.ts                # client-side consent UI helpers
└── styles/
    └── bangla.css                # Noto Sans Bengali, ligature tweaks
```

**Server vs client components:** default to **server components**.
Make a component a client component only when it needs `onClick`,
form state, camera, QR scanner, or `useEffect`. Examples:

- `upload/page.tsx` — client (camera + state)
- `analyses/[id]/page.tsx` — server (just renders DB content)
- `ConsentDialog.tsx` — client (form state)
- `QRDisplay.tsx` — server (just renders a `<canvas>`-less SVG)
- `chamber/page.tsx` — client (polls the session status)

**Bangla typography:** ship Noto Sans Bengali (subset to common
characters) via `next/font/google` or self-hosted. Set
`font-feature-settings: "akhn", "blwf", "half"` to ensure ligatures
render correctly. Test on Chrome Android, iOS Safari, Firefox.

**Offline-first (patient app):**
- Timeline cached via SWR with a long stale window.
- Service worker (next-pwa) caches the shell + last 50 timeline items.
- Uploads queued in IndexedDB if offline; flushed on reconnect.

---

## 8. Storage Strategy

| Data | Where | Rationale |
|---|---|---|
| Structured records | PostgreSQL 16 | Single source of truth, ACID, easy backups |
| Document blobs (originals) | Local FS `/var/niro/blobs/{patient_id}/{document_id}.{ext}` in dev; S3-compatible (Backblaze B2, Wasabi) in prod | Cheap, simple in dev; S3 for durability + signed URLs in prod |
| Thumbnails | Same as blobs, suffix `.thumb.jpg` | Generated on upload by background task |
| DGDA formulary embeddings | pgvector table `drug_kb_embeddings` | Avoids running a separate vector DB |
| Sessions | Postgres `sessions` table | One less moving part than Redis for the demo |
| Rate limits | In-memory (single process) for MVP; Redis post-final | Demo only has one box; no need |

**Blob layout:**
```
/var/niro/blobs/
└── <patient_uuid>/
    ├── <document_uuid>.jpg
    └── <document_uuid>.thumb.jpg
```

**Signed URLs:** backend issues a 5-minute signed URL when the
frontend requests a document. URL contains `patient_id`, `document_id`,
`expires`, `nonce`, HMAC-signed with the app secret. Backend
verifies on GET `/blob/...`.

---

## 9. Observability

| Layer | Tool | What |
|---|---|---|
| Structured logs | `structlog` → JSON to stdout, captured by `journalctl` | INFO: route + user_role + status; WARN: 4xx; ERROR: 5xx + traceback |
| Metrics | Prometheus `/metrics` endpoint (optional Phase 2) | Request count, latency P50/P95, AI call count + cost |
| Tracing | None for Phase 1 | Add OpenTelemetry post-final if needed |
| Errors | Sentry (free tier) | Captures unhandled exceptions; PII scrubbing on |
| AI cost | Daily script reads `audit_log`, sums tokens × Azure unit cost | Posted to Slack/console |

**PHI never appears in logs.** Logging middleware redacts request
bodies on PHI routes and replaces with `<redacted len=N>`. Log fields
are limited to: `request_id`, `user_id`, `user_role`, `route`,
`method`, `status`, `latency_ms`, plus event-specific non-PHI fields.

---

## 10. Deployment Topology

**Local dev:**
```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    volumes: ["./.data/pg:/var/lib/postgresql/data"]
    environment:
      POSTGRES_USER: niro
      POSTGRES_PASSWORD: niro
      POSTGRES_DB: niro
  backend:
    build: ./niro/backend
    ports: ["8000:8000"]
    env_file: [.env]
    depends_on: [postgres]
    volumes: ["./.data/blobs:/var/niro/blobs", "./niro/backend:/app"]
  frontend:
    build: ./niro/frontend
    ports: ["3000:3000"]
    env_file: [.env]
    depends_on: [backend]
    volumes: ["./niro/frontend:/app", "/app/node_modules", "/app/.next"]
```

**Production (single VPS, $12/mo Hetzner CX22 or DO 2vCPU/2GB):**

```
Caddy (TLS, reverse proxy, HSTS)
  ├── niro.example.com         → Next.js (3000)
  └── api.niro.example.com     → FastAPI (8000)

systemd units:
  - niro-postgres.service
  - niro-backend.service       (uvicorn --workers 4)
  - niro-frontend.service      (next start)
  - niro-backup.timer          (nightly pg_dump → encrypted to B2)
```

**TLS:** Caddy handles auto-renewal. **Domain:** any cheap `.site` is fine.

**Backups:** nightly `pg_dump | age -r <recipient>` → B2 bucket. 7-day
retention. Restore tested at least once before demo day.

---

## 11. Testing Strategy

For a 23-day window, we test **what would lose us the demo if it broke.**

| Test type | Coverage | Tool |
|---|---|---|
| AI golden tests | 5 fixed `(image, expected_keys)` pairs run on CI | pytest |
| Contract tests | `analyze_document` returns valid `DocumentAnalysis` for golden inputs | pytest + JSON schema |
| Consent guard unit tests | Every guard rule has a yes/no test | pytest |
| Audit writer integration test | Every AI call writes exactly one audit row | pytest + testcontainers postgres |
| Frontend smoke test | Login → upload → analyze → view result works in headless Chromium | Playwright, ~3 scenarios only |
| Manual demo dry-run | The full 5-min demo script run once daily after 1 June | human |

**What we skip:** E2E test coverage, load tests, fuzz tests,
accessibility tests beyond manual checks. These are Phase 3.

---

## 12. Phased Build Plan

**Assumption:** team of 1–3 people. Tanvir (TL) does backend + AI;
optional teammate A does frontend; optional teammate B does design +
content. If solo, halve frontend ambitions and lean on shadcn/ui
defaults.

### Phase 1 — Build the video submission

#### Day 1 — Friday 23 May (today, late evening) — ~4h

- [ ] Register team on ICADHI site (Tk 300, deadline today).
- [ ] Rotate Azure key, put in `.env`.
- [ ] `docker compose up -d postgres`.
- [ ] Scaffold FastAPI: `main.py`, routers stub, Alembic init, first
      migration with `users` + `documents` tables.
- [ ] Scaffold Next.js: `create-next-app niro/frontend --typescript --tailwind --app`.
- [ ] Confirm `probe.py` still passes against `gpt-chat-latest`.

**Exit:** `docker compose up` runs cleanly. `GET /api/v1/health`
returns 200. `localhost:3000` shows Next.js placeholder.

**Don't do:** auth, UI polish, real prompts.

---

#### Day 2 — Saturday 24 May — full day (~8h)

- [ ] Migrations: all remaining tables from §3.
- [ ] `AIProvider` interface + `AzureOpenAIProvider` impl + prompt
      module (Bangla prescription + lab prompts).
- [ ] `AuditWriter` + `ConsentGuard` services with unit tests.
- [ ] Endpoints: `/auth/otp/*` (mock OTP code = `123456` in dev),
      `/documents` (upload), `/analyses` (sync call to AzureProvider).
- [ ] Storage: local blob writer with sha256.
- [ ] Frontend: `(auth)/signin` + `(auth)/verify` + `(patient)/home`
      + `(patient)/upload` + `(patient)/analyses/[id]`.
- [ ] Bangla font setup; disclaimer banner global component.
- [ ] First end-to-end happy path: phone → OTP → upload prescription
      → see Bangla analysis.

**Exit:** record a 30s clip of the happy path. If it doesn't feel
right, ditch the frontend for tonight and fix tomorrow — backend
correctness comes first.

**Don't do:** doctor portal, consent UI, payment.

---

#### Day 3 — Sunday 25 May — full day (~8h)

- [ ] History-aware analysis: pass last 3 analyses as context in the
      prompt; show "AI noticed X from your past visit" in UI.
- [ ] Timeline view with chronological entries.
- [ ] Consent flow: `POST /consents`, `ConsentDialog` component,
      time-bound expiry. Access log endpoints.
- [ ] Doctor portal stub: seed 6 doctor profiles via SQL, `/doctor/inbox`,
      `/doctor/cases/[id]` (consent-gated load of case summary).
- [ ] `prepare_case_summary()` AIProvider method.
- [ ] Verification request: `POST /verifications` with mock
      `payment_status='paid'` after a 2s delay.

**Exit:** patient can request a review, doctor sees AI case summary
+ scrollable history, writes a review, patient sees it back in
their timeline.

**Don't do:** chamber, directory search, BMDC verification.

---

#### Day 4 — Monday 26 May — full day (~8h)

- [ ] Chamber QR flow: doctor `/chamber` page shows QR; patient app
      scans (use `react-zxing` or `qr-scanner`); patient picks scope
      + duration; doctor's tablet view loads profile.
- [ ] Doctor writes new prescription back to patient profile via
      `POST /chamber/session/{id}/prescription`.
- [ ] Doctor directory page with seeded data + simple search.
- [ ] PDF export of analysis via `weasyprint` or `playwright` print.
- [ ] Access log + audit log views.
- [ ] **Buffer:** any feature that ran long from Day 2/3.

**Exit:** full Phase-1 flow works end-to-end on at least one
device. Internal demo to yourself at end of day.

---

#### Day 5 — Tuesday 27 May — submission day (~4h then submit)

- [ ] Final bug bash on the demo path. **Add no new features.**
- [ ] Record the **90-second Phase-1 video** following §13 script.
- [ ] Write the proposal text per ICADHI rules.
- [ ] Submit before EOD.

**Hard rule:** by 12:00, the build is frozen.

---

### Phase 2 — Build for the live final (if shortlisted)

#### Wed 27 May — Sat 30 May (waiting for selection result)

- [ ] Rest a day. Then start polish on a `polish/*` branch.
- [ ] Write Playwright smoke tests.
- [ ] Real BMDC verification: HTTP client + 24h cache.
- [ ] bKash sandbox integration (or commit to mock if sandbox is slow).
- [ ] Visual polish: dark-mode shell, better empty states, accessibility.

#### Sun 31 May — Wed 4 June (if shortlisted on 30 May)

- [ ] Deploy to VPS. Caddy + Let's Encrypt + systemd units.
- [ ] Onboard one real MBBS friend/relative as a doctor account for
      live demo response.
- [ ] Backup script tested end-to-end with a restore.
- [ ] Practice demo script daily.

#### Thu 5 June — final registration

- [ ] Register for final phase per ICADHI.

#### Fri 6 — Sat 14 June

- [ ] Daily 5-min demo dry-runs (timed).
- [ ] One stress test: 10 simultaneous uploads to confirm no falls.
- [ ] Prepare slides (max 5) for the verbal pitch.
- [ ] Pre-flight checklist (§14 risk register).

#### Sun 15 June — demo day

- [ ] Arrive 90 minutes early. Set up. Run pre-flight checklist.
- [ ] Demo. Don't change anything between morning rehearsal and demo.

---

## 13. Demo Script

### Phase-1 video — 90 seconds

> Filmed as a single screen-recording of the patient app + a brief cut
> to the doctor's tablet. Voice-over in Bangla with English captions.

| t | Visual | Voice-over (Bangla) |
|---|---|---|
| 0:00 | Niro logo + tagline | "নিরো — আপনার স্বাস্থ্য, আপন হাতে।" |
| 0:05 | Patient home, timeline showing 3 past entries | "রহিমা'র পুরো মেডিকেল হিস্ট্রি — সব এক জায়গায়।" |
| 0:12 | Tap upload, pick prescription photo | "নতুন প্রেসক্রিপশন আপলোড করুন।" |
| 0:18 | AI analyzes, shows structured meds + Bangla explanation + red flags | "AI ৩ সেকেন্ডে বুঝিয়ে দিল।" |
| 0:30 | Cross-reference card: "আপনি জানুয়ারিতে Metformin-এ ছিলেন; এই নতুন প্রেসক্রিপশনে Glimepiride যোগ হয়েছে — সতর্কতা।" | "শুধু এই প্রেসক্রিপশন না — আপনার পুরো হিস্ট্রি দেখে AI সতর্ক করল।" |
| 0:42 | Tap "Request Verification", pick Dr. Bijoy, share "full history, 24h" | "ডাঃ বিজয়কে যাচাই করতে বলুন। মাত্র ৪০০ টাকায়।" |
| 0:55 | Cut to doctor tablet — AI case summary loaded | "ডাক্তার পান AI-তৈরি case summary, ৫ মিনিটে সিদ্ধান্ত।" |
| 1:10 | Patient access log: "Dr. Bijoy viewed your profile at 2:34 PM" | "প্রতিটি অ্যাক্সেস log হয়। গোপনীয়তা সম্পূর্ণ আপনার হাতে।" |
| 1:20 | Niro logo + "AI-Driven Telemedicine · IEEE ICADHI 2026" | "নিরো — বাংলাদেশের প্রথম রোগী-নিয়ন্ত্রিত মেডিকেল রেকর্ড।" |
| 1:30 | End | — |

### Phase-2 live demo — 5 minutes

| min | What happens |
|---|---|
| 0:00–0:30 | Verbal pitch: the problem, the pitch line, three pillars. |
| 0:30–2:00 | Patient flow live: upload a real prescription a judge brings, see Bangla output, history cross-reference. |
| 2:00–3:00 | Request verification → doctor (your MBBS friend, on call) responds within 90s; show response landing back in the patient timeline. |
| 3:00–4:00 | Chamber flow: switch to tablet UI, generate QR, patient app scans, consent dialog, doctor sees profile, writes a fake prescription. |
| 4:00–4:30 | Show access log + audit trail. The trust differentiator. |
| 4:30–5:00 | Close: market, white space, roadmap, ask. |

**Hard rules for demo day:**
- Never type live unless the keyboard is the demo. Pre-fill everything.
- Have a fallback recorded video on your phone in case the network dies.
- The MBBS friend is on a video call in another room, watching for the
  trigger; can also be pre-recorded if their availability is risky.

---

## 14. Risk Register

| # | Risk | L | I | Owner | Mitigation |
|---|---|---|---|---|---|
| 1 | Azure model deployment revoked (account owner removes access) | M | H | TL | `AIProvider` abstraction; have Anthropic + Gemini API keys ready in `.env`; flip env var |
| 2 | AI returns hallucinated dosage that judges spot | L | H | AI eng | Banned-phrase linter; confidence threshold; UI says "AI-extracted, confirm with doctor" |
| 3 | Content filter refuses medical document mid-demo | L | H | AI eng | Probe pre-clears typical content; have a different deployment as backup |
| 4 | bKash sandbox slow/broken | M | M | BE | Phase 1: mock with a fake 2s `payment_status='paid'`; Phase 2: mock if sandbox is flaky on demo day |
| 5 | Compounder logs into doctor account | L | M | BE | Device binding + biometric; Phase 1 acceptable to mention as a planned control |
| 6 | Network failure during live demo | M | H | TL | Local-only fallback: backend runs on demo laptop; tethered hotspot ready; pre-recorded video on phone |
| 7 | Judges ask "what if AI is wrong" | H | M | TL | Answer ready: "AI never gives final advice; flags concerns; confidence-gated; humans verify the high-stakes cases. Here's the audit log." |
| 8 | BMDC verification API rate-limit / outage | L | L | BE | Cache results 24h; Phase 1 entirely mocked |
| 9 | Bangla typography breaks on judge's browser | L | M | FE | Self-host Noto Sans Bengali; test on Chrome+Safari+Firefox before demo |
| 10 | Solo developer burnout in 23-day window | H | H | TL | Cut Day-3/Day-4 features ruthlessly; chamber QR is the only "wow" beyond pillar 1; if running behind, mock the chamber flow rather than build it real |

---

## 15. Open Questions (with my default answer)

1. **Team size — solo or 2-3?**
   *Default:* assume solo unless told otherwise; that shapes the plan.
2. **Real MBBS doctor for the live demo?**
   *Default:* recruit a friend by 30 May; have a pre-recorded fallback.
3. **Bangla TTS — Phase 1 or Phase 2?**
   *Default:* Phase 2. Skip in Phase 1; the video has voice-over instead.
4. **Use shadcn/ui for components or hand-roll?**
   *Default:* shadcn/ui. We don't have time to hand-roll modals,
   dialogs, drawers, toasts.
5. **PWA install prompt — required for Phase 1 demo?**
   *Default:* no; just ensure it works as a normal mobile web app.
6. **Doctor onboarding — open signup or admin-only seeded list for
   Phase 1?**
   *Default:* admin-only seeded list. Six seeded doctors is enough
   for the demo. Open signup is post-final.
7. **Real BMDC integration before 27 May?**
   *Default:* no; mocked with seeded `verified=true` rows.
8. **Where do we get a real handwritten prescription image for the
   video shoot?**
   *Default:* ask 2 family members for their prescriptions and use
   the cleanest with verbal consent.

---

## TL;DR — top 5 decisions

1. **Web-first PWA, single Next.js app with three route groups.** No
   native apps before ICADHI. One codebase, one deploy, one tested
   surface.
2. **Single VPS with docker-compose locally, Caddy + systemd in prod.**
   No Kubernetes, no microservices, no message queue.
3. **All AI calls go through `AIProvider` interface; Azure is the
   default; Claude + Gemini are plug-in fallbacks via env var.**
4. **Consent enforced at the data-access layer via `ConsentGuard`, not
   in the UI.** Audit log is a first-class entity, designed before any
   feature writes to it.
5. **Phase-1 scope is frozen as of today.** Anything not in §12's
   Day-1-through-Day-5 task list is a v1.1 idea, not a build item.

---

## STOP-AND-ASK — must answer before coding starts

- **Will you build solo or with teammates?** (Affects Day 2–4 split.)
- **Do you have a willing MBBS contact for the live demo on 15 June?**
- **Is the leaked Azure key being rotated tonight?** (Yes/no — if no,
  it changes our deployment plan because the current key may die.)
- **Are you comfortable mocking bKash for Phase 1 and integrating
  real bKash post-final?** (We strongly recommend yes.)
- **What's your domain name?** (Needed for Caddy + TLS setup.)

---

*Document version: 1.0 — 23 May 2026. Companion to PROJECT.md and
DESIGN_PROMPT.md. Engineering memory in CLAUDE.md.*
