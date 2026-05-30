# Niro — BuildFest 2026 Qualification Analysis

> **Analyst:** GLM-5.1 (opencode)
> **Date:** 24 May 2026
> **Competition:** THE INFINITY AI BUILDFEST 2026 (June 12, 2026)
> **Project:** Niro — Patient-owned medical record + AI document analyzer + on-demand doctor verification

---

## Executive Summary

**Niro qualifies under Track 3 (HealthTech) and is competitive on impact, ethics, and Bangla-first design — but has 3 mandatory requirement failures (no RAG/Graph, no scrapers, no Lovable stack) that must be addressed before the May 30 preliminary submission deadline. The most urgent actions are: adding RAG + a knowledge graph + real data ingestion, and forming a proper team with NRB participation.**

**Estimated score range:**
- Before gap fixes: ~70-78/100
- After gap fixes: ~80-88/100

---

## 1. Track Alignment — Track 3: Healthcare (HealthTech)

Niro should be submitted under **Track 3 — Healthcare (HealthTech): AI-Augmented Public & Maternal Health Systems**.

| BuildFest Requirement | Niro Match | Strength |
|---|---|---|
| **Core Focus Areas** (Maternal companions, AI triage, Preventive systems, Rural telehealth, Risk prediction) | Niro covers **AI triage** (document analysis → red flags), **Rural telehealth** (offline chamber QR flow), **Preventive systems** (history-aware cross-referencing) | Partial — not maternal-specific, but covers 3 of 5 focus areas |
| **Required Elements** (Ethical safeguards, Clinical validation logic, Offline resilience, Data protection compliance) | ✅ Ethical safeguards (`policy.py` banned-phrase linter, confidence threshold, `recommend_human_review`), ✅ Clinical validation (human-in-loop doctor verification), ✅ Offline resilience (chamber QR flow works on local network), ✅ Data protection (consent-gated reads, audit log, DPA 2023 deletion) | **STRONG** |
| **Technical Expectations** (Predictive risk modeling, Knowledge graph integration, Secure backend, Human-in-loop interface) | ✅ Predictive risk modeling (AI red-flag detection + history cross-reference), ❌ Knowledge graph integration (pgvector/RAG deferred, no GraphDB), ✅ Secure backend (JWT auth, consent enforcement, PHI protection), ✅ Human-in-loop (doctor verification flow) | **Moderate** — no knowledge graph yet |
| **Global Alignment** (WHO standards, Explainable medical AI, Privacy compliance) | ✅ Explainable medical AI (Bangla explanations, structured output, confidence scores), ✅ Privacy compliance (DPA 2023, granular consent, access audit), ❌ WHO standards (DGDA formulary RAG deferred — Phase F) | **Moderate** — WHO alignment is planned but not built |
| **Impact Metrics** (Risk reduction rates, Access expansion, Response time improvement) | ⚠️ No measured KPIs yet (demo stage) — but the product design targets: 5-min doctor reviews (vs 30-min traditional), Tk 200-800 affordable verification, offline chamber access | **Needs articulation** |
| **Scalability Requirement** (Low-bandwidth deployment, Rural optimization, Regional expansion capability) | ✅ Low-bandwidth (chamber QR works on minimal network, local blob storage), ✅ Rural optimization (offline chamber flow designed for BD reality), ✅ Regional expansion (provider-abstracted AI, modular architecture) | **STRONG** |

### Best Challenge Fit: Challenge #3 — Telehealth Offline System

The BuildFest Track 3 challenges are:

| Challenge | Niro Fit |
|---|---|
| 1. Maternal Health Companion | Weak — not maternal-focused |
| 2. Health Worker Assistant | Moderate — could be reframed as AI assistant for health workers reading prescriptions |
| **3. Telehealth Offline System** | **BEST FIT** — Low-connectivity health system with offline-first chamber QR flow |
| 4. Nutrition AI Engine | Weak |
| 5. Risk Prediction Engine | Moderate — AI flags red-flag concerns from prescriptions/lab reports |
| 6. Custom HealthTech (Showcase) | Viable — can define Niro as its own solution |

**Recommendation:** Submit under Challenge #3 (Telehealth Offline System) or Challenge #6 (Custom HealthTech Showcase) where you define Niro on your own terms. Challenge #3 gives the clearest narrative alignment with the offline chamber QR flow.

---

## 2. Judging Criteria Analysis (100-point scale)

### Innovation (20%) — Score Estimate: 14-16/20

| What Judges Want | Niro Has |
|---|---|
| Originality, creativity, non-obvious AI application | ✅ Patient-owned EMR + AI document analyzer + offline chamber QR hybrid — **no competitor in BD combines all three**. The "AI-prepared case summary for cheap human review" is genuinely novel |
| Globally competitive innovation | ✅ Patient-owned portable EMR for BD doesn't exist globally; offline+online hybrid is unique to BD healthcare reality |

**Score justification (14-16):** Strong originality and creative AI integration. Falls short of "breakthrough" (16-20) because no RAG/knowledge graph grounds the AI reasoning in real medical knowledge — the AI reasons from image content alone, not from structured medical databases.

### Technical Execution (20%) — Score Estimate: 12-15/20

| What Judges Want | Niro Has | Gap |
|---|---|---|
| Architecture quality | ✅ Clear layered architecture (FastAPI backend → AIProvider → Postgres → Blob → Azure OpenAI). 45 endpoints, 11 DB tables, 3 migrations | |
| AI integration depth | ✅ Multimodal vision (prescription/lab image analysis), structured JSON output, history-aware context, case summary generation, banned-phrase policy linter | |
| System robustness | ⚠️ Feature-complete but: **no tests** (tests/ empty), no rate limiting, no token refresh, vestigial `passlib` dep | Tests and some polish missing |
| **RAG pipeline** | ❌ **pgvector deferred — no RAG, no knowledge graph, no embedding-based retrieval** | **Major gap** |
| **MCP/agent orchestration** | ❌ No multi-agent system, no MCP integration | **Major gap** |

**Score justification (12-15):** Well-structured AI-native system design. Falls short of "production-grade engineering maturity" (16-20) because of missing RAG/knowledge graph, no tests, and no agent orchestration.

### Business Model + Global Readiness (20%) — Score Estimate: 14-16/20

| What Judges Want | Niro Has |
|---|---|
| Monetization logic | ✅ Tiered doctor verification (Tk 200/400/800), patient subscription (Tk 50/month), platform 30% cut, pharmacy/insurance partnerships (future) |
| Adoption pathway | ✅ Free doctor onboarding (5 min saved per patient = massive incentive), PDF fallback for growth |
| Cross-border applicability | ⚠️ Designed for BD specifically (Bangla, BMDC, bKash). Concept is universally applicable but implementation is BD-local. Needs articulation of how it scales to other emerging markets |

**Score justification (14-16):** Viable market pathway with defined users. The "WhatsApp playbook" (be indispensable utility first, monetize at the edges) is a strong narrative. Falls short of "scalable, globally adaptable" (16-20) because global scaling story is not yet articulated.

### Real-World Impact + Ethical AI (20%) — Score Estimate: 16-18/20 (Niro's STRONGEST dimension)

| What Judges Want | Niro Has |
|---|---|
| Problem relevance | ✅ Solves 6 stacked daily pain points for 170M people — illegible prescriptions, incomprehensible reports, no second opinion, no portable history, broken doctor discovery, wasted consultation time |
| Measurable benefit | ⚠️ No live KPIs yet, but design targets are measurable |
| Responsible AI safeguards | ✅✅✅ **Niro's strongest differentiator**: banned-phrase linter prevents imperative medical advice, confidence threshold triggers human review, consent-gated data access, append-only audit log, granular time-bound consent, patient-visible access log, DPA 2023 deletion right, PHI protection, no PHI in logs |
| Bias mitigation | ✅ AI never gives final advice; only explains and flags; policy linter catches violations |

**Score justification (16-18):** High social return with documented ethical safeguards. This is where Niro beats virtually every other team. Only falls short of maximum (16-20) because impact KPIs are projected rather than measured.

### Scalability + NRB Collaboration (10%) — Score Estimate: 4-7/10

| What Judges Want | Niro Has | Gap |
|---|---|---|
| Deployment feasibility | ✅ Single VPS deployment (Caddy + systemd), Docker-compose local | |
| Modular architecture | ✅ Provider-abstracted AI, router-based backend, route-group frontend | |
| **NRB/global collaboration** | ❌ **Solo build (kawsher-hridoy). No NRB team member.** | **Major gap** — BuildFest strongly values NRB integration |
| **Cloud readiness** | ⚠️ Local dev only; no cloud deployment yet (Phase F) | |

**Score justification (4-7):** Modular architecture helps, but NRB absence is a direct scoring penalty in this dimension. BuildFest explicitly states NRB collaboration serves as "a qualitative advantage for global standards alignment."

### Presentation (10%) — Score Estimate: 6-8/10

| What Judges Want | Niro Has |
|---|---|
| Clarity of storytelling | ✅ Detailed demo script (90s video + 5-min live), clear problem articulation |
| AI reasoning explanation | ✅ Structured architecture docs, clear input→AI→output flow |
| Team confidence | ⚠️ Solo developer — team presentation dynamics are different |

**Score justification (6-8):** Clear presentation with moderate structure. Solo presentation is a disadvantage in the "investor-ready" category.

### Total Score Estimate

| Dimension | Weight | Current Score | After Fixes |
|---|---|---|---|
| Innovation | 20% | 14-16 | 16-18 |
| Technical Execution | 20% | 12-15 | 15-18 |
| Business Model + Global Readiness | 20% | 14-16 | 16-18 |
| Impact + Ethical AI | 20% | 16-18 | 17-20 |
| Scalability + NRB | 10% | 4-7 | 7-10 |
| Presentation | 10% | 6-8 | 7-9 |
| **Total** | **100%** | **~70-78** | **~80-88** |

---

## 3. Mandatory Requirements Check

The BuildFest document states: **"All teams MUST demonstrate"** the following 7 requirements.

| # | Mandatory Requirement | Niro Status | Risk Level |
|---|---|---|---|
| 1 | **AI-native architecture (not surface AI use)** | ✅ **PASS** — AI is core to every feature, not a chatbot bolt-on. Multimodal vision analysis, history-aware context, structured output extraction, policy linter enforcement | None |
| 2 | **Full-stack integration (Lovable + Cursor + Claude Code + LLMs)** | ❌ **FAIL** — Niro uses FastAPI + Next.js + Azure OpenAI. **No Lovable, no Cursor in the build workflow** (though Claude Code was used for development). BuildFest recommends Lovable as primary tool; you lose 5 VCP points for not using it | 🔴 Critical |
| 3 | **RAG + Graph-based reasoning** | ❌ **FAIL** — pgvector deferred, no RAG pipeline, no knowledge graph. AI uses direct LLM prompts without retrieval augmentation. The "knowledge layer" is entirely absent | 🔴 Critical |
| 4 | **Scraping + parsing real-world data** | ❌ **FAIL** — No scrapers, no real external data ingestion. DGDA formulary is planned but not built. BMDC verification is mocked, not scraped. All data is user-uploaded or seeded | 🔴 Critical |
| 5 | **Personalization engine** | ✅ **PASS** — History-aware analysis cross-references past prescriptions, patient profile drives analysis context, doctor receives AI-prepared case summary tailored to specific patient | None |
| 6 | **Bangla + localization capability** | ✅✅ **STRONG PASS** — Bangla-first throughout: UI, AI outputs, numerals, font, prompts. This is Niro's most complete mandatory requirement | None |
| 7 | **Scalable, cloud-ready design** | ⚠️ **PARTIAL** — Architecture is modular and designed for VPS deployment (Caddy + systemd), but not deployed yet. No SaaS-ready API layer, no cloud infrastructure | 🟡 Moderate |

**Pass rate: 3/7 fully passing, 1/7 partial, 3/7 failing.**

---

## 4. Critical Gaps (Must Address to Compete Seriously)

### 🔴 P0 — Critical (Blocks Qualification)

| Gap | Why It Matters | How to Fix | Estimated Effort |
|---|---|---|---|
| **No RAG / Knowledge Graph** | BuildFest calls this "mandatory" and "what wins". Every example solution in the HealthTech track includes GraphRAG. Without it, the AI is "just an LLM wrapper" in judges' eyes | Add pgvector + DGDA drug formulary embeddings + WHO/DGHS guideline retrieval. Even a basic RAG pipeline over drug interaction data would address this. Use Supabase/PGVector as the vector store | 1-2 days |
| **No GraphDB** | BuildFest requires "Graph-based reasoning". The MaaCare AI example uses "GraphRAG (WHO/DGHS)" | Add Neo4j or Supabase GraphDB for: drug interaction network, patient timeline relationships, doctor-specialty mapping, condition-treatment graph | 1-2 days (can overlap with RAG work) |
| **No scrapers/data ingestion** | "Scraping + parsing real-world data" is mandatory. All example solutions include "Scrapers" in their stack | Add scrapers for: DGHS treatment guidelines (HTML), BMDC registry (public lookup), DGDA drug formulary (PDF/HTML parsing), WHO Bangladesh guidelines | 1 day |

### 🟡 P1 — High (Significant Scoring Penalty)

| Gap | Why It Matters | How to Fix | Estimated Effort |
|---|---|---|---|
| **Solo team / No NRB member** | BuildFest prescribes 3-5 member teams. NRB inclusion is explicitly scored (10% of Scalability dimension). Team composition section says: "Include NRB professional/student as active team member" | Recruit 2-3 team members: at minimum a business/domain person + a frontend contributor. Find an NRB professional (any BD technologist abroad) as advisor/collaborator. Even a remote NRB mentor counts | ASAP — social effort |
| **No Lovable/Cursor stack articulation** | BuildFest penalizes non-Lovable tools (-5 VCP points). For the main event, the "build methodology" matters | Document how Claude Code + Cursor were used in development. Consider building a supplementary Lovable prototype or component. For VCP, you'd need to use Lovable separately | 0.5-1 day to document; 1 day for Lovable prototype |
| **No cloud deployment** | "Cloud-ready design" is mandatory. "Works only on local machine/demo" = score band 0-3 | Deploy to VPS with Caddy + systemd. Use the already-planned Phase F4 deployment | 1 day |

### 🟠 P2 — Moderate (Scoring Enhancement)

| Gap | Why It Matters | How to Fix | Estimated Effort |
|---|---|---|---|
| **No tests** | Judges assess "system robustness". Empty test directory signals prototype, not production | Add pytest golden tests for AI provider + contract tests for consent guard + integration test for audit writer | 1 day |
| **No measured KPIs** | Impact dimension wants "measurable outcomes". Without KPIs, impact is aspirational, not demonstrated | Define KPIs: e.g., "AI confidence correlates with doctor agreement in X% of cases", "average analysis time 12s vs 30-min manual reading", "doctor review time reduced from 15 min to 5 min" | 0.5 day |
| **Global scaling story missing** | Business Model dimension scores "cross-border applicability". Niro is BD-specific today | Articulate how Niro adapts to: India (Hindi + local medical boards), Pakistan (Urdu + PMDC), Nigeria (English + MDCN), Southeast Asia. The architecture is already modular enough — just need the narrative | 0.5 day |
| **WHO/DGHS standard alignment not shown** | Track 3 specifically asks for "WHO standards" and "DGHS" integration | Add a RAG layer over WHO/DGHS guidelines. Even citing alignment in the architecture docs helps | 1 day (overlaps with RAG work) |

---

## 5. What Niro Already Does Exceptionally Well

These are competitive advantages most teams won't match:

### 5.1 Ethical AI Depth (Unmatched)

Banned-phrase linter (`backend/ai/policy.py`) catches imperative medical advice in both Bangla and English. Confidence threshold (< 0.5) triggers `recommend_human_review`. Consent-gated reads via `ConsentGuard` — no doctor can access patient data without explicit, time-bound consent. Append-only audit log records every AI call and every doctor view. Patient-visible access log. DPA 2023 deletion right. PHI never in logs.

This is **far beyond** what most hackathon teams build for ethical AI. Most teams will have a disclaimer banner. Niro has enforcement at the code level.

### 5.2 Bangla-First (Complete)

Not just labels — AI system prompts are in Bangla, outputs use Bangla numerals (২৪৫ not 245) via `toBangla()`, typography is optimized for Bengali script (OpenType ligature features: akhn, blwf, half, pstf, vatu, rphf), Noto Sans Bengali font, `<html lang="bn">`, voice-over in Bangla for video. This is the most complete Bangla-first implementation possible.

### 5.3 Offline Chamber Hybrid (Unique)

The QR-based chamber flow (doctor generates QR → patient scans → grants consent → doctor sees profile → writes prescription → auto-closes) is unique to BD healthcare reality. No other team will have this. It directly addresses the "offline resilience" and "rural telehealth" requirements in Track 3.

### 5.4 Production-Grade Architecture (Not a Prototype)

45 API endpoints, 11 DB tables, 3 Alembic migrations, consent enforcement, audit trail, structured AI output, history-aware analysis, case summary generation, doctor portal, patient portal, chamber flow. This is a working system, not a demo. Most BuildFest teams will present wireframes or minimal prototypes.

### 5.5 Patient Ownership Model (Trust Differentiator)

Data belongs to the patient. Deletable on demand (`DELETE /me`). Shared only via explicit time-bound consent (1-24h). Auto-revoked on chamber session close. Every doctor view is logged and visible to the patient. This aligns perfectly with the competition's ethics and data protection requirements.

---

## 6. Preliminary Submission Requirements

| Requirement | Niro Status | Action Needed |
|---|---|---|
| **3-minute structured video pitch** | ⚠️ Currently planned for ICADHI at 90s. BuildFest wants 180s with specific segments (see below) | Create new 180s video following BuildFest format |
| **Clear problem and user definition** | ✅ Already documented in `PROJECT.md` §2-3 | Extract key points for 1-page summary |
| **AI-native approach (LLM / RAG / Graph / ML)** | ⚠️ LLM yes. RAG/Graph — no | Must add RAG/Graph before submission |
| **Basic system flow (input → AI → output)** | ✅ Upload → AI analyze → Bangla explanation → doctor verification | Document clearly in architecture diagram |
| **Initial demo/prototype** | ✅ Feature-complete working system | Record demo walkthrough |
| **Consideration for Bangla/localization** | ✅✅ Bangla-first throughout | Highlight in submission |
| **Defined potential impact (KPIs)** | ⚠️ Need to articulate measurable KPIs | Define and present projections |
| **1-page structured project summary** | ⚠️ Need to create | Create from PROJECT.md + DESIGN.md |

### 180-Second Video Structure (BuildFest Format)

| Time | Segment | Niro Content |
|---|---|---|
| 0:00-0:30 | Problem (The Vibe) | "Every Bangladeshi has held an illegible prescription they can't read. Every lab report is numbers without meaning. Getting a second opinion costs Tk 1500 + half a day. 170 million people carry plastic bags of crumpled medical records." |
| 0:30-1:00 | Solution | "Niro — Bangladesh's first patient-owned medical record. AI explains every prescription and report in Bangla. On-demand doctor verification from Tk 200. Offline chamber integration for real doctors." |
| 1:00-2:00 | Demo / Concept Flow | Show: upload prescription → AI Bangla analysis → red flags → history cross-reference → request verification → doctor review → chamber QR flow → consent UI → access log |
| 2:00-2:30 | AI Approach | "Multimodal vision LLM extracts structured data from handwritten prescriptions. History-aware context cross-references past visits. RAG over DGDA drug formulary for interaction checking. Policy linter enforces AI never gives medical advice — only explains and flags." |
| 2:30-3:00 | Impact & Next Step | "5-minute doctor reviews instead of 30. Tk 200 second opinions. Portable medical history. Patient-owned data with audit trail. Scaling to India, Pakistan, Nigeria — any emerging market with the same pain points." |

---

## 7. VCP (Vibe Coding to Production) — Separate Competition

The VCP is an **individual** challenge where you build an app in **60 minutes using max 5 prompts** with Lovable or Cursor. This is separate from the main event.

| VCP Aspect | Niro Relevance |
|---|---|
| 5-prompt limit | ❌ Niro was built over multiple days with many iterations — not a 5-prompt vibe-code product |
| Lovable primary tool | ❌ Niro uses traditional stack (FastAPI + Next.js). **Using non-Lovable tools loses 5 points** |
| Individual competition | Can participate separately as an individual, but would need to vibe-code a NEW application, not present Niro |
| 60-minute live execution | ❌ Niro cannot be built in 60 minutes |

**VCP recommendation:** Skip it or treat it as a completely separate exercise. Niro cannot be submitted for VCP. If interested, practice rapid prompting with Lovable to build a small health-related tool during the event.

---

## 8. Competition-Specific Requirements

### 8.1 Team Composition

BuildFest prescribes 3-5 member teams with specific roles:

| Required Role | Niro Current | Gap |
|---|---|---|
| Team Leader / Project Coordinator | ✅ kawsher-hridoy | — |
| Business Analyst / Data Scientist | ❌ Missing | Need someone for KPIs, data strategy, user validation |
| UI/UX / Frontend Developer | ⚠️ kawsher-hridoy (wearing multiple hats) | Could benefit from dedicated frontend person |
| Backend / Database / Scraper Engineer | ⚠️ kawsher-hridoy (wearing multiple hats) | Could benefit from dedicated scraper/data person |
| Presentation / Communication Lead | ❌ Missing | Need someone for demo storytelling, pitch, documentation |

**Women participation:** BuildFest encourages "at least one female participant per team" — currently 0.
**Polytechnic/Madrasah participation:** Encouraged — currently none.
**NRB participation:** Explicitly scored — currently none.

### 8.2 Build Methodology

BuildFest expects teams to operate like "AI-native startups":

| Expected Practice | Niro Current | Alignment |
|---|---|---|
| Architecture design via Cursor/Claude Code MD files | ✅ `DESIGN.md` + `CLAUDE.md` + `docs/` structure | Aligned |
| Prompt-driven development via Lovable | ❌ Not used | Misaligned |
| RAG + GraphDB for real context | ❌ Not built | Misaligned |
| Scrapers/parsers for real data | ❌ Not built | Misaligned |
| Cloud + modular APIs | ⚠️ Modular but not cloud-deployed | Partially aligned |

### 8.3 Submission Deadline

| Phase | Deadline | Niro Status |
|---|---|---|
| Phase 1 — Open Registration | Open now | Need to register at https://cloudcampbd.com/the-infinity-ai-buildfest |
| Phase 2 — Preliminary Submission | **May 30, 2026** | Must submit 3-min video + 1-page summary by this date |
| Phase 3 — Physical BuildFest | June 12, 2026 (BRAC University, Dhaka) | If selected from Top 200 |

---

## 9. Comparison with BuildFest HealthTech Example (MaaCare AI)

The BuildFest document provides an example winning solution for Track 3: **MaaCare AI — Maternal Health Companion**.

| Dimension | MaaCare AI (Example) | Niro | Niro Advantage | Niro Gap |
|---|---|---|---|---|
| Focus | Maternal health companion | General medical record + AI analysis | Broader user base (not limited to pregnant women) | Not maternal-specific |
| Safety-first | WHO/DGHS knowledge graph + explainable outputs | Policy linter + confidence threshold + banned phrases | Deeper enforcement (code-level, not just guidelines) | No WHO/DGHS knowledge graph |
| Offline-first | Local LLM + SMS/IVR fallback | Chamber QR flow (offline-capable) | Real offline use case (chamber visit) | No local LLM, no SMS/IVR |
| Risk engine | Early warnings (anemia, hypertension) | Red-flag detection from prescriptions/lab reports | Works on any medical document, not just pregnancy | No predictive ML model |
| Health worker copilot | Triage + visit summaries | Doctor verification + case summaries | Full async verification flow (paid, SLA-bound) | No triage for health workers |
| Stack | Lovable + Cursor + Med-LLMs + Local LLM + GraphRAG + Secure backend + Scrapers | FastAPI + Next.js + Azure OpenAI + Postgres + Local blobs | Production-grade system, not a prototype | No Lovable, no GraphRAG, no Local LLM, no scrapers |

**Key insight:** Niro is architecturally more mature (working system vs. example concept), but the example solution's stack aligns better with BuildFest's mandatory requirements. Niro needs to bridge this gap.

---

## 10. Priority Action Plan

### Before May 30 (Preliminary Submission)

| Priority | Action | Effort | Impact | Deadline |
|---|---|---|---|---|
| **P0** | Build basic RAG pipeline (pgvector + DGDA drug formulary embeddings + drug interaction retrieval) | 1-2 days | Addresses 2 mandatory requirements (RAG + Graph) | May 28 |
| **P0** | Add at least one scraper (DGHS guidelines HTML parser or BMDC registry lookup) | 1 day | Addresses mandatory "real-world data" requirement | May 28 |
| **P0** | Register team at BuildFest portal | 1 hour | Required to submit | May 25 |
| **P1** | Recruit 2-3 team members + find NRB advisor | Social effort | Addresses team composition + NRB scoring (10% weight) | May 27 |
| **P1** | Create 3-minute BuildFest-format video (180s) | 1 day | Required for preliminary submission | May 29 |
| **P1** | Create 1-page structured project summary | 0.5 day | Required for preliminary submission | May 29 |
| **P2** | Define measurable KPIs and impact projections | 0.5 day | Strengthens Impact scoring | May 29 |

### Before June 12 (Physical BuildFest — If Selected)

| Priority | Action | Effort | Impact |
|---|---|---|---|
| **P1** | Deploy to VPS (Caddy + systemd) | 1 day | Addresses "cloud-ready" and "scalability" scoring |
| **P2** | Add pytest tests for AI provider + consent guard | 1 day | Strengthens Technical Execution scoring |
| **P2** | Articulate global scaling story | 0.5 day | Strengthens Business Model + Global Readiness |
| **P2** | Consider adding a Neo4j/GraphDB layer for drug interactions or patient timeline | 1-2 days | Fully addresses Graph-based reasoning requirement |
| **P3** | Add local LLM fallback (Ollama) for offline capability | 1 day | Strengthens "offline resilience" narrative |
| **P3** | Prepare 4-minute demo presentation | 1 day | Required for live judging |

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fail preliminary selection due to missing RAG/Graph | High | Critical | Build RAG pipeline before May 30 |
| Score low on Scalability due to no NRB | High | Moderate | Find even a remote NRB advisor — any counts |
| Judges see Niro as "just an LLM wrapper" without RAG | High | Critical | RAG + knowledge graph is the answer |
| Solo team looks uncompetitive vs 5-person teams | Medium | Moderate | Recruit team members even if late |
| No Lovable stack hurts VCP scoring | Low | Low | VCP is separate; main event doesn't require Lovable per se |
| Timeline conflict with ICADHI (27 May video vs 30 May BuildFest submission) | Medium | Moderate | ICADHI video can be repurposed for BuildFest with minor edits |
| BuildFest is June 12; ICADHI demo is June 15 | Low | Low | Manageable — 3-day gap, both in Dhaka |

---

## 12. Final Verdict

### Does Niro qualify? **YES**

Niro fits squarely under Track 3 (HealthTech) and addresses real problems for Bangladesh's healthcare system. The ethical AI safeguards, Bangla-first design, and offline chamber integration are genuinely competitive differentiators.

### Will Niro win? **Not without fixing the gaps.**

The 3 mandatory requirement failures (no RAG/Graph, no scrapers, no Lovable stack) are disqualifying at the "Top 200 selection" stage if other teams demonstrate these capabilities. Niro's ethical AI depth and production-grade system are strong enough to compensate partially, but the missing knowledge layer is too fundamental to ignore in a competition that explicitly demands "RAG + Graph-based reasoning."

### What would make Niro a top contender?

1. **RAG over DGDA drug formulary** — even a basic implementation would transform the AI from "LLM reads image" to "LLM reads image + cross-references real medical knowledge"
2. **3-5 person team with NRB member** — unlocks the Scalability scoring dimension
3. **Measurable KPIs** — even projected ones with baseline data would strengthen Impact scoring
4. **Cloud deployment** — one day of work that shifts "demo-only" to "deployable system" in judges' eyes

With these 4 fixes, Niro could score **80-88/100** — competitive for the BDT 50,000 winner prize.

---

*Analysis generated by GLM-5.1 via opencode — 24 May 2026*
