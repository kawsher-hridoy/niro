# Niro — System Design Prompt

> Copy everything below the `--- BEGIN PROMPT ---` line and paste it into a
> fresh chat with a senior engineering AI (Claude / GPT / Gemini) or hand it
> to a senior engineer. The recipient will produce the full system design
> for Niro, end-to-end, suitable for execution.

---

## How to use this prompt

- **As an input to an AI agent:** paste the whole block. Expect ~3000 words
  of design output: architecture, data model, API surface, build plan, demo
  script. Iterate by replying with specific sections to expand.
- **As a brief to a human engineer:** print it. It's their spec.
- **As a self-check before coding:** read it top-to-bottom; if anything in
  your plan contradicts it, fix the plan, not the spec.

---

--- BEGIN PROMPT ---

# Role

You are a **senior full-stack engineer** with experience shipping
health-tech products under regulatory constraints (HIPAA/GDPR/Bangladesh
DPA 2023). You have built AI-integrated SaaS, multi-tenant marketplaces,
and consumer mobile apps. You think in terms of **shippable increments**,
not perfect architectures. You write code that is **boring, observable,
and easy to delete**.

# Mission

Design and plan the full build of **Niro** — Bangladesh's first
patient-owned medical record + AI document analyzer (Bangla) +
on-demand doctor verification platform — from **empty repository to a
working live demo for the IEEE ICADHI 2026 final on 15 June 2026**.

You are not asked to write all the code. You are asked to produce a
**design dossier and execution plan** thorough enough that a small team
of 1–3 engineers could begin coding immediately and have a working,
demoable system within 23 days.

# What you must deliver

When you respond, return the following sections in order. Each section
must be opinionated, specific, and decision-ready. No "it depends"
without naming the variable that decides it.

1. **Architecture Overview** — one paragraph + an ASCII component diagram.
   Show patient app, doctor app/portal, backend, AI provider, database,
   storage, audit service, third-party services (BMDC registry, bKash,
   SMS/IVR), and the request paths between them.
2. **Component Responsibilities** — table of each component, what it
   owns, what it explicitly does NOT own, and its scaling profile.
3. **Data Model** — entities, key fields, relationships. Call out
   PHI-bearing tables. Include the audit log schema and consent schema.
   Use SQL DDL or an entity table.
4. **API Surface** — REST endpoints grouped by domain (auth, documents,
   AI, profile, consent, verification, doctors, reviews, payments,
   audit). Method, path, request body shape, response body shape,
   auth requirements. Mark which are MVP vs later.
5. **AI Integration Contract** — the `AIProvider` interface, exact
   methods, return types, the structured-output JSON shapes for
   `analyze_prescription`, `analyze_lab_report`, `explain_in_bangla`,
   `prepare_case_summary_for_doctor`, `check_drug_interaction`. Specify
   system prompts in Bangla. Specify confidence-score calibration.
   Specify what the AI is forbidden from doing.
6. **Security & Compliance Architecture** — auth flow, session model,
   key management, encryption at rest, encryption in transit, BMDC
   verification flow, doctor device binding + biometric requirement,
   consent enforcement, audit log integrity, DPA 2023 compliance
   (deletion right, export right), incident playbook.
7. **Frontend Architecture** — Next.js App Router structure: patient
   route group, doctor route group, chamber-tablet route, shared
   components. Bangla typography setup. State management. Server
   components vs client components decision. Offline-first patterns for
   the patient app.
8. **Storage Strategy** — Postgres tables, file storage for documents
   (local dev → S3-compatible prod), pgvector for RAG embeddings.
9. **Observability** — structured logging without PHI, metrics, tracing,
   error reporting. What to log at INFO vs WARN vs ERROR.
10. **Deployment Topology** — local dev with `docker compose`, single-
    VPS production layout, secrets via env, backups, TLS, domain setup.
11. **Testing Strategy** — what to unit test, what to integration test,
    what to skip for the 23-day window. AI golden tests for prompt
    regressions.
12. **Phased Build Plan** — day-by-day from today (23 May) through
    27 May (Phase-1 video) and 30 May → 15 June (Phase-2 if shortlisted).
    For each day: scope, who does what, exit criteria, what NOT to do.
13. **Demo Script** — exact 90-second walk-through for the Phase-1
    video and the 5-minute live demo for the final. Specify every
    click, every spoken line, every artifact that must be on screen.
14. **Risk Register** — top 10 risks with likelihood, impact, owner,
    and concrete mitigation. Include the Azure model retirement risk,
    BMDC regulatory risk, AI hallucination risk, content filter risk,
    bKash integration risk, chamber-doctor identity risk, judges
    pressing the "what if AI is wrong" question, and demo-day network
    failure.
15. **Open Questions** — things the design cannot decide alone and
    needs a human call on, with your recommended answer for each.

# Context (everything you need to know)

## Product

**Niro** is a Bangla-first, patient-owned medical record. Three
connected jobs-to-be-done:

1. **AI Document Analyzer.** Patient uploads photo/PDF of prescription
   or lab report. AI extracts structured data, explains in Bangla,
   flags red values, suggests doctor questions. Confidence score on
   every claim; low-confidence outputs auto-recommend human verification.
2. **Patient Profile (longitudinal record).** Every analyzed document
   becomes a timeline entry. The AI uses the full history as context
   for new uploads (drug interactions across doctors, disease
   progression). Patient owns and can export/delete all data.
3. **On-Demand Doctor Verification + Doctor Directory + Chamber Sharing.**
   - Async paid review: patient requests a real BMDC-verified doctor
     to verify the AI's read; doctor sees an AI-prepared case summary
     + (optional) full history; pricing tiered Tk 200 / 400 / 800 by
     experience.
   - Doctor directory: search by specialty, fee, location; reviews
     only from verified consults.
   - Offline chamber sharing: in any chamber where the doctor is on
     Niro, patient scans a QR; doctor's tablet loads AI summary +
     timeline; doctor writes new prescription back into the profile;
     access auto-revokes when patient leaves chamber or after 2h.

**The differentiator** vs Daktarbhai / Praava / Tonic / Arogga:
patient-owned EMR + portable across providers + works in offline
chambers + AI prepares the case so paid human review can be cheap.

**The pitch line:** "We don't just decode one prescription — we give
every doctor the patient's full medical memory in 30 seconds."

## Target market

Bangladesh. Bangla-first UX, Bangla numerals where natural, bKash/Nagad
payments. Primary device: Android (rural Android One / Xiaomi tier).
Secondary: web. Some chamber doctors use tablets; many rural chambers
have spotty internet.

## Competitive landscape (brief)

- **Praava Health** — telemedicine + clinics + EMR but only inside
  Praava's network. No AI document analysis.
- **Daktarbhai** — consult + directory but no AI, unreliable reviews.
- **Tonic (Grameenphone)** — phone telemedicine, no documents.
- **Arogga / MedEasy** — pharmacy ordering with prescription upload,
  no explanation.
- **Maya** — Bangla health chatbot (women's health), mostly inactive.

Nobody combines AI document analysis + portable patient-owned profile
+ paid human verification + offline chamber integration + verified-
consult-only reviews. This is the white space.

## Hard constraints (non-negotiable)

1. **Timeline:**
   - Today is **23 May 2026**.
   - **27 May 2026:** Phase-1 video submission deadline.
   - **30 May 2026:** selection phase result (top 30 teams advance).
   - **5 June 2026:** final-phase registration deadline for shortlisted.
   - **15 June 2026:** live final demo.
2. **AI provider locked:** Azure OpenAI deployment `gpt-chat-latest`
   at `https://ai-for-security.services.ai.azure.com/openai/v1`,
   model retires 5 Aug 2026 (well after final demo). 500k TPM, 5k
   RPM. Capability probe at `niro/probe.py` passes 6/6 (Bangla, JSON,
   vision on prescription, vision+Bangla on lab report, function
   calling, latency 1.5s). Must wrap behind an `AIProvider`
   abstraction so a fallback to Claude or Gemini is one env var.
3. **Tech stack locked:** Python 3.12 + FastAPI backend, Next.js 15 +
   Tailwind frontend (App Router), PostgreSQL 16 + pgvector,
   docker-compose for local, single VPS (DigitalOcean/Hetzner) for
   demo prod.
4. **AI safety rules — never violate:**
   - AI must never give final medical advice. Only extracts, explains,
     flags. The phrase "you should take X mg" must never be emitted.
   - Every AI output carries a UI disclaimer: "এটি চিকিৎসা পরামর্শ নয়।
     ডাক্তারের সাথে নিশ্চিত হোন।"
   - Every AI call logged: model + version, prompt SHA256, output
     SHA256, confidence, patient_id (FK), timestamp.
   - Confidence < threshold → auto-suggest human verification.
5. **Privacy rules — never violate:**
   - No PHI in logs at INFO/WARN. Only hashes + IDs.
   - Doctor never sees patient data without explicit, time-bound
     consent. Default expiry 24h. Patient sees access log.
   - Patient can delete all their data (DPA 2023).
   - Encryption at rest in prod. Per-patient encryption key feasible
     for blobs; row-level for structured PHI.
   - Doctor accounts: BMDC-verified, device-bound, biometric required.
6. **Bangla-first:** default output language is Bangla. Use Bangla
   numerals (২৪৫) for medical values where natural. English is a
   toggle, not the default.
7. **Phase-1 scope is locked.** Do not propose features outside this
   list before 27 May:
   - Patient signup + login (phone OTP).
   - Upload prescription/report (image + PDF).
   - AI analysis in Bangla with structured output + red-flag highlights.
   - Patient profile: timeline of past entries, history-aware analysis.
   - "Request verification" flow with a seeded doctor profile (canned
     response for the video is acceptable).
   - Consent dialog UI with time-bound access.
   - Doctor portal: case-summary view + history timeline + write a review.
   - Audit log: visible to the patient.
   - Doctor directory: seeded with 6 profiles, search by specialty.
   - Chamber QR sharing: functional, even if filmed with a teammate.
   - PDF export of AI summary.

## Personas

1. **Rahima, 54, Dhaka.** Has diabetes + hypertension. Smartphone user
   with limited English. Visits 2 doctors. Needs the AI to explain
   her lab reports in Bangla and warn about drug interactions.
2. **Karim, 28, Bogura.** Caregiver for his elderly father in a
   village. Manages father's profile; requests async second opinions
   when local MBBS prescribes unfamiliar drugs.
3. **Dr. Bijoy, 35, MBBS + FCPS Medicine.** Wants extra income from
   async reviews. Wants the AI to do the boring work so he can finish
   a review in 5 minutes.
4. **Dr. Mahmud, 52, Senior Consultant.** Runs a chamber. Doesn't want
   another app. Will join Niro because it loads patient history in 30
   seconds, saving him 5 minutes per patient → 8 more patients/day.
5. **Tanvir, 22, BRAC University CS.** ICADHI team lead. Builds this.

## Functional requirements

Patient app:
- Phone OTP signup; profile with name, DOB, gender, optional
  conditions/allergies.
- Upload (camera or gallery) of prescription/report. Image or PDF.
  Multi-page PDF supported.
- AI analysis with progress indicator. Result page shows: extracted
  structured data, plain-Bangla explanation, red-flag chips, suggested
  questions for doctor, confidence indicator.
- Timeline of past entries; tap to revisit.
- History-aware analysis: when uploading a new document, the AI sees
  prior entries and explicitly cross-references them.
- "Request verification" flow: pick a doctor from a list, pick what to
  share (this document / last 3 months / full history), pick access
  duration (1h / 24h / 7d), pay via bKash (mock OK in Phase 1).
- Receive doctor's review as a new timeline entry.
- Doctor directory: search by specialty, fee range, language; view
  doctor profile with reviews; book async review or in-person.
- Submit a review for a doctor — only allowed if a verified consult
  exists.
- Access log: every doctor view of profile, with revoke button.
- Settings: language toggle, data export, data deletion, logout.

Doctor portal:
- BMDC-verified signup; device binding; biometric.
- Inbox of pending async review requests; each shows AI case summary
  + the document + (if shared) full history.
- Write review; mark which AI claims they agree/disagree with;
  submit. Audit log records what they viewed and what they wrote.
- Chamber mode: scan patient QR → load patient profile in chamber-
  tablet UI → write new prescription back to the profile.
- Public profile page with photo, qualifications, BMDC #, fees, reviews.

Chamber tablet flow (subset of doctor portal):
- Doctor logs in once; tablet binds.
- Shows a chamber QR for the patient to scan.
- On scan: patient receives push, picks share scope + duration,
  approves. Tablet auto-loads profile.
- Doctor writes prescription; saved to patient profile with doctor
  watermark and timestamp.
- Session auto-revokes on time limit, GPS departure, or explicit end.

## Non-functional requirements

- **Latency:** AI analysis end-to-end < 8s for a typical prescription
  image. Chamber profile load < 2s on 4G.
- **Availability:** 99% for the demo period (15 June). Plan for one
  redeploy window per week post-launch.
- **Privacy:** PHI encrypted at rest; TLS 1.2+ in transit; logs and
  metrics carry no PHI.
- **Accessibility:** WCAG AA targets; minimum 16px body text on
  mobile; voice playback of AI summary (Bangla TTS) as Phase-2 stretch.
- **Bangla typography:** Noto Sans Bengali via self-hosted font; ligature
  rendering tested on Android Chrome and iOS Safari.
- **Offline:** patient can view their own profile offline (last sync);
  uploads queued offline and sent on reconnect.

## Quality bar

- Code is boring. No clever abstractions. No "platform" before there's
  a product.
- No defensive checks for impossible states. Trust the schema.
- One-line comments only, and only where the WHY is non-obvious.
- Lint, typecheck, and a smoke test must pass before merge.
- Secrets via env vars, never in code or git.
- AI golden tests: a fixed set of `(image, expected_keys_in_output)`
  pairs, run in CI to detect prompt regression.

## What is explicitly out of scope (do not design these now)

- Native mobile apps (Flutter/iOS/Android). Web-first PWA for Phase 1
  and Phase 2; native is post-ICADHI.
- Insurance integration.
- Pharmacy delivery.
- Multi-language beyond Bangla + English.
- Wearable/IoT data ingestion.
- Live video telemedicine.
- AI for diagnosis. Niro never diagnoses.
- B2B hospital integrations.

# Response format

Return a single Markdown document with the 15 sections listed under
"What you must deliver", in order. Each section should be as long as it
needs to be — no shorter, no longer. Use tables, ASCII diagrams, and
fenced code blocks freely. Use SQL DDL for the data model. Use JSON
shapes for the AI contract. Use a numbered day-by-day list for the
build plan (one block per day from 23 May to 15 June).

At the end, return:

- A **TL;DR** of the 5 most important decisions you made.
- A **STOP-AND-ASK** list: anything you would refuse to design without
  a human answer first.

# Operating principles you must follow while designing

1. **Scope discipline.** If you find yourself wanting to add a feature
   not in Phase-1 scope, add it to a "v1.1 backlog" section at the end
   instead. Do not silently expand the build.
2. **Demoability.** Every Phase-1 feature must be demoable in the
   90-second video. If you cannot describe how it appears on screen,
   cut it.
3. **Reversibility.** Prefer architectures you can rip out in an
   afternoon. No vendor lock-in beyond the AI provider (which is
   already abstracted).
4. **Honesty over completeness.** Where the design cannot be decided
   without information you do not have, say so in the Open Questions
   section and propose the answer you'd default to.
5. **Bangla-first by default.** All user-facing strings in your design
   should be in Bangla with English in parentheses.
6. **Audit log is a first-class citizen, not an afterthought.** Design
   it before designing features that write to it.
7. **Consent is enforced at the data-access layer, not the UI.** No
   query for patient data ever runs without a consent check.

# Begin

Produce the design dossier now.

--- END PROMPT ---

---

## Notes on tuning the prompt

If you give this to an AI and want a different shape of output:

- **Want code instead of plans?** Append: *"After the design dossier,
  generate the actual FastAPI project scaffold, the Next.js project
  scaffold, the `AIProvider` abstract base + Azure implementation, the
  consent-enforcement decorator, and the audit-log writer. Write the
  files, do not just list them."*
- **Want it shorter (because token budget)?** Replace the 15-section
  deliverable list with: *"Produce only sections 1, 2, 3, 4, 5, 12,
  and 13. Skip the rest."*
- **Want a second opinion?** Run this prompt against two providers
  (Claude + GPT) and diff the build plans — the disagreements are
  where to focus your own thinking.

## What this prompt deliberately does NOT specify

- **Exact UI mockups.** Left to the implementing engineer because
  pixel-level mockups will only slow them down for an MVP.
- **Pricing strategy and unit economics.** These are post-ICADHI
  concerns; the demo only needs prices on screen, not validated.
- **Marketing / GTM plan.** Out of scope for a system design.
- **Long-term roadmap beyond v1.1.** Same.

If the recipient asks "what about X?" and X is on this list — that's
fine. Tell them it's intentionally deferred.
