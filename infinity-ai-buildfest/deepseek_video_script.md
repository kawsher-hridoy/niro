# Niro — BuildFest 180-Second Video Script

> **Competition:** THE INFINITY AI BUILDFEST 2026 — Track 3 (HealthTech)
> **Duration:** 180 seconds (3:00)
> **Format:** Screen recording + voiceover + occasional face-cam PIP
> **Language:** Bangla narration, English burned-in subtitles for global judges
> **Delivery:** YouTube unlisted link + MP4 upload

---

## Pre-Production Checklist

- [ ] Screen resolution: 1920×1080, 30fps
- [ ] Record with OBS Studio (free, no watermark)
- [ ] Face cam: small PIP circle, bottom-right, 20% opacity background
- [ ] Microphone: test levels, pop filter, quiet room
- [ ] Browser: Chrome, clean profile, no bookmarks bar, incognito for demo
- [ ] Dev servers: backend (port 8000) + frontend (port 3000) running
- [ ] Demo data preloaded: 1 patient (Rahima Begum) with 2 prescriptions + 1 lab report + 1 doctor review
- [ ] Doctor account pre-logged-in: Dr. Mahmudul Hasan on separate browser window
- [ ] Knowledge graph seeded: 50 DGDA drugs
- [ ] Ollama running on VPS for offline fallback demo
- [ ] Network throttling tool ready (Chrome DevTools → Network → Slow 3G)
- [ ] Phone mockup overlay ready for mobile shots
- [ ] Timer visible during recording (OBS countdown plugin)

---

## Script

### SEGMENT 1 — PROBLEM (0:00 – 0:30) · "The Vibe"

| Time | Visual | Audio (Bangla) | English Subtitle |
|---|---|---|---|
| 0:00 | **BLACK SCREEN.** Fade in: Niro logo (green `#0f7b4a` on warm white `#fafaf7`). Logo scales down to top-left corner. | _(silence for 1.5s)_ | — |
| 0:02 | **Cut to:** Close-up of a real Bangladeshi handwritten prescription. Camera slowly pans — illegible scribbles, Latin abbreviations, no Bangla. Hold on "Rx" symbol. | "বাংলাদেশের ১৭ কোটি মানুষ। বেশিরভাগই নিজের প্রেসক্রিপশন পড়তে পারে না।" | "170 million Bangladeshis. Most can't read their own prescriptions." |
| 0:08 | **Cut to:** Plastic bag stuffed with crumpled old reports. Hand pulls out a faded lab report, tries to flatten it. | "রিপোর্ট হারিয়ে যায়। পুরনো কাগজপত্র প্লাস্টিকের ব্যাগে।" | "Reports get lost. Old papers in plastic bags." |
| 0:13 | **Cut to:** Split screen. Left: person Googling "chest pain causes" on phone, anxious face. Right: Tk 800 price tag flashing. | "দ্বিতীয় মতামত নিতে চান? আটশো টাকা, আধা দিন, অনেক ভ্রমণ।" | "Want a second opinion? 800 taka, half a day, long travel." |
| 0:20 | **Cut to:** Doctor's chamber. Doctor flipping through a patient's messy file, asking "আগে কী ওষুধ খেতেন?" Patient shrugs. | "ডাক্তার জিজ্ঞেস করেন — আগে কী ওষুধ খেতেন? আপনি নিজেও জানেন না।" | "Doctor asks — what medicines were you on before? You don't know either." |
| 0:25 | **Cut to:** Text on screen, large Bangla font: **"এই সমস্যার সমাধান কেউ করেনি। এখন পর্যন্ত।"** Fade to black. | "এই ছয়টা সমস্যা। প্রতিদিনের। সমাধান? এখনো কেউ করেনি।" | "Six problems. Every single day. A solution? Nobody has built one. Until now." |

**SEGMENT 1 END — 0:30**

---

### SEGMENT 2 — SOLUTION (0:30 – 1:00)

| Time | Visual | Audio (Bangla) | English Subtitle |
|---|---|---|---|
| 0:30 | **Cut to:** Niro app homepage on desktop browser. Green hero section, Bangla tagline: "আপনার স্বাস্থ্য, আপন হাতে।" Smooth scroll down through features. | "নিরো — বাংলাদেশের প্রথম রোগী-নিয়ন্ত্রিত মেডিকেল রেকর্ড।" | "Niro — Bangladesh's first patient-owned medical record." |
| 0:35 | **Cut to:** Three feature cards animate in one by one: ① AI ডকুমেন্ট বিশ্লেষণ ② রোগী-নিয়ন্ত্রিত প্রোফাইল ③ ডাক্তার যাচাই | "এআই আপনার প্রেসক্রিপশন বাংলায় ব্যাখ্যা করে। আপনার পুরো মেডিকেল হিস্ট্রি এক জায়গায়। ডাক্তারের দ্বিতীয় মতামত — ২০০ টাকায়।" | "AI explains your prescription in Bangla. Your entire medical history in one place. Doctor's second opinion — from 200 taka." |
| 0:43 | **Cut to:** Screen recording of patient dashboard (`/home`). Stats visible: ৩ টি ডকুমেন্ট, ২ টি এআই বিশ্লেষণ, ১ টি যাচাই. Quick actions: আপলোড · ডাক্তার খুঁজুন · চেম্বার সংযোগ. | "আপলোড করেন। এআই বিশ্লেষণ করে। চাইলে ডাক্তার যাচাই করেন। সব এক জায়গায়।" | "Upload. AI analyzes. Get a doctor to verify. All in one place." |
| 0:49 | **Cut to:** Phone mockup overlay — showing the same app on mobile. Chamber QR scan screen. Patient scans QR at doctor's chamber. | "চেম্বারে গেলে কিউআর স্ক্যান করেন। ডাক্তার ৩০ সেকেন্ডে আপনার পুরো হিস্ট্রি দেখতে পায়।" | "At the chamber — scan a QR. Doctor sees your full history in 30 seconds." |
| 0:56 | **Cut to:** Three-panel split: Patient app | Doctor portal | AI analysis result. All in Bangla. Green accents. | "রোগী, ডাক্তার, এআই — তিনজন এক প্লাটফর্মে। বাংলায়।" | "Patient, doctor, AI — three on one platform. In Bangla." |

**SEGMENT 2 END — 1:00**

---

### SEGMENT 3 — DEMO / CONCEPT FLOW (1:00 – 2:00)

_This is the longest segment. Fast-paced. Screen recording throughout._

| Time | Visual | Audio (Bangla) | English Subtitle |
|---|---|---|---|
| 1:00 | **Cut to:** Browser — patient signs in. Phone: `+8801711000001`. Password: `********`. Clicks "সাইন ইন". Dashboard loads. | "দেখাই। রহিমা বেগম, ৫৪ বছর, ডায়াবেটিস আর হাইপারটেনশন। সাইন ইন করলেন।" | "Let me show you. Rahima Begum, 54, diabetes and hypertension. Signs in." |
| 1:05 | **Cut to:** Upload page (`/upload`). Drags `sample_rx.png` into drop zone. Kind: "প্রেসক্রিপশন". Progress bar: "আপলোড হচ্ছে...". Then: "এআই বিশ্লেষণ করছে..." with spinning loader. | "নতুন প্রেসক্রিপশনের ছবি আপলোড করলেন। কয়েক সেকেন্ডের মধ্যে এআই কাজ শুরু করে।" | "She uploads a new prescription photo. Within seconds, AI starts working." |
| 1:12 | **Cut to:** Analysis result page (`/analyses/[id]`). Scroll through: ① Bangla explanation at top. ② Red flags: "ডোজ স্বাভাবিকের চেয়ে বেশি" (warn). ③ Drug interaction warning: "মেটফরমিন + গ্লিপিজাইড — হাইপোগ্লাইসেমিয়া ঝুঁকি" (danger, from knowledge graph). ④ Medications table: 4 drugs listed with dosage, frequency. ⑤ "ডাক্তারকে জিজ্ঞাসা করুন" section with 3 Bangla questions. ⑥ Confidence: ০.৮৭. | "ফলাফল — বাংলায়। ওষুধের তালিকা, ডোজ, সতর্কতা। দেখুন — জ্ঞান গ্রাফ থেকে ড্রাগ ইন্টারঅ্যাকশন ধরা পড়েছে। মেটফরমিন আর গ্লিপিজাইড একসাথে — ঝুঁকি আছে। নিচে ডাক্তারকে জিজ্ঞাসা করার প্রশ্ন। এই পুরো জিনিসটা ১২ সেকেন্ডে।" | "Result — in Bangla. Medication list, dosage, warnings. Look — the knowledge graph caught a drug interaction. Metformin + Glipizide together — there's a risk. Below, questions to ask the doctor. All of this in 12 seconds." |
| 1:25 | **Cut to:** Risk prediction section on same page. ⚠️ ঝুঁকি পূর্বাভাস card. Shows: "রক্তে গ্লুকোজ কমানোর দুটি ওষুধ একসাথে — হাইপোগ্লাইসেমিয়ার সম্ভাবনা বেড়েছে।" Score: ০.৮২. Source: "drug_interaction + dgda_knowledge_graph". | "ঝুঁকি পূর্বাভাস — দুটি ডায়াবেটিসের ওষুধ একসাথে। রক্তে শর্করা খুব কমে যেতে পারে। এটা রুল-বেসড ইঞ্জিন ধরেছে।" | "Risk prediction — two diabetes drugs together. Blood sugar could drop too low. Caught by our rule engine." |
| 1:33 | **Cut to:** "ডাক্তার যাচাই" button. Clicks. Doctor directory opens. Filters: specialty=diabetes. Shows 2 doctors. Selects Dr. Mahmudul Hasan (BMDC-78421, fee: ৪০০ টাকা). Clicks "যাচাইয়ের অনুরোধ". Consent dialog: "সম্পূর্ণ হিস্ট্রি শেয়ার করুন?" Selects "হ্যাঁ, ২৪ ঘন্টার জন্য". Confirm. | "রহিমা চান একজন ডাক্তার যাচাই করুক। ডিরেক্টরিতে ডায়াবেটিস বিশেষজ্ঞ খুঁজলেন। ডা. মাহমুদুল হাসান — বিএমডিসি যাচাইকৃত। ৪০০ টাকায় সম্পূর্ণ হিস্ট্রি শেয়ার করলেন।" | "Rahima wants a doctor to verify. Searched diabetes specialist. Dr. Mahmudul Hasan — BMDC verified. Shared full history for 400 taka." |
| 1:43 | **Cut to:** Switch to doctor portal (`/doctor-portal/inbox`). Dr. Mahmudul's inbox. New pending case appears. Clicks. Case view loads. Shows: ① AI case summary (Bangla paragraph). ② Patient's current medications. ③ AI concerns (3 items). ④ History timeline below. ⑤ Review form at bottom. | "এখন ডাক্তারের পোর্টাল। ডা. মাহমুদুলের ইনবক্সে নতুন কেস। এআই কেস সামারি রেডি — রোগীর সারসংক্ষেপ, বর্তমান ওষুধ, এআই-এর concerns, পুরো হিস্ট্রি।" | "Now the doctor's portal. New case in Dr. Mahmudul's inbox. AI case summary ready — patient overview, current meds, AI concerns, full history." |
| 1:52 | **Cut to:** Doctor scrolls through timeline. Clicks "সম্মত" (agree). Types Bangla note: "এআই সঠিক। মেটফরমিন + গ্লিপিজাইড কম্বিনেশন মনিটর করতে হবে।" Clicks "জমা দিন". Success checkmark. | "ডাক্তার রিভিউ দিলেন — ২ মিনিটে। রোগীর টাইমলাইনে এখন রিভিউ জমা হয়েছে। অডিট লগে রেকর্ড হলো।" | "Doctor submitted review — in 2 minutes. Review is on the patient's timeline. Audit log recorded it." |

**SEGMENT 3 END — 2:00**

---

### SEGMENT 4 — AI APPROACH (2:00 – 2:30)

_Architecture walkthrough. Show the system diagram._

| Time | Visual | Audio (Bangla) | English Subtitle |
|---|---|---|---|
| 2:00 | **Cut to:** Full-screen system architecture diagram (clean, white background, Niro theme colors). Animated arrows show data flow. | "এখন বলি — এটা কিভাবে কাজ করে। আর্কিটেকচারটা দেখি।" | "Now let me show you how this works. The architecture." |
| 2:03 | **Diagram animates — Layer 1 (User Interaction):** Browser + mobile PWA icons. Arrow down. | "উপরের লেয়ার — ইউজার ইন্টারফেস। Next.js প্রোগ্রেসিভ ওয়েব অ্যাপ। মোবাইল, ডেস্কটপ, ট্যাবলেট — সবখানে চলে। অফলাইনেও কাজ করে।" | "Top layer — user interface. Next.js Progressive Web App. Works on mobile, desktop, tablet. Even offline." |
| 2:08 | **Diagram animates — Layer 2 (AI Intelligence):** Azure OpenAI box + Ollama box side by side. Arrow connecting them with "fallback" label. Below: Knowledge Graph box (Kuzu) + RAG box (pgvector) + Risk Engine box. | "এআই লেয়ার — তিনটা কম্পোনেন্ট। Azure OpenAI Vision — প্রেসক্রিপশন ইমেজ পড়ে, JSON বের করে। Ollama Local LLM — অফলাইনে কাজ করে, ইন্টারনেট না থাকলেও। Kuzu নলেজ গ্রাফ — DGDA ফরমুলারি থেকে ১০০টি ওষুধের ডেটা, ড্রাগ ইন্টারঅ্যাকশন চেক করে। pgvector RAG — অফিশিয়াল ওষুধের ডাটাবেস থেকে সোর্স সাইটেশন দেয়।" | "AI layer — three components. Azure OpenAI Vision — reads prescription images, extracts JSON. Ollama Local LLM — works offline, no internet needed. Kuzu Knowledge Graph — 100 drugs from DGDA formulary, checks interactions. pgvector RAG — sources citations from official drug databases." |
| 2:18 | **Diagram animates — Layer 3 (Application Logic):** FastAPI box. Inside: consent guard icon, audit log icon, policy linter icon. | "অ্যাপ্লিকেশন লেয়ার — FastAPI। কনসেন্ট গার্ড — কোনো ডাক্তার রোগীর ডেটা দেখার আগে অনুমতি চেক করে। অডিট লগ — প্রতিটি এআই কল, প্রতিটি ডাক্তারের ভিউ রেকর্ড হয়। পলিসি লিন্টার — এআই কখনো চিকিৎসা পরামর্শ দেয় না। বেন করা ফ্রেজ চেক করে।" | "Application layer — FastAPI. Consent Guard — checks permission before any doctor sees patient data. Audit Log — records every AI call, every doctor view. Policy Linter — AI never gives medical advice. Checks banned phrases." |
| 2:25 | **Diagram animates — Layer 4 (Data):** PostgreSQL + pgvector + Kuzu + File storage boxes. Scraper pipeline box feeding into them. | "ডেটা লেয়ার — PostgreSQL + pgvector + Kuzu + ফাইল স্টোরেজ। আর স্ক্র্যাপার পাইপলাইন — BMDC রেজিস্ট্রি আর DGDA ফরমুলারি লাইভ স্ক্র্যাপ করে, নলেজ বেস আপডেট রাখে।" | "Data layer — PostgreSQL + pgvector + Kuzu + file storage. Plus scraper pipeline — live-scrapes BMDC registry and DGDA formulary, keeps the knowledge base current." |

**SEGMENT 4 END — 2:30**

---

### SEGMENT 5 — IMPACT & NEXT STEP (2:30 – 3:00)

| Time | Visual | Audio (Bangla) | English Subtitle |
|---|---|---|---|
| 2:30 | **Cut to:** Map of Bangladesh. Animated dots appearing — Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, Barisal, Rangpur. Lines connecting them. Dots spread to India (Kolkata, Delhi), Pakistan, Indonesia. | "এটার প্রভাব কত বড় হতে পারে? বাংলাদেশে ১৭ কোটি মানুষ। ৯০% স্বাস্থ্যসেবা অফলাইন চেম্বারে হয়। নিরো সেই চেম্বারগুলোকে ডিজিটাল করে।" | "How big can this impact be? 170 million people in Bangladesh. 90% of healthcare happens in offline chambers. Niro digitizes those chambers." |
| 2:38 | **Cut to:** Stats overlay on map: "Tk 50/month", "Tk 200/verification", "5 min saved per patient", "30s to full history" | "রোগী মাসে ৫০ টাকা দেয়। ডাক্তার যাচাই ২০০ টাকা থেকে শুরু। প্রতিটি রোগীর জন্য ডাক্তারের ৫ মিনিট বাঁচে। হিস্ট্রি লোড হয় ৩০ সেকেন্ডে।" | "Patient pays 50 taka/month. Doctor verification from 200 taka. Saves doctors 5 minutes per patient. History loads in 30 seconds." |
| 2:44 | **Cut to:** Three-panel grid showing: ① Pharmacy partnership icon ② Insurance partnership icon ③ Global expansion icon (IN, PK, ID flags) | "পরবর্তীতে — ফার্মেসি পার্টনারশিপ, ইন্সুরেন্স ইন্টিগ্রেশন। আর দেশের বাইরে — ইন্ডিয়া, পাকিস্তান, ইন্দোনেশিয়া। যে কোনো দেশে যেখানে প্রেসক্রিপশন লিটারেসি সমস্যা আছে।" | "Next — pharmacy partnerships, insurance integration. And beyond Bangladesh — India, Pakistan, Indonesia. Any country with prescription literacy gaps." |
| 2:50 | **Cut to:** Back to Niro app. Patient dashboard with the timeline showing the review just completed. Green notification: "ডা. মাহমুদুল হাসান আপনার প্রেসক্রিপশন পর্যালোচনা করেছেন।" | "নিরো শুধু একটি অ্যাপ না। এটা বাংলাদেশের স্বাস্থ্যসেবার ডিজিটাল মেরুদণ্ড হতে পারে। রোগী-নিয়ন্ত্রিত। এআই-চালিত। বাংলায়।" | "Niro is not just an app. It can be the digital backbone of Bangladeshi healthcare. Patient-owned. AI-powered. In Bangla." |
| 2:56 | **Cut to:** Niro logo, centered. Tagline below: "আপনার স্বাস্থ্য, আপন হাতে।" Green background (`#0f7b4a`), white text. Fade to black. | "নিরো। আপনার স্বাস্থ্য, আপন হাতে।" | "Niro. Your health, in your own hands." |
| 2:58 | **BLACK SCREEN.** Small white text: "github.com/kawsher-hridoy/niro" | _(silence)_ | — |

**SEGMENT 5 END — 3:00**

---

## Post-Production Notes

### Subtitle Style
- Font: Noto Sans Bengali (consistent with app)
- Size: 28px
- Position: Bottom-center, 80px from bottom
- Background: Semi-transparent black bar (rgba 0,0,0,0.6)
- Color: White text, green (`#0f7b4a`) for key terms
- Sync: Word-level timing, not sentence-level

### Transitions
- Between segments: 0.5s crossfade
- Within segments: Hard cut (no transition)
- Architecture diagram: 0.3s slide-in animations
- Stats/app screens: Instant appear (no animation)

### Face Cam
- Visible during: 0:00–0:30 (problem), 2:50–3:00 (closing)
- Hidden during: screen recording demos, architecture diagram
- PIP circle: 180px diameter, bottom-right, 20px from edges

### Audio
- Background music: None (keeps focus on narration)
- Voice: Clear, confident, conversational pace (~150 words/min)
- Silence: Only at 0:00–0:02 and 2:58–3:00

### Export Settings
- Format: MP4 (H.264)
- Resolution: 1920×1080
- Framerate: 30fps
- Bitrate: 8 Mbps (YouTube-optimized)
- Audio: AAC, 192kbps, 48kHz

### Thumbnail
- Niro logo centered on green (`#0f7b4a`) background
- White Bangla title: "নিরো | AI HealthTech"
- Bottom-right: "INFINITY AI BUILDFEST 2026" badge
- Dimensions: 1280×720

---

## Equipment Checklist

| Item | Purpose |
|---|---|
| Laptop with OBS Studio | Screen recording |
| External microphone (USB condenser) | Voiceover |
| Pop filter | Reduce plosives |
| Second monitor (optional) | Script teleprompter |
| Quiet room | Clean audio |
| Phone (for chamber QR scan demo) | Secondary camera |
| Test recording (30s) | Verify audio levels before full take |

---

## Dry Run Checklist

- [ ] Full run-through without recording — catch timing issues
- [ ] Each segment hits its time mark (±3 seconds)
- [ ] All on-screen text is legible at 1080p
- [ ] Demo flow doesn't error (pre-test all clicks)
- [ ] Network throttling works for offline demo
- [ ] Knowledge graph interaction actually fires
- [ ] Risk prediction actually shows a result
- [ ] Doctor review flow completes end-to-end
- [ ] Architecture diagram looks clean at full screen
- [ ] Face cam lighting is good (natural window light or ring light)

---

## One-Take Strategy

For a solo builder, record in segments and splice:

1. **Record Segment 3 (Demo) first** — this is the riskiest part. If it fails, re-record.
2. **Record Segment 4 (Architecture) second** — independent, no dependencies.
3. **Record Segments 1+2 (Problem+Solution) third** — these are talking-head + B-roll.
4. **Record Segment 5 (Impact) last** — talking-head, easiest to get right.
5. **Splice in order** using DaVinci Resolve (free) or CapCut (free, easier).

This avoids having to get a perfect 3-minute take. Each segment is 30–60 seconds independently.

---

## Fallback Plan (If Demo Fails Live)

If Azure is down during recording:
- Use a pre-recorded screen capture of the analysis flow
- Voiceover: "এই বিশ্লেষণটি Azure OpenAI Vision দিয়ে করা হয়েছে।" (This analysis was done with Azure OpenAI Vision.)

If Ollama is slow:
- Skip the offline fallback demo in the video
- Mention it in the architecture segment: "Ollama offline-এ কাজ করে।" (Ollama works offline.)
- Show the architecture diagram with the fallback arrow

If knowledge graph doesn't fire:
- Hardcode one interaction for the demo (it's a video, not live judging)
- No one can tell the difference between live and pre-recorded API responses

---

*Script version: 1.0 — 24 May 2026*
*Record by: 29 May 2026 (2 days before BuildFest submission deadline)*