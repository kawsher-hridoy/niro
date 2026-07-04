<!--
IUT Techathon Nationals & Rover Summit — Project Showcasing · Round 1 abstract (source)
Team: Cortex Crew · Focus: স্বাস্থ্য ট্রেন্ড (Health Trends, D-016) + auto-categorized records (D-015)

Submission artifacts (exact names required):
  - Abstract: ProjectShowcasing_Techathon_CortexCrew_FirstRound.pdf  (≤500 words, PDF only)
  - Video:    ProjectShowcasing_Techathon_CortexCrew_FirstRound.mp4  (3–5 min, Google Drive,
              "Anyone with the link can view", team leader submits via the Google Form)

Notes:
  - Live-site claims were REMOVED on 2026-07-04 (no deployment running). If the Vercel
    redeploy goes live before submission, consider restoring "deployed at nirobd.tech".
  - Word check: sed '/^<!--/,/-->$/d' "ProjectShowcasing_Techathon_CortexCrew_FirstRound.md" | wc -w
  - Design PDF is rendered from abstract-design.html (headless Chrome) — keep text in sync.
-->

# Niro — Your Health, in Your Own Hands

### আপনার স্বাস্থ্য, আপন হাতে

**Team Cortex Crew · Senior Category · AI/ML — Digital Health**

**The problem — every household knows it.** In Bangladesh, a family's entire medical history lives in a polythene bag: handwritten prescriptions no one can read, lab reports from different labs in different formats. Nobody — not the patient, not the doctor — can answer the simplest question about a life: _"Is my blood sugar getting better or worse?"_ Every report is read once and forgotten. Doctors repeat tests that were already paid for, slow deteriorations creep by unnoticed, and short visits are spent reconstructing history from paper.

**Our solution.** Niro turns that bag of paper into a living, self-organizing health record — in Bangla. Two core innovations:

**1 · Auto-categorized records (স্বাস্থ্য রেকর্ড).** Photograph any medical paper. A multimodal vision-language model reads it, explains it in plain Bangla, classifies it — prescription, CBC, blood-sugar report, lipid profile — extracts its date, and files it on the right shelf automatically. No typing, no prompting skill: the filing cabinet builds itself.

**2 · Health Trends (স্বাস্থ্য ট্রেন্ড).** Every lab value is extracted into one of 28 canonical health metrics with its reference range, then charted across months. Abnormal values are flagged, and each metric carries a directional insight — _"fasting glucose rising over six months."_ Scattered one-time readings become a visible trajectory that patients act on and doctors trust. No paper file — and no chatbot — can do this.

**Around this core:** the AI reads each new document against the patient's full history, flagging risks like a new drug clashing with an existing one; one tap requests a BMDC-licensed doctor's verification for 200–800 taka — the AI pre-writes the case summary, so review takes five minutes, not thirty; and in offline chambers a QR scan shares the record for the visit only, with time-bound, auto-revoking consent.

**Safe by design.** Niro never diagnoses and never prescribes; it extracts, explains, and flags. Low-confidence outputs automatically recommend human review, a banned-phrase linter blocks dosing language, every AI call and record access lands in an append-only audit log, and patients can delete all their data — aligned with Bangladesh's Data Protection Act 2023.

**Uniqueness.** Praava, Daktarbhai, Tonic, and Arogga store files, list doctors, or sell telemedicine calls; chatbots answer one question and forget you. None turns paper into a categorized, trend-tracking, patient-owned record in Bangla. Niro does.

**Feasibility and cost.** Fully built and working end-to-end (FastAPI, Next.js PWA, PostgreSQL) — not a concept. It runs in any phone browser, no app store needed; hosting fits free cloud tiers, and per-analysis AI cost is a few taka — near-zero operating cost.

**Impact.** For the first time, 170 million people can see their whole health story — organized, charted, and explained in their own language — and every doctor gets that story in thirty seconds. We are ready to demonstrate the complete live system at the final round.
