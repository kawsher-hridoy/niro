# Project Specification — IEEE ICADHI 2026 Project Showcase

> Patient-owned medical record + AI document analysis + on-demand doctor verification,
> built for the realities of Bangladeshi healthcare (online **and** offline chambers).

---

## 0. Name — **Niro** (locked)

Short, Bangla-rooted (from *Nirog* / নীরোগ — "disease-free"), 2 syllables,
brandable, pronounces cleanly in both Bangla and English. No existing BD
health-brand collision.

Suggested tagline: *"আপনার স্বাস্থ্য, আপন হাতে।"* (Your health, in your own hands.)

---

## 1. The One-Line Pitch

> **Bangladesh's first patient-owned medical record. AI explains every prescription
> and report in Bangla, and gives you — or any doctor — your full medical picture
> in 30 seconds.**

That second sentence is the line for the ICADHI pitch.

---

## 2. The Problem (why this exists)

Every Bangladeshi has lived these pain points:

1. **Illegible prescriptions.** Handwritten chits, English jargon, Latin abbreviations.
   Patients literally cannot read what they were told to take.
2. **Incomprehensible lab reports.** Numbers and reference ranges with no explanation.
   Patients Google → panic → either over-treat or ignore.
3. **No second opinion.** A real second opinion costs **Tk 800–2000** + travel + half a
   day. So most people just trust the first doctor or take advice from a relative.
4. **No portable history.** Patients carry plastic bags of crumpled old reports to
   every visit. Half get lost. The doctor has to start from zero each time.
5. **Doctor discovery is broken.** Word of mouth, Facebook ads, or roadside boards.
   No reliable way to find a specialist who is actually good.
6. **Doctors waste consultation time on history-taking.** 10 of 15 minutes spent
   asking "what medicines are you on?" instead of actually treating.

ShasthyaSathi solves all six with one connected product.

---

## 3. Target Users

| User | Who they are | What they get |
|---|---|---|
| **Primary patient** | Bangladeshi adult, smartphone owner, visits multiple doctors | Document analysis, lifelong profile, affordable second opinion |
| **Caregiver** | Adult child managing elderly parent's health | Manages parent's profile, receives reminders, coordinates doctors |
| **Verified doctor (online)** | BMDC-registered, wants extra income from async reviews | Paid review queue, AI-prepared case summaries → 5-min reviews |
| **Verified doctor (offline chamber)** | BMDC-registered, runs a chamber | Free access to patient profile during visit → 5 min saved per patient |
| **Rural health worker** | Community health worker, basic Android | Can analyze docs on behalf of illiterate patients |

---

## 4. Core Features

### Feature 1 — AI Document Analyzer
- Patient uploads photo / PDF of prescription, lab report, discharge summary.
- AI (multimodal LLM) extracts structured data: medications + dosage + duration,
  lab values + reference ranges, diagnoses, follow-up instructions.
- Returns plain-Bangla explanation, red-flag highlights, and follow-up questions
  the patient should ask the doctor.
- Cross-checks against the **DGDA drug formulary** for interactions, allergies,
  and dose ranges.
- Every claim cites a source (drug formulary entry, WHO STG, lab reference).
- Confidence score per item; if confidence drops below threshold, auto-suggests
  human verification.

### Feature 2 — Patient Medical Profile (Longitudinal Record)
- Every analyzed document is saved to the patient's profile, timestamped, tagged.
- Timeline view: prescriptions, reports, AI overviews, doctor reviews, all
  chronologically.
- AI uses the **full history** when analyzing new documents:
  *"You were on Metformin since January. This new prescription adds Glipizide —
  here's what the combination does."*
- Patient owns the data. Export as PDF anytime. Delete anytime (DPA 2023 right).

### Feature 3 — On-Demand Doctor Verification (Paid Review)
- Patient requests a real doctor to verify the AI's read + the original document.
- **Tiered pricing by experience:**

  | Tier | Doctor | Indicative price |
  |---|---|---|
  | Tier 1 | MBBS, junior | Tk 200 |
  | Tier 2 | MBBS + specialty (FCPS/MD) | Tk 400 |
  | Tier 3 | Senior consultant | Tk 800 |

- The AI prepares a **one-page case summary** for the doctor: chief complaint,
  current medications, AI-flagged concerns, specific questions for review.
- Doctor reviews in 5 minutes instead of 30. That is **why** the consult can be
  cheap — this is the actual innovation.
- SLA: response within 2 hours (Tier 1) / 24 hours (Tier 3).

### Feature 4 — Profile Sharing (Online + Offline Chamber)

#### Online flow (async)
- When patient requests verification, doctor receives access to:
  - The specific document + AI overview
  - (Optional, patient-controlled) full medical history, time-bound

#### Offline chamber flow — *the differentiator*
- Patient walks into any verified doctor's chamber.
- Doctor's tablet shows a QR code → patient scans in the app.
- Patient picks: *"Share full history, expires when I leave chamber."*
- Doctor's screen loads: **AI summary on top, full timeline below, tap any item
  to see the original image.**
- Doctor writes new prescription → auto-saves to patient's profile.
- Session auto-revokes after 2 hours or when patient leaves the GPS radius.

#### Fallback for non-platform doctors
- Patient can **export the AI summary as a one-page PDF** and hand it to any
  doctor (online or offline). This is also the platform's growth vector: paper
  hits the doctor's desk → doctor sees the value → doctor joins.

### Feature 5 — Verified Doctor Directory + Reviews
- Search by specialty (eye, diabetes, cardiology, etc.), area, language, fee.
- Doctor profile shows: BMDC number (verified), qualifications, chambers, fee,
  reviews from real patients.
- **Only reviews from verified consults are accepted** — either a paid async
  review through the app, or a chamber visit where profile was shared.
- Anti-fraud: review weighted by recency, hidden under N reviews, doctor can
  reply to reviews publicly.

### Feature 6 — Granular Consent + Audit Log
- Patient consent UI when sharing:
  ```
  [ ] Just this document
  [ ] This + last 3 months
  [ ] Full history
  Access expires in: [24h ▼]
  [ ] Notify me every time the doctor opens my profile
  ```
- **Access log** visible to patient: *"Dr. Karim viewed your profile 3 times on
  14 June, last at 2:34 PM at [chamber address]."*
- One-tap revoke. Auto-expire by default.
- Every doctor view is watermarked on-screen (doctor name + timestamp) and logged.

---

## 5. Why People Will Use It (Real Benefits)

| User want | Today | With ShasthyaSathi |
|---|---|---|
| Understand prescription | Ask relative, hope they're right | Bangla explanation in 10 seconds |
| Understand lab report | Google + anxiety | Plain Bangla + red flags + questions for doctor |
| Cheap second opinion | Travel + Tk 1500 | Tk 200 async review, same day |
| Never lose a report | Plastic bag, lost half | Lifetime profile, searchable |
| Find a specialist | Facebook ads | Verified doctors, real reviews |
| Doctor knows my history | Repeat it 50 times | Doctor sees it in 30 seconds |
| Privacy | Hand papers around | Granular consent + audit log + auto-expire |

The pain-to-price ratio is excellent. People will pay Tk 50/month for this.

---

## 6. Differentiation — Bangladesh Landscape

| Player | What they do | What they don't |
|---|---|---|
| **Praava Health** | Telemedicine + clinics + own EMR | Only inside Praava's network, no AI document analysis |
| **Daktarbhai** | Doctor consult + directory | No AI, no document parsing, unreliable reviews |
| **Tonic (Grameenphone)** | Phone telemedicine | No documents, no profile, no offline angle |
| **Arogga / MedEasy** | Prescription upload → pharmacy delivery | Just for ordering, no explanation, no second opinion |
| **Maya** | Bangla health chatbot (women's health) | Mostly inactive, no doctor verification |

**Nobody combines:** AI document analysis + portable patient-owned profile +
human verification + offline chamber integration + verified reviews. The white
space is real.

The deepest moat is the **patient profile**: once the patient has 2 years of
history in your app, they will not switch. That's the lock-in.

---

## 7. Business Model

- **Patient subscription:** Tk 50/month (or Tk 500/year). Unlimited AI analysis,
  unlimited profile storage, unlimited offline shares, N free async reviews.
- **Doctor onboarding (read access at chamber):** Free. Massive incentive — saves
  doctors 5 min per patient. This is how you fill the directory fast.
- **Doctor write access (add prescription to profile):** Free for verified BMDC
  doctors. Encourages continuous data capture.
- **Async verification:** Tk 200 / 400 / 800 per review. Platform takes ~30%.
- **Pharmacy partnership (future):** affiliate commission when patient orders
  meds from a partner pharmacy (Arogga, MedEasy) directly from the prescription.
- **Insurance partnership (future):** insurers pay for premium subscriptions for
  policyholders.

Playbook is WhatsApp's: be indispensable utility first, monetize at the edges.

---

## 8. Privacy, Ethics, Regulatory

### Privacy
- Encryption at rest (per-patient key).
- TLS everywhere.
- Patient owns and can delete all data (DPA 2023 compliance).
- Granular, time-bound consent for every share.
- Audit log of every access, visible to patient.

### Doctor verification
- BMDC registration number required at onboarding.
- Cross-checked against BMDC public registry.
- Account bound to a single device with biometric login (no shared compounder
  access).

### AI safety
- AI **never gives final medication advice** — it only *explains* what was
  prescribed and *flags concerns*.
- Confidence score on every claim.
- Auto-suggest human verification when confidence is low.
- Every AI decision logged: model version + prompt + output + timestamp.
- Bold disclaimer on every screen: *"This is not a substitute for medical advice.
  Confirm with a doctor."*

### Liability
- Doctor reviews are the doctor's professional opinion, not the platform's.
- Audit log protects everyone: doctor can prove what they saw; patient can prove
  what they shared.
- For real launch (post-ICADHI): consult a lawyer on BMDC telemedicine rules,
  consider professional indemnity insurance for reviewing doctors.

---

## 9. ICADHI 2026 — Submission Plan

### Track choice
**Track 1 — AI-Driven Telemedicine & Remote Healthcare.**

Cross-claim into Track 7 (Ethical AI, Privacy & Trustworthy Health Systems) for
the consent + audit angle, but submit under Track 1 for clearest fit.

### Phase 1 — Video Submission (by 27 May 2026)

**Goal:** a 3–5 minute video that demonstrates the product working end-to-end.
Need not be production-grade — just real enough to convince judges this can ship.

**Demo scope to build:**
1. Real AI document analysis (Claude / Gemini multimodal API). Works on 2–3 real
   prescription/report photos.
2. Patient profile page with 3 seeded past entries.
3. AI uses history context: *"You are already on X — this new drug interacts."*
4. "Request Verification" button → opens a fake doctor profile → 30-second
   simulated response (canned, scripted for the video).
5. Doctor view: shows AI case summary + history timeline.
6. Consent dialog UI (functional, with time-bound access).
7. Access log screen.
8. Doctor directory: a static page with 6 seeded doctors.
9. PDF export of AI summary (for the offline fallback story).

**Must show in the video:**
- The chamber QR flow (can be filmed with a friend playing the doctor)
- Bangla output (this is the inclusion story)
- The patient profile timeline
- The consent UI
- The audit log

### Phase 2 — Final Demo (15 June 2026, if shortlisted)

- All Phase 1 features working live for judges.
- One real friend/family MBBS doctor on standby to respond to a live async review
  request during the demo.
- BMDC verification live (lookup against public registry).
- Live chamber QR demo with one of the team members playing the doctor.

### How the project hits each ICADHI evaluation criterion

| Criterion | How ShasthyaSathi scores |
|---|---|
| **Technical Quality** | Real LLM integration, multimodal vision, RAG over drug formulary, structured output, audit log architecture |
| **Originality** | Patient-owned portable EMR for BD doesn't exist; AI-prepared case summary for cheap human review is novel; online+offline hybrid is unique |
| **Functionality** | Full end-to-end flow demoable in 90 seconds; not a slideware concept |
| **Impact** | Solves 6 stacked daily pain points for ~170M people; works in offline chambers (where 90% of BD care happens) |
| **Scalability** | Patient profile creates lock-in; doctor network effect; free doctor onboarding fills the directory fast; pharmacy + insurance partnerships are obvious future revenue |
| **Ethics** | Confidence scoring, audit log, granular consent, BMDC verification, DPA 2023 compliance, hard limits on what AI says (never final medical advice) |

---

## 10. Tech Stack (proposed)

| Layer | Choice | Why |
|---|---|---|
| **Mobile** | Flutter | Single codebase, Android-first (BD reality), good camera support |
| **Web (doctor portal)** | Next.js + Tailwind | Fast to build, good for the chamber tablet flow |
| **Backend** | Node.js (NestJS) or Python (FastAPI) | Whichever the team knows better |
| **DB** | PostgreSQL + S3-compatible storage for images | Standard, encryption-friendly |
| **AI** | **Azure OpenAI — `gpt-chat-latest`** (probed and locked) | Vision + Bangla + JSON + tools all pass; 1.5s latency; retires 5 Aug 2026 (after final demo). Provider wrapped behind abstraction so swap to Claude/Gemini is one env var. |
| **RAG** | pgvector + embeddings for DGDA formulary + clinical guidelines | Cheap, self-hosted, no separate vector DB |
| **Auth** | Firebase Auth or Supabase Auth | Fast to ship, biometric supported |
| **Payments** | bKash + Nagad APIs | Required for BD |
| **Hosting** | A single VPS for the demo (DigitalOcean / Hetzner) | Cheap, sufficient for ICADHI scale |

For ICADHI demo, prioritize **end-to-end working flow over architectural purity.**
The judges grade the demo, not your microservices.

---

## 11. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| AI misreads dosage | High | Confidence score, structured output, RAG against formulary, never give final advice |
| Privacy breach | High | Encryption at rest, per-patient keys, audit log, time-bound consent |
| BMDC / regulatory pushback | Medium | All reviewers are BMDC-verified, AI never replaces a doctor, audit log for every decision |
| Doctor account abuse (compounder logs in) | Medium | Device binding + biometric, watermark every view |
| Review fraud | Medium | Verified-consult-only reviews, weight by recency, hide under N reviews |
| Empty marketplace at launch | Medium (post-ICADHI) | Free doctor onboarding, PDF fallback grows organically |
| Low digital literacy | Medium | Voice-first onboarding, Bangla default, caregiver mode |

---

## 12. Decisions Already Made (so we don't relitigate)

> **Status as of 23 May 2026:** Phases A–D merged. Phase 1 build feature-complete.
> See [`docs/decisions.md`](docs/decisions.md) for the live D-001..D-010 table with
> rationale + alternatives per decision.

- **Name:** Niro. ✅
- **Track:** Track 1 — AI-Driven Telemedicine & Remote Healthcare. ✅
- **Phase-1 demo scope:** Phase A–D shipped. **Code-freeze after 27 May submission.**
- **Language:** Bangla-first, English toggle deferred to Phase F.
- **Hybrid online + offline chamber** is core, not optional. ✅ Built in Phase D.
- **AI never gives final medical advice** — only explains and flags. Enforced by `backend/ai/policy.py` post-call linter.
- **Reviews are verified-consult-only.** Enforced by `backend/api/routers/doctors.py`.
- **AI provider:** Azure OpenAI `gpt-chat-latest`, wrapped behind `AIProvider`
  abstraction so a swap to Claude/Gemini is one env var.
- **Tech stack locked (D-003):** FastAPI + Next.js 16 + Postgres + Tailwind 4 + React 19.
- **Sync SQLAlchemy 2.0 (D-008)** — not async.
- **OTP storage via `sha256(salt:code)` (D-009)** — not bcrypt.
- **PDF "export" via browser print (D-010)** — not WeasyPrint.
- **Phase A used `postgres:16.3-alpine3.20` (D-007)** — pgvector deferred to Phase F when RAG lands.

---

## 13. Open Questions

> Live status: see [`docs/open-questions.md`](docs/open-questions.md).

Resolved:
- ~~Project final name~~ → **Niro** (D-005)
- ~~Which LLM provider~~ → **Azure `gpt-chat-latest`** (D-004)
- ~~Team composition~~ → **Solo build** (kawsher-hridoy)
- ~~Doc strategy~~ → Keep DESIGN.md intact + docs/ (D-002)

Still open (post-Phase-D):
- MBBS contact for the live demo on 15 June (if shortlisted)
- Production domain name (Phase F4)
- Real BMDC API integration (Phase F2)
- Real SMS provider (Phase F)
- Production AI subscription migration off the shared account

---

## 14. Immediate Next Steps

> ✅ Phases A–D shipped on 23 May 2026. **Code-freeze in effect.**

1. ~~Register the team on ICADHI portal~~ ✅ Done.
2. ~~Build the Phase-1 demo~~ ✅ Done across PRs #1-#4.
3. **27 May — record + submit the video.** See [`docs/demo/video-script.md`](docs/demo/video-script.md) for the 90-second shot list. Submit at https://icadhi.daffodilvarsity.site/.
4. **27 May – 30 May:** Wait for selection-phase result (top 30 announced 30 May).
5. **30 May – 14 June (if shortlisted):** Phase F polish — see [`docs/build-log.md`](docs/build-log.md) for backlog and [`docs/open-questions.md`](docs/open-questions.md) for remaining decisions.
6. **15 June:** Live demo — see [`docs/demo/live-script.md`](docs/demo/live-script.md) + [`docs/demo/risk-register.md`](docs/demo/risk-register.md).

---

*Document version: 2.0 — 23 May 2026 (post Phase D merge).*
