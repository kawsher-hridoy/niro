# Niro — "Vibe to Production in 180 Seconds"
### Infinity AI BuildFest 2026 · Track 3 (HealthTech) · Preliminary Video Script

**Format:** 180s screen-recording of the live app (nirobd.tech) + brief talking-head intro/outro.
**Voiceover:** English narration, Bangla shown on-screen in the product (the inclusion story). A full-Bangla VO variant is noted at the bottom.
**Target spoken length:** ~420 words (paced ~140 wpm with demo pauses).
**Tone:** calm, confident, founder-led. Show the working product — don't over-explain.

---

## SEGMENT 1 — PROBLEM (0:00–0:30) · "This problem matters"

**ON SCREEN:** Open on a real handwritten Bangladeshi prescription + a plastic bag of crumpled old reports. Quick cuts.

**VOICEOVER:**
> "In Bangladesh, 170 million people share one problem. You leave the doctor holding a prescription you can't read — handwritten, in English, in Latin shorthand. Your lab report is just numbers and no answers. Your history? Lost in a plastic bag. And a real second opinion costs 1,500 taka and half a day. We are Team Niro, and we built the fix."

**EVALUATOR HOOK:** clarity + relevance + urgency, local and universal.

---

## SEGMENT 2 — SOLUTION (0:30–1:00) · "This is how we solve it"

**ON SCREEN:** Niro logo → tagline *"আপনার স্বাস্থ্য, আপন হাতে"* → landing page at nirobd.tech.

**VOICEOVER:**
> "Niro is a patient-owned medical record with an AI that reads any prescription or lab report and explains it in plain Bangla — in seconds. What's different: it's not a chatbot bolted onto an app. Niro extracts structured medical data from every report and prescription, builds a living health-trend timeline across all of them, and safely stores the original hard-copy of each document so nothing is ever lost. Then it connects you to a real verified doctor for a 200-taka second opinion. The AI does the reading. The doctor confirms. You own the data — and your whole history."

**EVALUATOR HOOK:** simplicity + uniqueness — AI-native, not surface AI.

---

## SEGMENT 3 — DEMO / SYSTEM FLOW (1:00–2:00) · "This is how it works"

**ON SCREEN:** Live screen recording. Narrate each step as it happens. **Pre-load everything — no live typing.**

**VOICEOVER + ACTIONS:**
> *(upload)* "I upload a prescription photo..." — tap upload, pick the image
> *(analysis appears in Bangla)* "...and Niro returns the medicines, dosage, and a plain-Bangla explanation — with a confidence score and red-flag warnings."
> *(scroll to history insight)* "It reads my full history too: 'You were on Metformin in January — this new drug interacts.' That's longitudinal reasoning, not a one-off answer."
> *(open Trends page)* "Lab values become trends — my blood sugar over six months, charted automatically."
> *(cut to doctor tablet / chamber QR)* "In a chamber, the doctor scans a QR. I approve with one tap — time-bound, and every view is logged in my access trail. Consent and audit are built in."

**EVALUATOR HOOK:** feasibility + logic. Input → AI → structured output → human-in-the-loop. **This is a deployed system, live at nirobd.tech.**

---

## SEGMENT 4 — AI APPROACH (2:00–2:30) · "This is real AI thinking"

**ON SCREEN:** Simple architecture diagram: `Upload → Vision LLM → Structured JSON → Policy Linter → History-aware reasoning → Patient + Doctor`.

**VOICEOVER:**
> "Under the hood: a multimodal vision LLM rasterizes the document and extracts structured JSON — medicines, lab metrics, reference ranges. Every output passes a safety linter that blocks the AI from ever prescribing — it explains and flags, never diagnoses. Low-confidence reads auto-escalate to a human doctor. Every AI call is audit-logged with model version and a content hash. Next on our roadmap: RAG over the DGDA national drug formulary for cited drug-interaction checks."

**EVALUATOR HOOK:** depth + structure + responsible AI. (RAG framed as roadmap — honest, not faked.)

---

## SEGMENT 5 — IMPACT & NEXT STEP (2:30–3:00) · "We can build and scale this"

**ON SCREEN:** KPI cards, then the team grid from the live `/docs` page, then logo.

**VOICEOVER:**
> "The impact: understand any prescription in 10 seconds instead of guessing. A second opinion at one-seventh the cost. A medical history that follows the patient for life. We're already live — FastAPI, Next.js, Azure AI, deployed on a single VM at nirobd.tech. Next: the drug-formulary RAG layer, bKash payments, and offline chamber support for rural clinics. Bangla-first, built to scale across South Asia. Niro — your health, in your own hands."

**EVALUATOR HOOK:** vision + potential + measurable outcomes.

---

## KPIs to flash on-screen (Segment 5)
- ⏱ Prescription understood in **~10 seconds** (vs. minutes of confusion)
- 💸 Second opinion at **৳200** (vs. ৳1,500+)
- 📈 **6-month** health-metric trends, auto-extracted
- 🔒 **100%** of doctor access logged + consent-gated
- 🌐 Live in production: **nirobd.tech**

---

## Production checklist
- [ ] Record the demo at 1080p, app in **Bangla** (turn off browser extensions to avoid hydration noise).
- [ ] Pre-load a clean prescription + a patient account that already has history + lab trends (so the "January Metformin" insight and the chart both render).
- [ ] Flip `/docs` to public for the team-grid shot, or screenshot it beforehand.
- [ ] Keep talking-head to ≤5s intro; spend the budget on the live product.
- [ ] Add Bangla subtitles burned-in for the global+local audience.
- [ ] Upload to YouTube as **Public or Unlisted** (never Private).

## Full-Bangla VO option
If you'd rather narrate in Bangla with English subtitles (stronger "inclusion" signal): keep the same beats, open with *"বাংলাদেশে ১৭ কোটি মানুষের একটাই সমস্যা — ডাক্তারের প্রেসক্রিপশন পড়া যায় না।"* and close on the tagline. I can write the complete Bangla VO on request.

---

### ⚠️ One strategic note (honest)
The BuildFest rules say a self-chosen idea "would not be considered for award, but if qualified, will be showcased." Niro maps cleanly to **Track 3, Challenge #6 — Custom HealthTech (Showcase)**. To be **award-eligible** rather than showcase-only, you'd want to frame Niro inside one of the defined Track-3 challenges (e.g., position the lab-trend + risk-flagging as a **Risk Prediction Engine**, or the chamber/rural flow as a **Telehealth Offline System**). The script above works for both — but pick the framing before you submit the 1-page summary.
