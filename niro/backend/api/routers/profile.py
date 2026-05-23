"""Patient profile + timeline + export + delete."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.db.models import (
    AccessLog,
    Analysis,
    Document,
    PatientProfile,
    User,
    VerificationReview,
)
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import require_patient


router = APIRouter(tags=["profile"])


class MeOut(BaseModel):
    user_id: str
    role: str
    phone: str
    full_name: str
    language: str
    dob: str | None = None
    sex: str | None = None
    allergies: list = []
    conditions: list = []


class MePatchIn(BaseModel):
    full_name: str | None = None
    dob: str | None = None
    sex: str | None = None
    allergies: list | None = None
    conditions: list | None = None
    height_cm: int | None = None
    weight_kg: float | None = None


class TimelineEntryOut(BaseModel):
    entry_type: str  # 'document' | 'review' | 'analysis'
    occurred_at: datetime
    document_id: str | None = None
    analysis_id: str | None = None
    review_id: str | None = None
    title_bn: str
    subtitle_bn: str | None = None
    doctor_name: str | None = None


class AccessLogEntryOut(BaseModel):
    id: str
    doctor_id: str
    doctor_name: str | None
    screen: str
    document_id: str | None
    viewed_at: datetime
    location: str | None


@router.get("/me", response_model=MeOut)
def me(db: Session = Depends(get_db), user: User = Depends(require_patient)) -> MeOut:
    pp = db.get(PatientProfile, user.id)
    return MeOut(
        user_id=str(user.id),
        role=user.role,
        phone=user.phone,
        full_name=user.full_name,
        language=user.language,
        dob=pp.dob.isoformat() if pp and pp.dob else None,
        sex=pp.sex if pp else None,
        allergies=pp.allergies if pp else [],
        conditions=pp.conditions if pp else [],
    )


@router.patch("/me", response_model=MeOut)
def update_me(
    body: MePatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> MeOut:
    if body.full_name:
        user.full_name = body.full_name
    pp = db.get(PatientProfile, user.id)
    if pp is None:
        pp = PatientProfile(user_id=user.id)
        db.add(pp)
    if body.dob:
        from datetime import date
        pp.dob = date.fromisoformat(body.dob)
    if body.sex:
        pp.sex = body.sex
    if body.allergies is not None:
        pp.allergies = body.allergies
    if body.conditions is not None:
        pp.conditions = body.conditions
    if body.height_cm is not None:
        pp.height_cm = body.height_cm
    if body.weight_kg is not None:
        pp.weight_kg = body.weight_kg
    db.commit()
    return me(db, user)


@router.get("/me/timeline", response_model=list[TimelineEntryOut])
def timeline(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> list[TimelineEntryOut]:
    entries: list[TimelineEntryOut] = []

    docs = db.execute(
        select(Document)
        .where(Document.patient_id == user.id)
        .order_by(desc(Document.uploaded_at))
    ).scalars().all()
    for d in docs:
        kind_bn = {
            "prescription": "প্রেসক্রিপশন",
            "lab_report": "ল্যাব রিপোর্ট",
            "discharge": "ডিসচার্জ সামারি",
            "other": "ডকুমেন্ট",
        }.get(d.kind, d.kind)
        entries.append(
            TimelineEntryOut(
                entry_type="document",
                occurred_at=d.uploaded_at,
                document_id=str(d.id),
                title_bn=f"{kind_bn} আপলোড",
                subtitle_bn=d.original_name,
            )
        )

    anls = db.execute(
        select(Analysis)
        .where(Analysis.patient_id == user.id)
        .order_by(desc(Analysis.created_at))
    ).scalars().all()
    for a in anls:
        entries.append(
            TimelineEntryOut(
                entry_type="analysis",
                occurred_at=a.created_at,
                analysis_id=str(a.id),
                document_id=str(a.document_id),
                title_bn="AI বিশ্লেষণ",
                subtitle_bn=(a.explanation_bn or "")[:80],
            )
        )

    revs = db.execute(
        select(VerificationReview, User.full_name)
        .join(User, User.id == VerificationReview.doctor_id)
        .where(VerificationReview.patient_id == user.id)
        .order_by(desc(VerificationReview.submitted_at))
    ).all()
    for r, doctor_name in revs:
        disp_bn = {
            "agree": "AI-এর সাথে একমত",
            "concerns": "কিছু আপত্তি আছে",
            "escalate": "আরও বিশেষজ্ঞ লাগবে",
        }.get(r.disposition, r.disposition)
        entries.append(
            TimelineEntryOut(
                entry_type="review",
                occurred_at=r.submitted_at,
                review_id=str(r.id),
                doctor_name=doctor_name,
                title_bn=f"ডাক্তার পর্যালোচনা — {disp_bn}",
                subtitle_bn=(r.doctor_notes_bn or "")[:80],
            )
        )

    entries.sort(key=lambda e: e.occurred_at, reverse=True)
    return entries


@router.get("/me/access-log", response_model=list[AccessLogEntryOut])
def access_log(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> list[AccessLogEntryOut]:
    rows = db.execute(
        select(AccessLog, User.full_name)
        .join(User, User.id == AccessLog.doctor_id)
        .where(AccessLog.patient_id == user.id)
        .order_by(desc(AccessLog.viewed_at))
        .limit(100)
    ).all()
    return [
        AccessLogEntryOut(
            id=str(r.id),
            doctor_id=str(r.doctor_id),
            doctor_name=name,
            screen=r.screen,
            document_id=str(r.document_id) if r.document_id else None,
            viewed_at=r.viewed_at,
            location=r.location,
        )
        for r, name in rows
    ]


@router.delete("/me", status_code=204)
def delete_me(db: Session = Depends(get_db), user: User = Depends(require_patient)) -> None:
    audit.record(
        db, "system.user.deleted", actor_id=user.id, actor_role=user.role, patient_id=user.id
    )
    db.delete(user)
    db.commit()
