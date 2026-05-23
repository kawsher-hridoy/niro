"""Seed 6 BMDC-verified doctors for Phase 1 demo.

Idempotent: re-running won't duplicate.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone

from sqlalchemy import select

from backend.db.models import DoctorProfile, User
from backend.db.session import SessionLocal


# Specialties keep to short snake-case slugs; UI maps to Bangla labels.
_DOCTORS = [
    {
        "phone": "+88017000DOCTR1",
        "full_name": "Dr. Mahmudul Hasan",
        "bmdc_number": "BMDC-78421",
        "qualifications": [
            {"degree": "MBBS", "year": 2008, "institution": "Dhaka Medical College"},
            {"degree": "FCPS (Medicine)", "year": 2014, "institution": "BCPS"},
        ],
        "specialties": ["diabetes", "medicine", "hypertension"],
        "fee_tier": 2,
        "chambers": [
            {"name": "Popular Diagnostic Centre, Dhanmondi", "address": "House 16, Road 2, Dhanmondi", "hours": "6 PM - 9 PM (Sat-Thu)"}
        ],
        "bio": "ডায়াবেটিস ও সাধারণ চিকিৎসায় ১৫+ বছরের অভিজ্ঞতা।",
    },
    {
        "phone": "+88017000DOCTR2",
        "full_name": "Dr. Bijoy Sengupta",
        "bmdc_number": "BMDC-92344",
        "qualifications": [
            {"degree": "MBBS", "year": 2015, "institution": "Sir Salimullah Medical College"}
        ],
        "specialties": ["medicine", "fever", "general"],
        "fee_tier": 1,
        "chambers": [
            {"name": "Niro Demo Chamber", "address": "Online", "hours": "Async"}
        ],
        "bio": "তরুণ MBBS — দ্রুত async review-এ পারদর্শী।",
    },
    {
        "phone": "+88017000DOCTR3",
        "full_name": "Dr. Farzana Rahman",
        "bmdc_number": "BMDC-65120",
        "qualifications": [
            {"degree": "MBBS", "year": 2010, "institution": "Chittagong Medical College"},
            {"degree": "FCPS (Ophthalmology)", "year": 2016, "institution": "BCPS"},
        ],
        "specialties": ["eye", "ophthalmology"],
        "fee_tier": 2,
        "chambers": [
            {"name": "Ispahani Islamia Eye Hospital", "address": "Farmgate, Dhaka", "hours": "5 PM - 8 PM (Sun-Wed)"}
        ],
        "bio": "চোখের রোগ ও দৃষ্টিশক্তি বিশেষজ্ঞ।",
    },
    {
        "phone": "+88017000DOCTR4",
        "full_name": "Dr. Tariq Aziz",
        "bmdc_number": "BMDC-44910",
        "qualifications": [
            {"degree": "MBBS", "year": 2000, "institution": "Dhaka Medical College"},
            {"degree": "MD (Cardiology)", "year": 2008, "institution": "BSMMU"},
            {"degree": "FRCP (Edin)", "year": 2015, "institution": "RCPE"},
        ],
        "specialties": ["cardiology", "heart", "hypertension"],
        "fee_tier": 3,
        "chambers": [
            {"name": "Square Hospital", "address": "West Panthapath, Dhaka", "hours": "By appointment"}
        ],
        "bio": "সিনিয়র কনসালট্যান্ট, হৃদরোগ। ২৫ বছরের অভিজ্ঞতা।",
    },
    {
        "phone": "+88017000DOCTR5",
        "full_name": "Dr. Sumaiya Akter",
        "bmdc_number": "BMDC-71203",
        "qualifications": [
            {"degree": "MBBS", "year": 2011, "institution": "Sylhet MAG Osmani Medical College"},
            {"degree": "DCH", "year": 2016, "institution": "BIRDEM"},
        ],
        "specialties": ["pediatrics", "child"],
        "fee_tier": 2,
        "chambers": [
            {"name": "Niro Demo Chamber", "address": "Sylhet", "hours": "4 PM - 7 PM"}
        ],
        "bio": "শিশু রোগ ও টিকা বিশেষজ্ঞ।",
    },
    {
        "phone": "+88017000DOCTR6",
        "full_name": "Dr. Rashed Khan",
        "bmdc_number": "BMDC-88012",
        "qualifications": [
            {"degree": "MBBS", "year": 2013, "institution": "Rajshahi Medical College"},
            {"degree": "DLO", "year": 2017, "institution": "BICH"},
        ],
        "specialties": ["ent", "throat", "nose", "ear"],
        "fee_tier": 1,
        "chambers": [
            {"name": "Niro Demo Chamber", "address": "Rajshahi", "hours": "6 PM - 9 PM"}
        ],
        "bio": "ENT (নাক-কান-গলা) বিশেষজ্ঞ।",
    },
]


def run() -> None:
    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        for d in _DOCTORS:
            existing = db.execute(
                select(User).where(User.phone == d["phone"])
            ).scalars().first()
            if existing:
                skipped += 1
                continue
            user = User(
                role="doctor",
                phone=d["phone"],
                full_name=d["full_name"],
                language="bn",
                last_login_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.flush()
            db.add(
                DoctorProfile(
                    user_id=user.id,
                    bmdc_number=d["bmdc_number"],
                    qualifications=d["qualifications"],
                    specialties=d["specialties"],
                    fee_tier=d["fee_tier"],
                    chambers=d["chambers"],
                    verified=True,
                    bio=d["bio"],
                )
            )
            created += 1
        db.commit()
        print(f"Seeded doctors. created={created}, skipped={skipped}")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
