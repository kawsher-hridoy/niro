# Niro · নিরো

> **আপনার স্বাস্থ্য, আপন হাতে।** _(Your health, in your own hands.)_
>
> Bangladesh's first patient-owned medical record. AI explains every
> prescription and report in Bangla, and gives every doctor your full
> medical picture in 30 seconds.

**Status:** Phase 1 feature-complete (23 May 2026) · IEEE ICADHI 2026
Track 1 — AI-Driven Telemedicine · [Submission portal](https://icadhi.daffodilvarsity.site/)

---

## Table of contents

- [What Niro does](#what-niro-does)
- [Demo flow at a glance](#demo-flow-at-a-glance)
- [Tech stack](#tech-stack)
- [Quick start (5 minutes)](#quick-start-5-minutes)
- [Detailed setup](#detailed-setup)
- [How to log in](#how-to-log-in)
- [How to verify each feature](#how-to-verify-each-feature)
- [Full 14-step smoke test](#full-14-step-smoke-test)
- [What each page does](#what-each-page-does)
- [What each backend module does](#what-each-backend-module-does)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Phase status](#phase-status)
- [Decisions & open questions](#decisions--open-questions)
- [Troubleshooting](#troubleshooting)
- [Documentation index](#documentation-index)
- [For AI agents (Claude / Codex)](#for-ai-agents-claude--codex)

---

## What Niro does

Niro is one app that does three connected things:

| # | Pillar | What happens |
|---|---|---|
| 1 | **AI Document Analyzer** | Patient uploads a photo or PDF of a prescription or lab report. AI extracts medications + dosages, explains them in Bangla, flags concerns, and lists questions to ask the doctor. Confidence scored, audit-logged, banned-phrase linted. |
| 2 | **Patient-Owned Profile** | Every uploaded document becomes a timeline entry. The AI uses the full history as context for the next analysis ("you were on Metformin in January; this new prescription adds Glimepiride — possible interaction"). Patient owns and can delete all data (DPA 2023). |
| 3 | **Doctor Verification + Chamber** | Two modes: **async paid review** — pay Tk 200/400/800, a BMDC-verified doctor reviews the AI's read; **offline chamber** — at a doctor's chamber, scan a QR, doctor sees the full medical history in 30 seconds and can write a new prescription back into the patient's profile. |

**The differentiator:** the AI prepares the case so the doctor's review
takes 5 minutes instead of 30 — which is why we can charge Tk 200
instead of Tk 2000. And it works in **offline chambers** where most
Bangladeshi care actually happens.

---

## Demo flow at a glance

```
PATIENT                                           DOCTOR
───────                                           ──────
                                                  ┌──────────────────────┐
   1. Phone OTP signin (mock 123456)              │ /signin → JWT issued │
                                                  └──────────────────────┘
   2. Upload prescription/lab photo
        ↓
   3. AI analyzes in Bangla              ──→  audit_log row #1: ai.analyze.document
        ↓
   4. (Re-upload another) — AI cross-references history  →  audit_log row #2
        ↓
   5. Browse doctor directory by specialty
        ↓
   6. Request verification from Dr. Bijoy (Tk 400)
        ↓
   7. Mock-pay 2s → status `paid`        ──→  audit_log row: payment.mock_paid
                                                  ↓
                                          ┌─────────────────────────────────┐
                                          │ 8. Doctor sees case in /inbox   │
                                          │ 9. Opens case → AI summary in   │
                                          │    Bangla (5-9s) + history      │
                                          │10. Reviews & submits "agree"    │
                                          └─────────────────────────────────┘
                                                  ↓
  11. Patient timeline: review appears
  12. Access log: "Dr. Bijoy viewed at 2:34 PM"

CHAMBER FLOW (in person at a clinic)
─────────────────────────────────────
                                          ┌──────────────────────────────┐
                                          │ Doctor: /doctor-portal/      │
                                          │   chamber → QR shown         │
                                          └──────────────────────────────┘
  13. Patient: /chamber/scan camera → QR  ──→
        ↓
  14. Patient consent dialog → approve
        ↓                                          ↓
       (consent created, session bound)    Doctor's tablet auto-loads:
                                              - AI summary
                                              - Full timeline
                                              - Latest analysis
                                                  ↓
                                          15. Doctor writes new Rx → patient profile
  16. Patient sees new doc in timeline    ←── audit_log: doctor.prescription.written
                                                  ↓
                                          17. Close session → consent auto-revoked
```

End result: **a single audit log with 15+ distinct event types**
recording every action.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Python 3.12 + **FastAPI 0.115** | Best-in-class Python AI integration, async-capable, type-safe |
| DB | **PostgreSQL 16** + Alembic + SQLAlchemy 2.0 (sync) | Single source of truth; sync is simpler — AI calls dominate latency anyway |
| AI | **Azure OpenAI `gpt-chat-latest`** (Preview, retires 5 Aug 2026) | Vision + Bangla + JSON + tools all pass our probe. Provider-abstracted so Claude / Gemini fallback is one env var. |
| Frontend | **Next.js 16.2.6** (App Router, Turbopack default) | Single PWA serves patient + doctor + chamber flows. React 19. |
| Styling | **Tailwind 4** (`@theme inline` in CSS, no config file) | Modern, minimal |
| Fonts | Noto Sans Bengali via `next/font/google` | Bangla-first UI |
| QR | `qrcode.react` (generate) + `html5-qrcode` (scan) | Camera-based chamber flow |
| Auth | Phone OTP (mock `123456` in dev) → JWT HS256 | OTP storage via `sha256(salt:code)` — see [D-009](docs/decisions.md) |
| Hosting | Docker compose locally · Hetzner/DO single VPS + Caddy in Phase F | Boring, cheap, fits the demo budget |
| Dep manager | **uv** 0.11.x | 10-100× faster than pip |

---

## Quick start (5 minutes)

**Prerequisites:** Python 3.12+, Node 20+, Docker, Docker Compose, `uv`.

```bash
# 1. Clone
git clone https://github.com/kawsher-hridoy/niro.git
cd niro

# 2. Copy env template and add your Azure key
cp .env.example .env
# Edit .env — set AZURE_OPENAI_KEY=<your key>

# 3. Start Postgres
docker compose up -d postgres

# 4. Backend (terminal A)
cd niro
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -e ./backend
alembic -c alembic.ini upgrade head        # apply migrations
python -m backend.seeds.doctors            # seed 6 BMDC doctors
uvicorn backend.main:app --reload --port 8000

# 5. Frontend (terminal B)
cd niro/frontend
npm install
npm run dev

# 6. Open http://localhost:3000
```

If `http://localhost:3000/api/v1/health` returns `{"ok":true}` and the
landing page shows **নিরো** in green Bangla, you're ready.

Re-verify the AI provider any time:

```bash
cd niro && set -a && source ../.env && set +a && .venv/bin/python probe.py
# expected: 6/6 tests passed
```

---

## Detailed setup

### Prerequisites

| Tool | Min version | Why |
|---|---|---|
| Python | 3.12 | Backend runtime |
| Node | 20 LTS | Frontend |
| Docker | 24+ | Postgres |
| Docker Compose | v2 | Brings up Postgres |
| `uv` | 0.11+ | Python deps |
| Git | 2.40+ | Cloning |

### Environment variables (`.env`)

Copy `.env.example` to `.env` and fill in **at minimum**:

```bash
AZURE_OPENAI_KEY=<your-azure-key>      # see env-vars.md for how to get one
APP_SECRET=<openssl rand -hex 32>      # JWT signing key
```

Defaults that work out of the box for local dev:

```
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://ai-for-security.services.ai.azure.com/openai/v1
AZURE_OPENAI_DEPLOYMENT=gpt-chat-latest
DATABASE_URL=postgresql+psycopg://niro:niro@localhost:5432/niro
STORAGE_BACKEND=local
STORAGE_LOCAL_PATH=./.data/blobs
APP_ENV=dev
```

Full variable reference: [`docs/env-vars.md`](docs/env-vars.md).

### Start Postgres

```bash
docker compose up -d postgres
docker compose ps              # status should be "Up (healthy)"
```

Postgres listens on `localhost:5432` with user/pass/db = `niro/niro/niro`
(dev only).

### Backend

```bash
cd niro
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -e ./backend
```

Apply migrations (creates all 11 tables):

```bash
alembic -c alembic.ini upgrade head
```

Seed 6 BMDC-verified doctors (idempotent):

```bash
python -m backend.seeds.doctors
# expected: Seeded doctors. created=6, skipped=0
```

Run:

```bash
uvicorn backend.main:app --reload --port 8000
```

Test:

```bash
curl http://localhost:8000/api/v1/health
# {"ok":true,"service":"niro-backend","version":"0.1.0","time":"..."}
```

### Frontend

```bash
cd niro/frontend
npm install
npm run dev
```

Open <http://localhost:3000>.

### AI probe

Confirm the Azure deployment is alive:

```bash
cd niro
set -a && source ../.env && set +a
.venv/bin/python probe.py
```

Six tests run — Bangla generation, structured JSON, vision on prescription, vision + Bangla on lab report, function calling, latency. Expected: **6/6 passed**, total ~30-40s.

---

## How to log in

The app uses phone + OTP. In dev mode, **the OTP is always `123456`**.

### Patient login

1. Go to <http://localhost:3000/signin>
2. Enter any phone (e.g., `+8801711000099`). Click "OTP পাঠান".
3. On `/verify`, enter code `123456`. Optionally enter your name (saved as Bangla string).
4. You land on `/home`.

If the phone has never been used, a new patient account is created
automatically. If it's been used before, you're logged into the existing
account.

### Doctor login (one of 6 seeded doctors)

The seed script created these phones for the 6 doctors. Each uses OTP `123456`:

| Phone | Doctor | Specialty | Fee tier | Fee |
|---|---|---|---|---|
| `+88017000DOCTR1` | Dr. Mahmudul Hasan | Diabetes, Medicine, Hypertension | 2 | Tk 400 |
| `+88017000DOCTR2` | Dr. Bijoy Sengupta | Medicine, Fever, General | 1 | Tk 200 |
| `+88017000DOCTR3` | Dr. Farzana Rahman | Eye, Ophthalmology | 2 | Tk 400 |
| `+88017000DOCTR4` | Dr. Tariq Aziz | Cardiology, Heart | 3 | Tk 800 |
| `+88017000DOCTR5` | Dr. Sumaiya Akter | Pediatrics, Child | 2 | Tk 400 |
| `+88017000DOCTR6` | Dr. Rashed Khan | ENT (Nose, Throat, Ear) | 1 | Tk 200 |

After login as a doctor, you'll be on `/home` but most patient features
won't work for you. Navigate to:

- `/doctor-portal/inbox` — pending paid verification requests
- `/doctor-portal/chamber` — open a new chamber session (QR + 2s polling)

### Why mock OTP?

For Phase 1, real SMS (SSL Wireless / BulkSMSBD) needs a paid account
and ~3 days of integration. The mock lets us focus on the actual product.
Real SMS lands in Phase F. See [`docs/mocks.md M-1`](docs/mocks.md).

---

## How to verify each feature

After setup, walk through these one at a time to confirm everything
works.

### Feature 1 — AI document analysis

1. Log in as patient with `+8801711000001`.
2. Click **"📄 নতুন প্রেসক্রিপশন / রিপোর্ট আপলোড করুন"**.
3. Select **প্রেসক্রিপশন** as kind.
4. Upload `niro/sample_rx.png` (sample prescription included in the repo).
5. Wait 8-12 seconds. You're redirected to `/analyses/<id>`.

You should see:
- Title "প্রেসক্রিপশন — AI বিশ্লেষণ"
- A confidence badge (green if ≥85%)
- Bangla explanation paragraph
- Red-flag chips (yellow/red)
- A "ওষুধ" (medications) table with 6 entries: Metformin, Glimepiride, Losartan, Atorvastatin, Sergel, Napa
- A "ডাক্তারকে জিজ্ঞাসা করার প্রশ্ন" list (3 questions)
- A **🖨 PDF** button (top right) — clicking calls `window.print()` for PDF export

### Feature 2 — History-aware analysis

1. From `/home`, click **📄 আপলোড করুন** again.
2. Select **ল্যাব রিপোর্ট**.
3. Upload `niro/sample_lab.png`.
4. Wait ~24 seconds.

The Bangla explanation now references the prior prescription (you'll see
phrases like "পূর্বের প্রেসক্রিপশনে" / "previously prescribed"). This
proves history-aware mode works.

### Feature 3 — Patient timeline

1. From `/home`, click **টাইমলাইন** in nav.
2. You should see chronological entries: latest analysis → analysis → prescription upload → lab report upload.

### Feature 4 — Doctor directory

1. Click **ডাক্তার ডিরেক্টরি** from home.
2. Use the **specialty** dropdown — pick "ডায়াবেটিস". You should see Dr. Mahmudul Hasan only.
3. Change to "সব" — you should see 6 doctors.

### Feature 5 — Async paid verification

1. From the directory, click **বিস্তারিত →** on any doctor.
2. Scroll down to **"আপনার ডকুমেন্ট যাচাই করতে অনুরোধ করুন"**.
3. Click the **৳XXX — অনুরোধ** button next to one of your documents.
4. You're redirected to `/verifications/<id>` with status **পেমেন্ট pending**.
5. Click **"bKash দিয়ে পরিশোধ করুন (mock)"**. Wait 2 seconds.
6. Status changes to **"ডাক্তারের পর্যালোচনা চলছে"**. Auto-polls every 5s.
7. **In a separate browser window or incognito tab**, log in as the doctor (e.g., `+88017000DOCTR1`).
8. Go to `/doctor-portal/inbox`. You should see your verification request.
9. Click **পর্যালোচনা করুন →**. The case page loads (5-9s for AI case-summary generation).
10. You'll see:
    - **AI কেস সামারি** (Bangla patient summary)
    - Current medications list
    - AI concerns
    - Suggested questions
    - **টার্গেট বিশ্লেষণ** (target analysis explanation)
    - **হিস্ট্রি** if other analyses exist
11. Select **"AI-এর বিশ্লেষণের সাথে একমত"**.
12. Type some notes (Bangla).
13. Click **"পর্যালোচনা জমা দিন"** → "পর্যালোচনা সফলভাবে জমা দেওয়া হয়েছে।"
14. **Back in the patient tab** (the polling page), within ~5s the status updates to **সম্পন্ন** with "✓ AI-এর সাথে একমত".

### Feature 6 — Access log

1. As patient, navigate to **অ্যাক্সেস লগ** from home.
2. You should see "Dr. Mahmudul Hasan viewed case_summary at HH:MM".

### Feature 7 — Chamber QR flow

This is Niro's killer feature. **Do this with two windows side by side**.

**Setup (doctor window):**
1. Open a new browser window (or use a different browser).
2. Log in as a doctor (e.g., `+88017000DOCTR1`).
3. Navigate to `/doctor-portal/chamber`.
4. Enter a chamber address (e.g., "Popular Diagnostic, Dhanmondi").
5. Click **QR তৈরি করুন**. A QR code appears.

**Scan (patient window):**
6. In the patient window, navigate to `/chamber/scan`.
7. Allow camera permission.
8. Point the camera at the QR shown in the doctor window.
   - Or copy the `niro://chamber/...` payload printed below the QR and paste it into the manual-entry field (useful when testing on a single screen).
9. You're redirected to `/chamber/<token>` — the consent dialog.
10. Pick scope: **পুরো হিস্ট্রি** (full history).
11. Slide duration to e.g. 2 hours.
12. Click **অনুমোদন করুন**. Success card appears.

**Doctor sees the profile (doctor window):**
13. Within 2 seconds, the doctor's chamber page auto-updates.
14. Doctor sees: patient name, latest AI analysis, full timeline.

**Doctor writes back:**
15. In the doctor window, scroll to "নতুন প্রেসক্রিপশন যোগ করুন".
16. Select `niro/sample_rx.png` again.
17. Click **যোগ করুন**.
18. The timeline at the top updates immediately.

**Patient confirms:**
19. In the patient window, navigate to `/timeline` (or `/home` and scroll).
20. The newly-written prescription is there.

**Close session:**
21. Doctor clicks **সেশন শেষ করুন**.
22. Consent is revoked. Doctor can no longer load the profile.

### Feature 8 — Audit log inspection

```bash
docker compose exec -T postgres psql -U niro -d niro \
  -c "SELECT event, count(*) FROM audit_log GROUP BY event ORDER BY count(*) DESC;"
```

You should see 12-15+ distinct event types. Each row in this log
corresponds to a real action a user took. Niro's privacy story is built
on this being complete.

---

## Full 14-step smoke test

If you want one copy-pasteable script that exercises everything via
curl, see [`docs/dev-setup.md §8`](docs/dev-setup.md). It runs the full
patient + doctor + chamber flow in ~3 minutes.

---

## What each page does

### Patient pages

| Path | What it does |
|---|---|
| `/` | Public landing — three feature cards, Get Started CTA |
| `/signin` | Phone input, sends OTP request |
| `/verify` | OTP entry, optional name on signup, saves session |
| `/home` | Patient dashboard with upload CTA, document list, nav chips |
| `/upload` | Pick file + kind, upload, auto-analyze. `?document=<id>` re-analyzes existing doc |
| `/analyses/[id]` | Bangla explanation, red flags, medications table, lab values table, doctor questions. **🖨 PDF** button calls `window.print()`. |
| `/timeline` | Chronological list of all events (uploads, analyses, doctor reviews) |
| `/doctors` | Doctor directory with specialty / fee tier / name filters |
| `/doctors/[id]` | Doctor profile + qualifications + chambers + reviews + "request verification" panel |
| `/verifications` | Patient's verification requests with status chips |
| `/verifications/[id]` | One verification: mock-pay button + auto-poll for doctor's review |
| `/access-log` | Every doctor view of patient data — Bangla, with revoke link (Phase F) |
| `/chamber/scan` | Camera-based QR scanner (html5-qrcode) + manual paste fallback |
| `/chamber/[token]` | Patient consent dialog: scope picker + duration slider |

### Doctor pages

| Path | What it does |
|---|---|
| `/doctor-portal/inbox` | List of paid verification requests, split into Pending / Done |
| `/doctor-portal/cases/[id]` | AI case-summary card + target analysis + history + review form |
| `/doctor-portal/chamber` | 4-phase state machine: init (set address) → waiting (QR + 2s poll) → bound (patient profile + add prescription) → closed |

---

## What each backend module does

### `niro/backend/main.py`
FastAPI app entrypoint. Mounts all 9 routers under `/api/v1`, configures CORS, structlog, lifespan. Hosts `/api/v1/health`.

### `niro/backend/config.py`
pydantic-settings reading `.env`. **The only place env vars are read.** Don't `os.environ.get` elsewhere.

### Routers (`niro/backend/api/routers/`)

| File | Responsibility |
|---|---|
| `auth.py` | OTP request/verify, JWT issuance, refresh, logout |
| `documents.py` | Upload (multipart, 10MB cap, sha256), list, get, delete |
| `analyses.py` | AI analyze with optional history; list patient's analyses; get one |
| `profile.py` | Patient `/me`, timeline (merges docs + analyses + reviews chronologically), access log, DPA-2023 delete |
| `consent.py` | Grant / revoke explicit consents |
| `verifications.py` | Patient creates a paid review request; mock-pay (2s); list; get |
| `doctor.py` | Doctor inbox, case view (consent-gated, AI summary on demand), submit review |
| `doctors.py` | Public directory search; full profile; submit a patient review (verified-consult only) |
| `chamber.py` | Open session (QR), scan (consent + bind), poll, get-profile (consent-gated + access log + audit), write prescription, close |

### Services (`niro/backend/services/`)

| File | Responsibility |
|---|---|
| `auth.py` | JWT make/decode, `current_user` / `require_patient` / `require_doctor` dependencies |
| `audit.py` | Append-only audit writer. **Every** mutating route calls this. |
| `consent.py` | `ConsentGuard` — every doctor-side patient-data read goes through `find_active_consent` + `record_access` |
| `storage.py` | Local blob writer with sha256. Layout: `<patient_id>/<doc_id>.<ext>` |

### AI layer (`niro/backend/ai/`)

| File | Responsibility |
|---|---|
| `provider.py` | `AIProvider` ABC + factory `get_provider()`. The only path AI calls take. |
| `azure.py` | `AzureOpenAIProvider` concrete implementation. Vision via base64 `data:` URIs. |
| `prompts.py` | Versioned Bangla system prompts: `rx-bn-v1.0`, `lab-bn-v1.0`, `hist-bn-v1.0`, `case-bn-v1.0` |
| `policy.py` | Post-call banned-phrase linter. Raises `AIPolicyViolation` on imperative dosing language. |

### DB (`niro/backend/db/`)

| File | Responsibility |
|---|---|
| `base.py` | `DeclarativeBase` |
| `session.py` | sync engine + `SessionLocal` + `get_db` FastAPI dep |
| `models.py` | All 11 SQLAlchemy models (User, OtpCode, PatientProfile, DoctorProfile, Document, Analysis, Consent, AccessLog, AuditLog, VerificationRequest, VerificationReview, DoctorReview, ChamberSession) |
| `migrations/` | Alembic; 3 revisions (Phase A init, Phase B AI/consent, Phase C verification/chamber) |

### Seeds

| File | Responsibility |
|---|---|
| `seeds/doctors.py` | Idempotently seeds 6 BMDC-verified doctors |

### Frontend libs (`niro/frontend/src/lib/`)

| File | Responsibility |
|---|---|
| `api.ts` | Typed fetch wrapper (`apiGet`, `apiPost`, `apiUpload`), session helpers (localStorage), all response type definitions |
| `i18n.ts` | `toBangla(n)` for Bangla numerals; `timeAgoBn(iso)` for relative time |

### Frontend components

| Component | Responsibility |
|---|---|
| `DisclaimerBanner.tsx` | Always-visible amber banner "এটি চিকিৎসা পরামর্শ নয়।" — the visible promise that AI never gives final medical advice |

---

## Architecture

```
┌──────────────────────────────────────┐
│      Browser / PWA                   │
│   Next.js 16 App Router              │
│   ┌──────────┬─────────┬─────────┐  │
│   │ Patient  │ Doctor  │ Chamber │  │
│   └──────────┴─────────┴─────────┘  │
└──────────────┬───────────────────────┘
               │  HTTPS + JWT Bearer
               ▼
┌────────────────────────────────────────────┐
│           FastAPI backend                   │
│  ┌─────────────────────────────────────┐   │
│  │ Routers (9):                         │   │
│  │   auth, documents, analyses,         │   │
│  │   profile, consent, verifications,   │   │
│  │   doctor, doctors, chamber           │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ Services:                            │   │
│  │   AIProvider (Azure)                 │   │
│  │   AuditWriter                        │   │
│  │   ConsentGuard                       │   │
│  │   Storage                            │   │
│  │   Auth (JWT)                         │   │
│  └─────────────────────────────────────┘   │
└────────┬───────────┬───────────────┬───────┘
         │           │               │
         ▼           ▼               ▼
   ┌──────────┐ ┌──────────┐  ┌──────────────┐
   │PostgreSQL│ │Blob store│  │Azure OpenAI  │
   │  11 tabl.│ │.data/    │  │gpt-chat-     │
   │          │ │blobs/    │  │  latest      │
   └──────────┘ └──────────┘  └──────────────┘
```

**Why this shape:**

- One process per concern, no microservices. 23-day deadline.
- One PWA with three route groups, not three separate apps.
- AI is the only external network hop. Everything else is local.

Full system design with rationale: [`DESIGN.md`](DESIGN.md).

---

## Project structure

```
.
├── README.md                         # this file
├── PROJECT.md                        # product spec (canonical)
├── DESIGN.md                         # system design dossier (canonical, 940 lines)
├── DESIGN_PROMPT.md                  # brief that produced DESIGN.md
├── CLAUDE.md                         # engineering memory for Claude Code
├── AGENTS.md                         # generic-agent guidance for Codex/Cursor/etc
├── docker-compose.yml                # Postgres
├── .env.example                      # env template
├── .env                              # gitignored, holds Azure key
├── docs/                             # 29+ engineering docs
│   ├── README.md, dev-setup.md, env-vars.md
│   ├── decisions.md, open-questions.md, mocks.md
│   ├── build-log.md, glossary.md
│   ├── architecture/, ai-safety/, frontend/, deployment/, demo/
│   └── adr/
├── .claude/skills/niro/SKILL.md      # Niro project skill
└── niro/
    ├── alembic.ini, probe.py         # AI capability probe
    ├── sample_rx.png, sample_lab.png # demo fixtures
    ├── backend/                      # FastAPI
    │   ├── main.py, config.py
    │   ├── db/                       # models, sessions, migrations
    │   ├── ai/                       # provider, azure, prompts, policy
    │   ├── services/                 # auth, audit, consent, storage
    │   ├── api/routers/              # 9 routers
    │   └── seeds/                    # 6 seeded doctors
    └── frontend/                     # Next.js 16
        └── src/
            ├── app/                  # 14 pages
            ├── components/           # DisclaimerBanner
            └── lib/                  # api.ts, i18n.ts
```

---

## Phase status

| Phase | What | Status | PR |
|---|---|---|---|
| A | Foundation: docker-compose, FastAPI scaffold, Next.js scaffold, docs | ✅ Merged | [#1](https://github.com/kawsher-hridoy/niro/pull/1) |
| B | AI integration + upload path + audit + consent | ✅ Merged | [#2](https://github.com/kawsher-hridoy/niro/pull/2) |
| C | Profile, timeline, paid verification, doctor portal | ✅ Merged | [#3](https://github.com/kawsher-hridoy/niro/pull/3) |
| D | Chamber QR, browser PDF, polish | ✅ Merged | [#4](https://github.com/kawsher-hridoy/niro/pull/4) |
| Docs | Refresh all docs to match shipped reality | ✅ Merged | [#5](https://github.com/kawsher-hridoy/niro/pull/5) |
| **E** | **Record + submit Phase-1 video** | ⏳ **Next** | by 27 May |
| F | Live-demo polish + VPS deploy | Pending | post 30 May shortlist |
| G | Live demo at ICADHI 2026 | Pending | 15 June |

---

## Decisions & open questions

10 locked decisions guide the code — names, tech choices, safety rules.
See:

- [`docs/decisions.md`](docs/decisions.md) — D-001..D-010 with rationale + alternatives
- [`docs/open-questions.md`](docs/open-questions.md) — still-TBD items
- [`docs/mocks.md`](docs/mocks.md) — what's faked in Phase 1 (OTP, bKash, BMDC) and the replacement plan for each

Highlights:

- **D-004:** Azure OpenAI `gpt-chat-latest` is our AI. Probed; 6/6 passes.
- **D-008:** Sync SQLAlchemy 2.0 (not async).
- **D-009:** OTP storage via `sha256(salt:code)` (passlib + bcrypt 5.x incompat).
- **D-010:** PDF "export" via browser `window.print()` (no WeasyPrint deps).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `psycopg2.OperationalError: could not connect` | Postgres not up | `docker compose up -d postgres` |
| `openai.AuthenticationError: 401` | Wrong key (often trailing whitespace) | Check `.env` `AZURE_OPENAI_KEY` last 4 chars exactly match Azure portal. See [`docs/build-log.md`](docs/build-log.md) Day 2 for the diagnostic curl. |
| Empty AI response | Content filter or bad model deployment | Re-run `probe.py`; if it fails, switch `AI_PROVIDER=claude` or `gemini` in `.env` |
| Bangla shows as boxes ▢ | Noto Sans Bengali didn't load | Hard-refresh; check `niro/frontend/src/app/layout.tsx` |
| `bcrypt … 72 bytes` from passlib | passlib + bcrypt 5.x init failure | We use sha256+salt (D-009). If reintroduced bcrypt: `pip install 'bcrypt<4'` |
| Next 16 page errors on `params.id` | Next 16 made `params` a Promise | Use `use(params)` in client components; `await props.params` in server |
| `port 5432 already in use` | Local Postgres on host | `sudo systemctl stop postgresql` |
| `port 3000 already in use` | Old `next dev` still running | `pkill -f "next dev"` |
| Chamber QR scanner silently fails | Camera permission or non-localhost | Use `http://localhost:3000` (not `127.0.0.1`); allow camera; use manual paste fallback |
| `pgvector/pgvector:pg16` pull hangs / fails | Docker Hub IPv6 unreachable | We use cached `postgres:16.3-alpine3.20` (D-007); pgvector deferred to Phase F |

For anything else, append to [`docs/build-log.md`](docs/build-log.md) with the error and what you tried.

---

## Documentation index

The full doc set:

**Top-level**
- [`PROJECT.md`](PROJECT.md) — product spec
- [`DESIGN.md`](DESIGN.md) — full system design dossier
- [`DESIGN_PROMPT.md`](DESIGN_PROMPT.md) — design brief
- [`CLAUDE.md`](CLAUDE.md) — engineering memory (auto-loaded by Claude Code)
- [`AGENTS.md`](AGENTS.md) — guidance for AI agents (Codex/Cursor/etc)

**`docs/`**
- [`docs/README.md`](docs/README.md) — navigation hub
- [`docs/dev-setup.md`](docs/dev-setup.md) — onboarding + Phase A and Phase B-D smoke tests
- [`docs/env-vars.md`](docs/env-vars.md) — every env var documented
- [`docs/decisions.md`](docs/decisions.md) — D-001..D-010
- [`docs/open-questions.md`](docs/open-questions.md) — still-TBD items
- [`docs/mocks.md`](docs/mocks.md) — Phase-1 mocks
- [`docs/build-log.md`](docs/build-log.md) — daily progress diary (Days 0-4)
- [`docs/glossary.md`](docs/glossary.md) — Bangla terms, medical abbreviations
- [`docs/architecture/`](docs/architecture/) — overview, data-model, api-surface, storage
- [`docs/ai-safety/`](docs/ai-safety/) — contract, security-compliance, audit-logging
- [`docs/frontend/`](docs/frontend/) — overview, bangla-typography, components
- [`docs/deployment/`](docs/deployment/) — topology, docker-compose, caddy, backups (Phase F)
- [`docs/demo/`](docs/demo/) — video-script, live-script, risk-register, pitch
- [`docs/adr/`](docs/adr/) — Architecture Decision Records

---

## For AI agents (Claude / Codex)

- **Claude Code**: [`CLAUDE.md`](CLAUDE.md) auto-loads. Then [`.claude/skills/niro/SKILL.md`](.claude/skills/niro/SKILL.md) triggers on Niro work.
- **Codex / Cursor / Continue**: start at [`AGENTS.md`](AGENTS.md).

Hard rules every agent must respect:
1. AI never gives final medical advice. Use the existing patterns.
2. Bangla is the default UI language. Use `lib/i18n.ts toBangla()`.
3. Doctor-side patient-data reads require `ConsentGuard`. No direct queries.
4. Every AI call must be audit-logged via `services.audit.record()`.
5. No PHI in logs. IDs + hashes only.
6. No secrets in code or commits.

---

## License

Proprietary. © 2026 kawsher-hridoy. All rights reserved.

For collaboration inquiries, file an issue or contact via the IEEE DIU Student Branch (see PROJECT.md).

---

*README v1.0 — 23 May 2026. Maintained alongside the code; if something here is wrong, fix it in a PR.*
