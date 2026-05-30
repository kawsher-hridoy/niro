"""Seed initial documentation content for /docs module."""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.db.models import DocsSection, DocsTeamMember
from backend.db.session import SessionLocal


def seed_docs_content():
    """Populate initial documentation sections."""
    db = SessionLocal()

    try:
        # Check if sections already exist
        existing = db.query(DocsSection).first()
        if existing:
            print("Documentation sections already seeded. Skipping.")
            return

        sections = [
            # YC-Style Pitch Deck Sections
            DocsSection(
                section_key="problem",
                title="The Problem",
                content="""Every Bangladeshi has lived these pain points:

1. **Illegible prescriptions.** Handwritten chits, English jargon, Latin abbreviations. Patients literally cannot read what they were told to take.

2. **Incomprehensible lab reports.** Numbers and reference ranges with no explanation. Patients Google → panic → either over-treat or ignore.

3. **No second opinion.** A real second opinion costs **Tk 800–2000** + travel + half a day. So most people just trust the first doctor or take advice from a relative.

4. **No portable history.** Patients carry plastic bags of crumpled old reports to every visit. Half get lost. The doctor has to start from zero each time.

5. **Doctor discovery is broken.** Word of mouth, Facebook ads, or roadside boards. No reliable way to find a specialist who is actually good.

6. **Doctors waste consultation time on history-taking.** 10 of 15 minutes spent asking "what medicines are you on?" instead of actually treating.""",
                order=1,
                is_published=True
            ),
            DocsSection(
                section_key="solution",
                title="Our Solution",
                content="""**Niro** is Bangladesh's first patient-owned medical record system with AI-powered document analysis.

We solve all six problems with one connected product:

- **AI Document Analyzer**: Upload prescriptions and lab reports, get instant Bangla explanations
- **Longitudinal Health Record**: Your complete medical history in one place, never lose a report again
- **On-Demand Doctor Verification**: Affordable second opinions (Tk 200-800) with AI-prepared case summaries
- **Health Metrics Tracking**: Automatic extraction and trending of lab values over time
- **Chamber QR Sessions**: Real-time profile sharing in doctor's chamber via QR code
- **Verified Doctor Directory**: Find specialists with real reviews from verified consultations
- **Granular Consent Control**: You decide who sees what, for how long
- **Complete Audit Trail**: Every doctor access is logged and visible to you""",
                order=2,
                is_published=True
            ),
            DocsSection(
                section_key="why_now",
                title="Why Now",
                content="""Three converging trends make this the perfect moment:

1. **Smartphone penetration in Bangladesh**: 50%+ of adults now have smartphones, making mobile-first healthcare viable

2. **AI breakthrough in Bangla**: Modern LLMs (GPT-4, Claude) handle Bangla natively with high quality, including medical terminology

3. **Post-COVID digital health adoption**: Patients and doctors are now comfortable with telemedicine and digital records

4. **Data Protection Act 2023**: New privacy regulations create demand for patient-controlled data systems

The technology is ready, the market is ready, and the regulatory environment supports it.""",
                order=3,
                is_published=True
            ),
            DocsSection(
                section_key="market",
                title="Market Opportunity",
                content="""**Target Market**: 170 million Bangladeshis

**Serviceable Market**:
- 50M smartphone users
- 30M+ who visit doctors annually
- 10M+ who get lab tests regularly

**Initial Beachhead**: Urban middle class (5M households)
- Can afford Tk 50/month subscription
- Already use digital services
- High health awareness

**Market Size**:
- Patient subscriptions: 5M × Tk 600/year = **Tk 3B/year** ($25M)
- Doctor verification fees: 2M reviews/year × Tk 300 avg = **Tk 600M/year** ($5M)
- Total addressable: **$30M+/year** in Bangladesh alone

**Regional Expansion**: India (1.4B), Pakistan (240M), similar pain points""",
                order=4,
                is_published=True
            ),
            DocsSection(
                section_key="business_model",
                title="Business Model",
                content="""**Revenue Streams**:

1. **Patient Subscription**: Tk 50/month or Tk 500/year
   - Unlimited AI analysis
   - Unlimited document storage
   - Health metrics tracking
   - Chamber QR access

2. **Doctor Verification**: Tk 200-800 per review (platform takes 30%)
   - Tiered pricing by doctor experience
   - AI-prepared case summaries reduce doctor time
   - 5-minute reviews instead of 30 minutes

3. **Doctor Onboarding**: FREE
   - Massive incentive — saves 5 min per patient
   - Fills directory fast
   - Network effects

4. **Future Revenue**:
   - Pharmacy partnerships (affiliate commission)
   - Insurance partnerships (premium subscriptions)
   - Enterprise (hospitals, clinics)

**Unit Economics** (at scale):
- CAC: Tk 200 (digital ads)
- LTV: Tk 3,000 (5 years × Tk 600/year)
- LTV/CAC: 15x""",
                order=5,
                is_published=True
            ),
            DocsSection(
                section_key="traction",
                title="Traction",
                content="""**Current Status** (as of May 2026):

- ✅ **MVP Built**: Full-stack application live at nirobd.tech
- ✅ **AI Integration**: Azure OpenAI vision + Bangla generation working
- ✅ **6 Verified Doctors**: Seeded across specialties
- ✅ **ICADHI 2026**: Submitted to IEEE Project Showcase Track 1

**Live System Metrics** (updated in real-time):

*See the "Live Statistics" section below for current numbers*

**Next Milestones**:
- June 10-14: ICADHI judging window
- June 15: Live demo (if shortlisted)
- July 2026: Private beta with 100 patients
- August 2026: Public launch""",
                order=6,
                is_published=True
            ),
            DocsSection(
                section_key="competition",
                title="Competition",
                content="""| Player | What they do | What they don't |
|---|---|---|
| **Praava Health** | Telemedicine + clinics + own EMR | Only inside Praava's network, no AI document analysis |
| **Daktarbhai** | Doctor consult + directory | No AI, no document parsing, unreliable reviews |
| **Tonic (Grameenphone)** | Phone telemedicine | No documents, no profile, no offline angle |
| **Arogga / MedEasy** | Prescription upload → pharmacy delivery | Just for ordering, no explanation, no second opinion |
| **Maya** | Bangla health chatbot (women's health) | Mostly inactive, no doctor verification |

**Our Unique Advantage**:

Nobody combines: AI document analysis + portable patient-owned profile + human verification + offline chamber integration + verified reviews.

The deepest moat is the **patient profile**: once the patient has 2 years of history in your app, they will not switch. That's the lock-in.""",
                order=7,
                is_published=True
            ),
            DocsSection(
                section_key="go_to_market",
                title="Go-To-Market Strategy",
                content="""**Phase 1: Doctor-Led Growth** (Months 1-6)

1. Onboard 100 verified doctors (free chamber access)
2. Doctors invite their existing patients
3. Word-of-mouth in chambers ("scan this QR")

**Phase 2: Digital Acquisition** (Months 6-12)

1. Facebook/Instagram ads targeting health-conscious urban users
2. Content marketing (Bangla health explainers)
3. Partnerships with diagnostic labs (co-marketing)

**Phase 3: Institutional** (Year 2+)

1. Hospital EMR integrations
2. Insurance partnerships
3. Corporate wellness programs

**Key Insight**: Doctors are the distribution channel. Free chamber access makes them evangelists.""",
                order=8,
                is_published=True
            ),
            DocsSection(
                section_key="vision",
                title="Vision",
                content="""**Short-term** (1 year): Be the default medical record for urban Bangladesh

**Mid-term** (3 years): Expand to India, Pakistan, Southeast Asia

**Long-term** (5+ years): The global standard for patient-owned health data

**Why we'll win**:

1. **Patient ownership**: Data belongs to the patient, not the hospital
2. **AI-first**: Every document is instantly understandable
3. **Offline-first**: Works in chambers, not just online
4. **Bangla-first**: Built for the 300M+ Bangla speakers globally

We're not building a telemedicine app. We're building the **operating system for personal health data**.""",
                order=9,
                is_published=True
            ),

            # Technical Documentation Sections
            DocsSection(
                section_key="architecture",
                title="System Architecture",
                content="""Niro is a **single-VPS, three-tier web application** with:

- **Frontend**: Next.js 16 PWA (patient + doctor + chamber flows)
- **Backend**: FastAPI (Python 3.12) with sync SQLAlchemy 2.0
- **Database**: PostgreSQL 16 with planned pgvector support
- **AI**: Azure OpenAI (gpt-chat-latest) for vision + Bangla generation
- **Storage**: Local filesystem (dev) → S3-compatible (prod)
- **Hosting**: Azure VM with Caddy reverse proxy

**Key Design Decisions**:

- Sync SQLAlchemy (not async) — AI calls dominate latency, not DB
- Browser print for PDF export — zero deps, same output
- PyMuPDF for PDF rasterization — fast, high quality (AGPL, will swap to pypdfium2)
- Consent enforced at data layer — no SQL runs without ConsentGuard check
- Append-only audit log — tamper-evident, patient-visible""",
                order=10,
                is_published=True
            ),
            DocsSection(
                section_key="security",
                title="Security & Privacy",
                content="""**Authentication**:
- JWT (HS256) with 1h access tokens, 30d refresh tokens
- Argon2id password hashing (OWASP recommended)
- Doctor device binding + biometric login

**Data Protection**:
- Encryption at rest (LUKS volume + pgcrypto for PHI columns)
- TLS 1.2+ everywhere (Caddy auto-Let's Encrypt)
- No PHI in logs (only IDs and hashes)

**Consent System**:
- Granular scopes (single document / 3 months / full history)
- Time-bound expiry (default 24h for verification, 2h for chamber)
- Every doctor view logged to patient-visible access log

**Compliance**:
- Data Protection Act 2023 (Bangladesh)
- Patient can export all data as ZIP
- Patient can delete all data (cascading FK deletes)
- BMDC verification for all doctors

**Audit Trail**:
- Append-only audit_log table
- Every AI call logged (model, prompt hash, output hash, confidence)
- Every doctor access logged (screen, document, location)
- Planned: rolling hash for tamper evidence""",
                order=11,
                is_published=True
            ),
            DocsSection(
                section_key="ai_safety",
                title="AI Safety & Ethics",
                content="""**Hard Rules**:

1. AI **never gives final medical advice** — only extracts, explains, flags
2. Every AI output includes confidence score (0-1)
3. Confidence < 0.5 triggers "recommend human review" flag
4. Post-call policy linter scans for banned phrases
5. All AI calls audited (model, prompt, output, latency)

**Banned Behaviors**:
- Imperative dosing ("আপনি X গ্রহণ করুন")
- Diagnosis ("আপনার X আছে")
- New drug recommendations
- Speculation on values not in source

**Prompt Engineering**:
- Explicit instructions to explain, not prescribe
- Bangla-first output
- Structured JSON for reliability
- History-aware context (last 3 analyses)

**Human Oversight**:
- Doctor verification available for Tk 200-800
- AI prepares case summary for doctor
- Doctor sees original document + AI analysis
- Patient sees both AI and doctor opinion

**Transparency**:
- Disclaimer on every AI output page
- Confidence badge visible
- "This is not medical advice" in Bangla
- Link to request doctor verification""",
                order=12,
                is_published=True
            ),
            DocsSection(
                section_key="roadmap",
                title="Product Roadmap",
                content="""**Phase 1 (Complete)** — MVP
- ✅ AI document analysis (Rx + Lab)
- ✅ Patient profile + timeline
- ✅ Doctor verification
- ✅ Chamber QR sessions
- ✅ Health metrics tracking
- ✅ Document chat

**Phase 2 (June-July 2026)** — Beta Launch
- [ ] Real BMDC verification API
- [ ] bKash payment integration
- [ ] SMS notifications
- [ ] Email notifications
- [ ] Dark mode
- [ ] English language toggle
- [ ] Mobile app (PWA install prompt)

**Phase 3 (Aug-Dec 2026)** — Public Launch
- [ ] RAG over DGDA drug formulary
- [ ] Drug interaction checking
- [ ] Allergy warnings
- [ ] Medication reminders
- [ ] Appointment scheduling
- [ ] Pharmacy partnerships
- [ ] Insurance integrations

**Phase 4 (2027+)** — Scale
- [ ] Hospital EMR integrations
- [ ] Wearable device sync
- [ ] Voice input (Bangla)
- [ ] Offline mode (full PWA)
- [ ] Regional expansion (India, Pakistan)
- [ ] Multi-language support""",
                order=13,
                is_published=True
            ),
        ]

        for section in sections:
            db.add(section)

        db.commit()
        print(f"✅ Seeded {len(sections)} documentation sections")

    except Exception as e:
        print(f"❌ Error seeding docs content: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def seed_team_members():
    """Populate initial team members."""
    db = SessionLocal()

    try:
        # Check if team members already exist
        existing = db.query(DocsTeamMember).first()
        if existing:
            print("Team members already seeded. Skipping.")
            return

        # Real team members
        members = [
            DocsTeamMember(
                full_name="Md Kawsher Ahmed",
                role="Team Leader / Project Coordinator / Backend Engineer",
                email="kawsher@hridoy.xyz",
                photo_url=None,
                order=1,
                is_published=True
            ),
            DocsTeamMember(
                full_name="Sadia 627",
                role="Business Analyst / Data Scientist",
                email="sadia627@example.com",
                photo_url=None,
                order=2,
                is_published=True
            ),
            DocsTeamMember(
                full_name="Shafiur Rahman",
                role="UI/UX / Frontend Developer",
                email="shafiur.rahman@example.com",
                photo_url=None,
                order=3,
                is_published=True
            ),
            DocsTeamMember(
                full_name="Abdullah Al Khalil",
                role="Presentation / Communication Lead",
                email="abdullah.khalil@example.com",
                photo_url=None,
                order=4,
                is_published=True
            ),
            DocsTeamMember(
                full_name="Abu Fahad Biddut",
                role="Presentation / Communication Lead",
                email="abu.biddut@example.com",
                photo_url=None,
                order=5,
                is_published=True
            ),
            DocsTeamMember(
                full_name="Niloy Das",
                role="Business Analyst / Data Scientist",
                email="niloy.das@example.com",
                photo_url=None,
                order=6,
                is_published=True
            ),
        ]

        for member in members:
            db.add(member)

        db.commit()
        print(f"✅ Seeded {len(members)} team members")

    except Exception as e:
        print(f"❌ Error seeding team members: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Seeding documentation content...")
    seed_docs_content()
    seed_team_members()
    print("✅ Documentation seeding complete!")
