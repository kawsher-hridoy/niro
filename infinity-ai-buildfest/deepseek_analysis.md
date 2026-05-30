# Niro → THE INFINITY AI BUILDFEST 2026 — Qualification Analysis

> Generated 24 May 2026. Analysis of Niro (IEEE ICADHI 2026 submission) against
> THE INFINITY AI BUILDFEST 2026, Track 3 — Healthcare (HealthTech).

---

## 1. Executive Summary

**Verdict: Niro qualifies for Track 3, Challenge 6 — Custom HealthTech (Showcase).**

Niro is a strong conceptual fit with exceptional ethical AI safeguards, genuine
Bangla-first design, and a novel combination of patient-owned EMR + AI document
analysis + doctor verification + offline chamber integration. No competing BD
product combines these features.

However, significant gaps exist in **team composition** (solo builder vs 3-5
required), **mandatory stack tooling** (missing 4 of 7 required items), and
**logistics** (no BuildFest-format video, not deployed to VPS, not registered).
The May 30 preliminary submission deadline gives 6 days to close these gaps.

---

## 2. Competition Overview

| Aspect | Detail |
|---|---|
| **Event** | THE INFINITY AI BUILDFEST 2026 |
| **Organizer** | CloudCamp Bangladesh, Co-Host: BRAC University |
| **Date** | Friday, 12 June 2026, 7:00 AM – 8:00 PM |
| **Venue** | BRAC University, Dhaka |
| **Prelim Deadline** | May 30, 2026 |
| **Team Size** | 3–5 members |
| **Tracks** | EdTech, MarTech, HealthTech, E-Commerce, InfoTech |
| **Prize** | Winner: BDT 50,000; Runner-Up: BDT 30,000; VCP: BDT 10,000 × 5 |

---

## 3. Track 3 — Healthcare (HealthTech) Requirements

### 3.1 Track Definition

> Strategic Theme: Accessible, ethical AI-enabled care.
> Core Focus Areas: Maternal companions, AI triage, Preventive systems, Rural telehealth, Risk prediction.

### 3.2 Required Elements

| Requirement | Niro Status |
|---|---|
| Ethical safeguards | ✅ Strongest asset — `policy.py` banned-phrase linter, confidence scoring, audit log, ConsentGuard |
| Clinical validation logic | ✅ Confidence per claim, doctor agree/disagree on AI output, BMDC verification |
| Offline resilience | ⚠️ Partial — chamber QR works offline but AI analysis requires connectivity; no local LLM |
| Data protection compliance | ✅ DPA 2023, granular consent, audit log, delete/export rights |

### 3.3 Technical Expectations

| Expectation | Niro Status |
|---|---|
| Predictive risk modeling | ❌ Not a feature (red flags are document-level, not predictive) |
| Knowledge graph integration | ❌ No GraphDB; pgvector planned for RAG (deferred to Phase F) |
| Secure backend | ✅ FastAPI, JWT, PHI encryption markings, HTTPS everywhere |
| Human-in-loop interface | ✅ Doctor verification flow (agree/concerns/escalate), AI case summaries |

### 3.4 Challenge Fit

Niro best matches **Challenge 6 — Custom HealthTech (Showcase)**. It does not
fit the pre-defined maternal health, nutrition, or telehealth challenges.

---

## 4. Detailed Gap Analysis

### 4.1 ✅ What Niro Excels At (Competitive Advantages)

#### Ethical AI Safeguards (Best-in-Class)
- `backend/ai/policy.py` — banned-phrase linter with 10 regex patterns in Bangla + English
- AI **never** gives final medical advice — only extracts, explains, flags
- Confidence scoring per claim; < 0.5 auto-recommends human review
- Every AI call audit-logged: model, version, prompt SHA256, output SHA256, confidence, timestamp
- `ConsentGuard` enforces doctor-side data reads — no SQL bypass possible
- DPA 2023 compliance: patient can delete all data (`DELETE /me`); export all data

#### Bangla-First Design (Not an Afterthought)
- Default UI language is Bangla; English deferred to Phase F
- Bangla numerals via `lib/i18n.ts toBangla()` (২৪৫, not 245)
- AI prompts in versioned Bangla (`rx-bn-v1.0`, `lab-bn-v1.0`, `case-bn-v1.0`)
- Noto Sans Bengali font with OpenType ligature features
- Body copy, UI labels, error messages, empty states — all Bangla

#### Innovation & White Space
- Patient-owned portable EMR — no one in Bangladesh does this
- AI-prepared case summary enabling 5-minute doctor reviews (the actual innovation)
- Online + offline chamber hybrid (90% of BD care happens in offline chambers)
- Verified-consult-only reviews (anti-fraud)
- Granular, time-bound consent with patient-visible audit log

#### Real-World Impact
- Addresses 6 stacked daily pain points for ~170M people
- Chamber QR flow: doctor loads patient history in 30 seconds (saves 5 min/patient)
- PDF export for non-platform doctors (growth vector)
- Tiered pricing: Tk 200 / 400 / 800 by doctor experience

#### Business Model
- Patient subscription: Tk 50/month or Tk 500/year
- Doctor async review: Tk 200/400/800, platform takes ~30%
- Doctor onboarding (read access): Free — fills directory fast
- Future: pharmacy affiliate commissions, insurance partnerships

#### Architecture & Engineering
- 45 API endpoints, 14 DB models, 4 AI modules, 4 services
- Provider abstraction — swap Azure → Claude/Gemini via one env var
- Sync SQLAlchemy 2.0 (D-008), argon2-cffi passwords (D-012)
- Structured logging (structlog), no PHI in logs
- Docker Compose dev environment, `niro.sh` control script

---

### 4.2 ❌ Critical Gaps

#### GAP 1: Team Composition (Severity: HIGH)

| Requirement | Status |
|---|---|
| 3–5 team members | ❌ Solo builder (kawsher-hridoy) |
| NRB collaborator encouraged | ❌ No NRB member |
| Women participation encouraged | ❌ No women on team |
| Polytechnic/madrasah inclusion | ❌ N/A |
| Cross-institution team | ❌ Solo |

**Impact:** Cannot enter without at least 3 members. NRB collaboration scores
points on the Scalability criterion (10% of total score).

**Mitigation:** Recruit 2–4 teammates before May 30. Ideal composition:
- 1 NRB professional (architecture advisor / global compliance)
- 1 female team member (technical or business role)
- 1 domain expert (medical student, public health background)
- 1 frontend or backend engineer

---

#### GAP 2: Mandatory Stack — 4 of 7 Items Missing (Severity: HIGH)

BuildFest requires: **Lovable + Cursor/Claude Code + LLM + Local LLM + RAG + GraphDB + Scraper**

| Stack Item | Niro Has? | Gap |
|---|---|---|
| Lovable | ❌ | Hand-built Next.js 16 + Tailwind 4. No prompt-driven UI. |
| Cursor/Claude Code | ✅ | Used throughout development |
| LLM | ✅ | Azure OpenAI `gpt-chat-latest` (provider-abstracted) |
| Local LLM | ❌ | No Ollama or offline AI fallback |
| RAG | ⚠️ | pgvector planned for DGDA formulary but **deferred to Phase F** |
| GraphDB | ❌ | No knowledge graph (Neo4j, Kuzu, etc.) |
| Scraper | ❌ | No real-world data ingestion pipelines |

**Impact:** Missing Lovable costs 5 points explicitly. Missing Local LLM, GraphDB,
and Scraper weakens Technical Execution (20%) score.

**Mitigation options:**
- **GraphDB:** Add Kuzu (embedded, no server) or Neo4j for BMDC registry + drug
  formulary as knowledge graph. 1–2 days of work.
- **Local LLM:** Add Ollama + a small Bangla-capable model (e.g., Llama 3) for
  offline fallback. Demo readiness in 1 day.
- **Scraper:** Add a BMDC public registry scraper for live doctor verification
  (Phase F2 work, already planned). 1 day.
- **Lovable:** Either rebuild UI in Lovable (major rework — 3-5 days) OR accept
  the 5-point penalty and argue hand-built Next.js 16 is more production-grade.
  Given the 6-day window, accepting the penalty is more realistic.
- **RAG:** Implement the pgvector RAG over DGDA formulary (Phase F work pulled
  forward). 1–2 days.

---

#### GAP 3: Production Deployment (Severity: MEDIUM)

| Requirement | Status |
|---|---|
| Live demo URL | ❌ Local dev only |
| Cloud-native deployment | ❌ Planned for Phase F4 (post-30 May) |
| VPS with Caddy + systemd | ❌ Not provisioned |

**Impact:** Cannot show a live URL in the preliminary submission. Judges expect
a working system, not localhost.

**Mitigation:** Deploy to a Hetzner/DigitalOcean VPS. The `niro.sh` script
already handles process management. Caddy for TLS. 1 day of work.

---

#### GAP 4: Preliminary Submission Materials (Severity: MEDIUM)

| Requirement | Niro Has? |
|---|---|
| 3-minute video (180s) | ❌ ICADHI video is 90s, different format |
| Structured 1-page summary | ❌ Not prepared |
| BuildFest pitch breakdown | ❌ Different structure from ICADHI |

**BuildFest video structure (required):**
| Time | Segment | Content |
|---|---|---|
| 0:00–0:30 | Problem | Define problem, users, urgency (BD + global) |
| 0:30–1:00 | Solution | AI-driven solution, differentiation |
| 1:00–2:00 | Demo / Concept | Prototype walkthrough, system flow |
| 2:00–2:30 | AI Approach | Models, RAG, data, personalization, tools |
| 2:30–3:00 | Impact & Next | Value, potential users, what comes next |

**Mitigation:** Extend the ICADHI 90s video to 180s with the additional AI approach
deep-dive and impact sections. Re-record with BuildFest-specific framing.

---

#### GAP 5: Specific HealthTrack Features (Severity: LOW-MEDIUM)

| Feature | Status |
|---|---|
| Predictive risk modeling | ❌ Niro analyzes documents, doesn't predict outcomes |
| Maternal health focus | ❌ General-purpose, not maternal-specific |
| Nutrition engine | ❌ Not a feature |
| Telehealth (live video) | ❌ Out of scope (async review only) |

**Mitigation:** Frame Niro as **Custom HealthTech (Challenge 6)** which allows
self-defined solutions. The judges will evaluate it on HealthTech criteria
broadly, not on maternal-specific features.

---

### 4.3 Scoring Estimate (100-point scale)

| Criterion | Weight | Niro Estimate | Rationale |
|---|---|---|---|
| **Innovation** | 20% | 17–19 / 20 | Patient-owned EMR + AI + chamber integration is genuinely novel in BD |
| **Technical Execution** | 20% | 10–14 / 20 | Strong backend but missing GraphDB, Local LLM, Scraper, Lovable drags down score |
| **Business Model + Global Readiness** | 20% | 16–18 / 20 | Clear pricing tiers, cross-border applicability; solo limits NRB dimension |
| **Real-World Impact + Ethics** | 20% | 18–20 / 20 | **Killer category:** audit log, consent, policy linter, DPA, Bangla-first, 170M reach |
| **Scalability + NRB** | 10% | 3–5 / 10 | No NRB, local dev, missing offline AI; needs closure |
| **Presentation** | 10% | 7–8 / 10 | ICADHI pitch experience helps; needs BuildFest format |
| **Estimated Total** | **100%** | **~71–84 / 100** | Competitive if gaps closed; mid-tier if not |

---

## 5. Code of Conduct / Ethics Alignment

Niro is exceptionally well-aligned with the BuildFest Code of Conduct:

| CoC Requirement | Niro Compliance |
|---|---|
| Original work (Section 4) | ✅ All code original, solo-built |
| AI usage explained & documented (Section 4) | ✅ Every AI call audit-logged; prompts versioned; policy linter enforced |
| Responsible AI (Section 5) | ✅ AI never gives final medical advice; banned-phrase linter; confidence scoring |
| No bias/discrimination (Section 5) | ✅ Bangla-first, accessible to all literacy levels |
| Extra caution for HealthTech (Section 5) | ✅ `policy.py` explicitly enforces safety; DPA 2023 compliance |
| Data protection (Section 6) | ✅ PHI encrypted, granular consent, delete/export rights |
| IP ownership (Section 7) | ✅ Solo builder retains full IP |
| NRB transparency (Section 8) | ⚠️ No NRB collaborator yet — must document if added |

**Outcome:** Niro would pass the CoC review cleanly. The ethical AI safeguards
are its strongest differentiator against other HealthTech entries.

---

## 6. Timeline Feasibility (6 Days to May 30)

| Day | Action | Time Required |
|---|---|---|
| May 24 (today) | Register on BuildFest portal; begin team recruitment | 1–2 hours |
| May 24–26 | Recruit 2–4 teammates (NRB + woman + domain expert) | Ongoing |
| May 25–26 | Add GraphDB (Kuzu/Neo4j) for BMDC + formulary knowledge graph | 1–2 days |
| May 26–27 | Add Ollama local LLM for offline fallback | 1 day |
| May 27 | **ICADHI video submission deadline** | Full day |
| May 28 | Add scraper for BMDC registry / public health data | 1 day |
| May 28–29 | Deploy to VPS (Hetzner/DO); get live demo URL | 1 day |
| May 29 | Record BuildFest 3-minute video | Half day |
| May 29–30 | Write 1-page structured summary; finalize submission | Half day |
| May 30 | **BuildFest preliminary submission deadline** | Submit |

**Assessment:** Tight but possible if ICADHI work is substantially complete by
May 27 and team recruitment succeeds quickly. The biggest risk is finding
qualified teammates on short notice.

---

## 7. ICADHI vs BuildFest Comparison

| Dimension | ICADHI 2026 | BuildFest 2026 |
|---|---|---|
| **Organizer** | IEEE | CloudCamp BD + BRAC University |
| **Date** | 15 June (final) | 12 June |
| **Format** | Video submission → live demo | Physical event at BRACU |
| **Video** | 90 seconds | 180 seconds |
| **Team** | Any size | 3–5 members |
| **Prize** | Recognition + showcase | BDT 50,000 (winner) |
| **Niro Fit** | Track 1 (Telemedicine) | Track 3 (HealthTech) |
| **Status** | ✅ Registered, Phase 1 complete | ❌ Not registered |

Both are viable. ICADHI carries academic prestige; BuildFest carries cash + local
ecosystem connections. The timelines overlap — ICADHI video due May 27, BuildFest
prelim due May 30. Doing both requires May 27–30 to be BuildFest-focused.

---

## 8. Recommendations

### If Submitting to BuildFest:

1. **Team Formation (P0):** Recruit at least 2 members immediately. Target:
   - 1 NRB professional via LinkedIn / Facebook BD tech groups
   - 1 female medical student or public health student from a BD university
   - 1 additional engineer (frontend or backend)

2. **Stack Gap Closure (P1):**
   - Add Kuzu embedded GraphDB for BMDC registry knowledge graph
   - Add Ollama for offline fallback demo
   - Add BMDC registry scraper
   - Accept the 5-point Lovable penalty (not worth rebuilding UI in 6 days)

3. **Deploy (P1):** Ship to a VPS for live demo URL. Use the existing `niro.sh`
   scripts and Caddy setup from the Phase F4 plan.

4. **Video (P2):** After ICADHI submission on May 27, re-record a 180-second
   BuildFest-format video emphasizing AI approach depth and global scalability.

5. **Register (P0):** Register at https://cloudcampbd.com/the-infinity-ai-buildfest
   immediately.

### If Not Submitting:

Focus entirely on ICADHI. Niro is already registered and Phase-1 complete for
ICADHI. BuildFest can be revisited in 2027 or for a future iteration. The
ICADHI shortlist result (May 30) determines whether Phase F polish is needed
for the June 15 live demo.

---

## 9. Conclusion

Niro is a **strong HealthTech entry** that would stand out on ethical AI compliance
and real-world impact — two categories worth 40% of the total score. The technical
gaps (GraphDB, Local LLM, Scraper) are 3–4 days of additive work, not rewrites.
The team composition gap is the hard constraint.

**Recommendation:** Register now, attempt team recruitment May 24–26. If you
have 3+ confirmed members by May 26, proceed with stack additions May 26–29
and submit. If team recruitment fails, focus on ICADHI and consider BuildFest
a missed opportunity for 2026.