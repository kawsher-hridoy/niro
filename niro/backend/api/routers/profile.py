"""Patient profile + timeline + export + delete."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import and_, desc, func, select
from sqlalchemy.orm import Session

from backend.db.models import (
    AccessLog,
    Analysis,
    Consent,
    Document,
    DoctorProfile,
    PatientProfile,
    User,
    VerificationRequest,
    VerificationReview,
)
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import current_user, require_patient


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
    doctor_verified: bool | None = None
    doctor_bmdc_number: str | None = None


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


class DashboardUserOut(BaseModel):
    id: str
    full_name: str
    phone: str


class DashboardCountsOut(BaseModel):
    documents: int
    analyses: int
    verifications: int
    active_consents: int
    doctor_views_30d: int


class DashboardDocumentOut(BaseModel):
    id: str
    kind: str
    uploaded_at: datetime
    analysis_id: str | None = None


class DashboardAnalysisOut(BaseModel):
    id: str
    document_id: str
    summary_bn: str
    confidence: float
    recommend_human_review: bool
    red_flag_count: int
    created_at: datetime


class DashboardAccessOut(BaseModel):
    doctor_name: str | None
    screen: str
    viewed_at: datetime
    context: Literal["async", "chamber"]


class DashboardOut(BaseModel):
    user: DashboardUserOut
    counts: DashboardCountsOut
    recent_documents: list[DashboardDocumentOut]
    recent_analyses: list[DashboardAnalysisOut]
    recent_access: list[DashboardAccessOut]


@router.get("/me", response_model=MeOut)
def me(db: Session = Depends(get_db), user: User = Depends(current_user)) -> MeOut:
    pp = db.get(PatientProfile, user.id)
    dp = db.get(DoctorProfile, user.id) if user.role == "doctor" else None
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
        doctor_verified=dp.verified if dp else None,
        doctor_bmdc_number=dp.bmdc_number if dp else None,
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


@router.get("/me/dashboard", response_model=DashboardOut)
def dashboard(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> DashboardOut:
    now = datetime.now(timezone.utc)
    views_since = now - timedelta(days=30)

    counts_row = db.execute(
        select(
            select(func.count(Document.id))
            .where(Document.patient_id == user.id)
            .scalar_subquery()
            .label("documents"),
            select(func.count(Analysis.id))
            .where(Analysis.patient_id == user.id)
            .scalar_subquery()
            .label("analyses"),
            select(func.count(VerificationRequest.id))
            .outerjoin(
                VerificationReview,
                VerificationReview.request_id == VerificationRequest.id,
            )
            .where(VerificationRequest.patient_id == user.id)
            .where(VerificationRequest.payment_status == "paid")
            .where(VerificationReview.id.is_not(None))
            .scalar_subquery()
            .label("verifications"),
            select(func.count(Consent.id))
            .where(Consent.patient_id == user.id)
            .where(Consent.revoked_at.is_(None))
            .where(Consent.expires_at > now)
            .scalar_subquery()
            .label("active_consents"),
            select(func.count(AccessLog.id))
            .where(AccessLog.patient_id == user.id)
            .where(AccessLog.viewed_at >= views_since)
            .scalar_subquery()
            .label("doctor_views_30d"),
        )
    ).one()._mapping

    latest_analysis = (
        select(
            Analysis.document_id.label("document_id"),
            Analysis.id.label("analysis_id"),
            func.row_number()
            .over(partition_by=Analysis.document_id, order_by=desc(Analysis.created_at))
            .label("rn"),
        )
        .where(Analysis.patient_id == user.id)
        .subquery()
    )

    doc_rows = db.execute(
        select(Document.id, Document.kind, Document.uploaded_at, latest_analysis.c.analysis_id)
        .outerjoin(
            latest_analysis,
            and_(
                latest_analysis.c.document_id == Document.id,
                latest_analysis.c.rn == 1,
            ),
        )
        .where(Document.patient_id == user.id)
        .order_by(desc(Document.uploaded_at))
        .limit(5)
    ).all()

    analysis_rows = db.execute(
        select(Analysis)
        .where(Analysis.patient_id == user.id)
        .order_by(desc(Analysis.created_at))
        .limit(3)
    ).scalars().all()

    access_rows = db.execute(
        select(AccessLog, User.full_name, Consent.context)
        .join(User, User.id == AccessLog.doctor_id)
        .outerjoin(Consent, Consent.id == AccessLog.consent_id)
        .where(AccessLog.patient_id == user.id)
        .order_by(desc(AccessLog.viewed_at))
        .limit(3)
    ).all()

    return DashboardOut(
        user=DashboardUserOut(
            id=str(user.id),
            full_name=user.full_name,
            phone=user.phone,
        ),
        counts=DashboardCountsOut(
            documents=int(counts_row["documents"] or 0),
            analyses=int(counts_row["analyses"] or 0),
            verifications=int(counts_row["verifications"] or 0),
            active_consents=int(counts_row["active_consents"] or 0),
            doctor_views_30d=int(counts_row["doctor_views_30d"] or 0),
        ),
        recent_documents=[
            DashboardDocumentOut(
                id=str(doc_id),
                kind=kind,
                uploaded_at=uploaded_at,
                analysis_id=str(analysis_id) if analysis_id else None,
            )
            for doc_id, kind, uploaded_at, analysis_id in doc_rows
        ],
        recent_analyses=[
            DashboardAnalysisOut(
                id=str(a.id),
                document_id=str(a.document_id),
                summary_bn=(a.explanation_bn or "")[:80],
                confidence=float(a.confidence),
                recommend_human_review=float(a.confidence) < 0.5,
                red_flag_count=len(a.red_flags or []),
                created_at=a.created_at,
            )
            for a in analysis_rows
        ],
        recent_access=[
            DashboardAccessOut(
                doctor_name=doctor_name,
                screen=row.screen,
                viewed_at=row.viewed_at,
                context="chamber"
                if (consent_context == "chamber" or (row.location or "").startswith("chamber:"))
                else "async",
            )
            for row, doctor_name, consent_context in access_rows
        ],
    )


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
