"""Public doctor directory + search + reviews."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.db.models import DoctorProfile, DoctorReview, User, VerificationReview
from backend.db.session import get_db
from backend.services.auth import current_user, require_patient


router = APIRouter(prefix="/doctors", tags=["doctors"])


class DoctorCard(BaseModel):
    id: str
    full_name: str
    bmdc_number: str
    specialties: list[str]
    fee_tier: int
    fee_bdt: int
    chambers: list[dict]
    verified: bool
    rating_avg: float | None = None
    rating_count: int = 0


class DoctorReviewOut(BaseModel):
    id: str
    rating: int
    text: str | None
    submitted_at: str
    patient_name: str


class DoctorProfileOut(DoctorCard):
    qualifications: list[dict] = []
    bio: str | None = None
    photo_url: str | None = None
    reviews: list[DoctorReviewOut] = []


_FEE_BY_TIER = {1: 200, 2: 400, 3: 800}


@router.get("", response_model=list[DoctorCard])
def list_doctors(
    specialty: str | None = Query(None),
    fee_tier: int | None = Query(None, ge=1, le=3),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(current_user),
) -> list[DoctorCard]:
    stmt = (
        select(User, DoctorProfile)
        .join(DoctorProfile, DoctorProfile.user_id == User.id)
        .where(User.role == "doctor")
        .where(DoctorProfile.verified == True)  # noqa: E712
        .order_by(User.full_name)
    )
    if specialty:
        stmt = stmt.where(DoctorProfile.specialties.any(specialty))
    if fee_tier:
        stmt = stmt.where(DoctorProfile.fee_tier == fee_tier)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(User.full_name).like(like))

    rows = db.execute(stmt).all()
    return [_card(u, p, db) for u, p in rows]


@router.get("/{doctor_id}", response_model=DoctorProfileOut)
def get_doctor(
    doctor_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(current_user),
) -> DoctorProfileOut:
    u = db.get(User, doctor_id)
    p = db.get(DoctorProfile, doctor_id)
    if u is None or p is None or u.role != "doctor":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "doctor not found")
    card = _card(u, p, db)
    reviews_rows = db.execute(
        select(DoctorReview, User.full_name)
        .join(User, User.id == DoctorReview.patient_id)
        .where(DoctorReview.doctor_id == doctor_id)
        .where(DoctorReview.hidden == False)  # noqa: E712
        .order_by(desc(DoctorReview.submitted_at))
        .limit(20)
    ).all()
    return DoctorProfileOut(
        **card.model_dump(),
        qualifications=p.qualifications,
        bio=p.bio,
        photo_url=p.photo_url,
        reviews=[
            DoctorReviewOut(
                id=str(r.id),
                rating=r.rating,
                text=r.text,
                submitted_at=r.submitted_at.isoformat(),
                patient_name=name,
            )
            for r, name in reviews_rows
        ],
    )


class PostReviewIn(BaseModel):
    verification_id: uuid.UUID
    rating: int
    text: str | None = None


@router.post("/{doctor_id}/reviews", status_code=status.HTTP_201_CREATED)
def post_review(
    doctor_id: uuid.UUID,
    body: PostReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> dict:
    if not (1 <= body.rating <= 5):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "rating must be 1..5")
    # Must have a verified consult for this (patient, doctor, verification).
    ver_rev = db.execute(
        select(VerificationReview).where(
            VerificationReview.request_id == body.verification_id,
            VerificationReview.patient_id == user.id,
            VerificationReview.doctor_id == doctor_id,
        )
    ).scalars().first()
    if ver_rev is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "only patients with a completed verification can review",
        )

    existing = db.execute(
        select(DoctorReview).where(DoctorReview.verification_id == body.verification_id)
    ).scalars().first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "already reviewed this consult")

    r = DoctorReview(
        doctor_id=doctor_id,
        patient_id=user.id,
        verification_id=body.verification_id,
        rating=body.rating,
        text=body.text,
    )
    db.add(r)
    db.commit()
    return {"id": str(r.id)}


def _card(u: User, p: DoctorProfile, db: Session) -> DoctorCard:
    agg = db.execute(
        select(func.avg(DoctorReview.rating), func.count(DoctorReview.id))
        .where(DoctorReview.doctor_id == u.id)
        .where(DoctorReview.hidden == False)  # noqa: E712
    ).one()
    avg, count = agg
    return DoctorCard(
        id=str(u.id),
        full_name=u.full_name,
        bmdc_number=p.bmdc_number,
        specialties=list(p.specialties or []),
        fee_tier=p.fee_tier,
        fee_bdt=_FEE_BY_TIER.get(p.fee_tier, 200),
        chambers=p.chambers,
        verified=p.verified,
        rating_avg=float(avg) if avg is not None else None,
        rating_count=int(count or 0),
    )
