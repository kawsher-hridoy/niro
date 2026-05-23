# Demo — Phase-2 Live Script

> **Canonical reference:** [`DESIGN.md §13`](../../DESIGN.md#13-demo-script)
> for the table. This file is the live presentation runbook + Q&A prep.

## Constraints

- **Length:** 5 minutes live demo + Q&A.
- **Format:** in-person on Congress Day (15 June 2026, Daffodil
  International University).
- **Audience:** ICADHI judging panel — likely a mix of academics,
  practitioners, and industry.

## The script

### 0:00–0:30 — Verbal pitch (no screen)

Talking points:

1. "Every Bangladeshi has lived this problem: a handwritten prescription
   you can't read, a lab report you don't understand, a doctor who
   doesn't know your history."
2. "Niro is Bangladesh's first patient-owned medical record."
3. "AI explains every prescription and report in Bangla. A real doctor
   verifies the AI for 200 to 800 taka. Your full history travels with
   you — in any chamber, at any clinic."

### 0:30–2:00 — Patient flow (live)

1. "Let me show you. This is Rahima — a real patient profile we seeded."
2. Open Rahima's profile → timeline shows 3 past entries.
3. **Ask a judge** to bring out their own prescription, or use a prepared
   real prescription.
4. Photograph it with the phone → upload as prescription.
5. AI analysis appears in <8 seconds in Bangla.
6. Highlight: medications extracted, red flags, history cross-reference.
   "Rahima was on Metformin since January; this new prescription adds
   Glimepiride — Niro flags the interaction."

### 2:00–3:00 — Async verification (live)

1. Tap "Request Verification" → consent dialog → pick Dr. Bijoy +
   "share full history, 24h".
2. (Behind the scenes: your MBBS friend gets the request on his phone in
   a side room and starts responding.)
3. Show the doctor's view on a second screen: AI case summary + full
   history.
4. The MBBS friend submits his review within ~90 seconds.
5. Switch back to patient: review appears in timeline.

### 3:00–4:00 — Chamber flow (live)

1. "Now imagine Rahima walks into a doctor's chamber."
2. Open chamber tablet view → generate QR.
3. Scan QR from the patient phone → consent dialog → approve.
4. Doctor's tablet loads Rahima's full profile with AI summary.
5. Doctor writes a new prescription on the tablet → it appears on
   Rahima's timeline.

### 4:00–4:30 — Access log + trust (live)

1. Open access log on the patient phone.
2. "Every access is recorded. Patient sees who looked at her data, when,
   from where."
3. Tap "revoke access" → consent ends immediately.

### 4:30–5:00 — Close

Talking points:
1. "Niro is the patient-owned EMR Bangladesh has talked about for a
   decade and never built."
2. "We don't replace doctors — we make every doctor 5× faster by
   handing them the case in 30 seconds."
3. "AI never gives final medical advice. It explains, flags, and gets
   out of the way. Every decision is logged and verifiable."
4. "Ready for pilot at any chamber in Dhaka. Thank you."

## Q&A — likely questions + answers

| Question | Answer |
|---|---|
| "What if the AI is wrong?" | "AI never gives final medical advice — it only extracts and flags. Confidence scores below 0.5 auto-recommend human review. Every AI claim is auditable, and a real doctor can disagree per-claim in the review screen." |
| "How do you verify doctors are real?" | "Production cross-checks BMDC registration on signup, then caches 24 hours. Doctor accounts are device-bound — a chamber's compounder can't log in as the doctor." |
| "How is patient privacy enforced?" | "Every doctor view requires explicit, time-bound consent from the patient. Default expiry is 24 hours. Patient sees every access in the access log and can revoke one-tap. PHI is encrypted at rest in production. DPA 2023 right-to-delete is one button." |
| "What about regulatory approval?" | "Niro is a health-literacy and second-opinion platform, not a diagnostic device. The AI is positioned as an interpretive aid, not as medical advice. Reviewing doctors are BMDC-licensed and give their own professional opinion." |
| "Is there a business model?" | "Patient subscription Tk 50/month for unlimited AI analysis. Tiered async review fees Tk 200/400/800. Pharmacy and insurance partnerships are obvious post-launch. Doctors get free read access at chambers — strong onboarding incentive." |
| "Who's your competition?" | "Praava, Daktarbhai, Tonic each do part of this. Nobody combines patient-owned EMR + AI analysis + offline chamber sharing + verified-consult-only reviews." |
| "What's next?" | "Pilot with one Dhaka clinic in July. Native mobile apps Q4. Pharmacy integration Q1 next year. Real BMDC API integration is in design today and ships by 31 May for the final." |
| "Can the AI handle handwriting?" | "Yes for clean handwriting; ~70-85% accuracy on average doctor chits. Below the confidence threshold, the app auto-suggests human verification." |
| "What if the doctor disagrees with the AI?" | "The review screen shows each AI claim. Doctor marks per-claim 'agree' or 'concerns'. The patient sees both views side-by-side. Doctor's word wins on medical content; AI's value is preparing the case." |

## Q&A — risky questions to deflect honestly

| Question | Honest answer |
|---|---|
| "Whose Azure account?" | "We're using a shared Azure deployment for the demo. Production moves to our own subscription before pilot." |
| "Why isn't this published in the App Store?" | "Phase-1 build deliberately ships as PWA only — one codebase across patient, doctor, and chamber tablet. Native apps are Q4." |
| "Where's your data?" | "Single-VPS deploy with encrypted Postgres + encrypted blob storage in Hetzner. We chose simplicity over cloud sprawl." |

## Dry-run schedule (Phase F8)

Daily 5-minute dry-runs from 8 June onward. Time with a stopwatch. If
you go over 5:00 three days in a row, cut the chamber flow shorter
(skip the new-prescription writeback) and rebalance.

## On the day

- [ ] Arrive 90 minutes early. Set up.
- [ ] Walk through entire demo 30 minutes before stage time.
- [ ] Pre-flight per `docs/demo/risk-register.md`.
- [ ] MBBS friend on call, 15 minutes before stage time.
- [ ] Pre-recorded video on phone as ultimate fallback.
- [ ] Don't change anything between rehearsal and demo.

## To be filled

- [ ] Phase F8: dry-run timings log
- [ ] Phase G: post-mortem after the demo
