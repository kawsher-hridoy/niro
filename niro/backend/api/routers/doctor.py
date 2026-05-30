"""Doctor portal: inbox, case view (consent-gated), submit review.

The doctor never sees patient data without consent. ConsentGuard.require
is called inside every case-fetching route.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import and_, desc, func, select
from sqlalchemy.orm import Session

from backend.ai.provider import get_provider
from backend.db.models import (
    Analysis,
    Document,
    DoctorProfile,
    HealthMetric,
    User,
    VerificationRequest,
    VerificationReview,
    ChamberSession,
    AccessLog,
    DoctorReview,
)
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import require_doctor, require_verified_doctor
from backend.services.consent import PermissionDenied, find_active_consent, record_access


router = APIRouter(prefix="/doctor", tags=["doctor-portal"])




class DoctorProfileStatusOut(BaseModel):
    verified: bool
    bmdc_number: str | None = None
    specialties: list[str] = []
    fee_tier: int | None = None


class DoctorDashboardCountsOut(BaseModel):
    pending_reviews: int
    due_soon: int
    completed_today: int
    active_chamber_sessions: int
    recent_patient_access: int


class DoctorDashboardInboxItem(BaseModel):
    request_id: str
    patient_name: str
    document_kind: str
    fee_bdt: int
    created_at: datetime
    due_by: datetime
    has_review: bool


class DoctorDashboardReviewOut(BaseModel):
    request_id: str
    patient_name: str
    disposition: str
    submitted_at: datetime


class DoctorDashboardAccessOut(BaseModel):
    patient_name: str | None
    screen: str
    viewed_at: datetime
    context: Literal["async", "chamber"]


class DoctorDashboardOut(BaseModel):
    user: dict
    profile: DoctorProfileStatusOut
    counts: DoctorDashboardCountsOut
    urgent_reviews: list[DoctorDashboardInboxItem]
    completed_reviews: list[DoctorDashboardReviewOut]
    recent_access: list[DoctorDashboardAccessOut]
    rating_avg: float | None = None
    rating_count: int = 0


@router.get("/status", response_model=DoctorProfileStatusOut)
def status_me(
    db: Session = Depends(get_db), user: User = Depends(require_doctor)
) -> DoctorProfileStatusOut:
    profile = db.get(DoctorProfile, user.id)
    return DoctorProfileStatusOut(
        verified=bool(profile and profile.verified),
        bmdc_number=profile.bmdc_number if profile else None,
        specialties=list(profile.specialties or []) if profile else [],
        fee_tier=profile.fee_tier if profile else None,
    )


@router.get("/dashboard", response_model=DoctorDashboardOut)
def dashboard(
    db: Session = Depends(get_db), user: User = Depends(require_verified_doctor)
) -> DoctorDashboardOut:
    profile = db.get(DoctorProfile, user.id)
    assert profile is not None
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    due_limit = now + timedelta(hours=24)

    pending_reviews = db.execute(
        select(func.count(VerificationRequest.id))
        .outerjoin(VerificationReview, VerificationReview.request_id == VerificationRequest.id)
        .where(VerificationRequest.doctor_id == user.id)
        .where(VerificationRequest.payment_status == "paid")
        .where(VerificationReview.id.is_(None))
    ).scalar_one()
    due_soon = db.execute(
        select(func.count(VerificationRequest.id))
        .outerjoin(VerificationReview, VerificationReview.request_id == VerificationRequest.id)
        .where(VerificationRequest.doctor_id == user.id)
        .where(VerificationRequest.payment_status == "paid")
        .where(VerificationReview.id.is_(None))
        .where(VerificationRequest.due_by <= due_limit)
    ).scalar_one()
    completed_today = db.execute(
        select(func.count(VerificationReview.id))
        .where(VerificationReview.doctor_id == user.id)
        .where(VerificationReview.submitted_at >= today_start)
    ).scalar_one()
    active_chambers = db.execute(
        select(func.count(ChamberSession.id))
        .where(ChamberSession.doctor_id == user.id)
        .where(ChamberSession.closed_at.is_(None))
        .where(ChamberSession.expires_at > now)
    ).scalar_one()
    recent_patient_access = db.execute(
        select(func.count(AccessLog.id))
        .where(AccessLog.doctor_id == user.id)
        .where(AccessLog.viewed_at >= now - timedelta(days=7))
    ).scalar_one()

    urgent_rows = db.execute(
        select(VerificationRequest, User.full_name, Document.kind, VerificationReview.id)
        .join(User, User.id == VerificationRequest.patient_id)
        .join(Document, Document.id == VerificationRequest.document_id)
        .outerjoin(VerificationReview, VerificationReview.request_id == VerificationRequest.id)
        .where(VerificationRequest.doctor_id == user.id)
        .where(VerificationRequest.payment_status == "paid")
        .where(VerificationReview.id.is_(None))
        .order_by(VerificationRequest.due_by, desc(VerificationRequest.created_at))
        .limit(5)
    ).all()
    completed_rows = db.execute(
        select(VerificationRequest, VerificationReview, User.full_name)
        .join(VerificationReview, VerificationReview.request_id == VerificationRequest.id)
        .join(User, User.id == VerificationRequest.patient_id)
        .where(VerificationReview.doctor_id == user.id)
        .order_by(desc(VerificationReview.submitted_at))
        .limit(4)
    ).all()
    access_rows = db.execute(
        select(AccessLog, User.full_name)
        .join(User, User.id == AccessLog.patient_id)
        .where(AccessLog.doctor_id == user.id)
        .order_by(desc(AccessLog.viewed_at))
        .limit(4)
    ).all()
    rating_avg, rating_count = db.execute(
        select(func.avg(DoctorReview.rating), func.count(DoctorReview.id))
        .where(DoctorReview.doctor_id == user.id)
        .where(DoctorReview.hidden == False)  # noqa: E712
    ).one()

    return DoctorDashboardOut(
        user={"id": str(user.id), "full_name": user.full_name, "phone": user.phone},
        profile=DoctorProfileStatusOut(
            verified=profile.verified,
            bmdc_number=profile.bmdc_number,
            specialties=list(profile.specialties or []),
            fee_tier=profile.fee_tier,
        ),
        counts=DoctorDashboardCountsOut(
            pending_reviews=int(pending_reviews or 0),
            due_soon=int(due_soon or 0),
            completed_today=int(completed_today or 0),
            active_chamber_sessions=int(active_chambers or 0),
            recent_patient_access=int(recent_patient_access or 0),
        ),
        urgent_reviews=[
            DoctorDashboardInboxItem(
                request_id=str(req.id),
                patient_name=patient_name,
                document_kind=kind,
                fee_bdt=req.fee_bdt,
                created_at=req.created_at,
                due_by=req.due_by,
                has_review=review_id is not None,
            )
            for req, patient_name, kind, review_id in urgent_rows
        ],
        completed_reviews=[
            DoctorDashboardReviewOut(
                request_id=str(req.id),
                patient_name=patient_name,
                disposition=review.disposition,
                submitted_at=review.submitted_at,
            )
            for req, review, patient_name in completed_rows
        ],
        recent_access=[
            DoctorDashboardAccessOut(
                patient_name=patient_name,
                screen=row.screen,
                viewed_at=row.viewed_at,
                context="chamber" if (row.location or "").startswith("chamber:") else "async",
            )
            for row, patient_name in access_rows
        ],
        rating_avg=float(rating_avg) if rating_avg is not None else None,
        rating_count=int(rating_count or 0),
    )

class InboxItem(BaseModel):
    request_id: str
    patient_id: str
    patient_name: str
    document_id: str
    document_kind: str
    fee_bdt: int
    payment_status: str
    created_at: datetime
    due_by: datetime
    has_review: bool


class CaseView(BaseModel):
    request_id: str
    patient_id: str
    patient_name: str
    document_id: str
    document_kind: str
    analysis_id: str | None = None
    analysis: dict | None = None  # the most recent Analysis on the target document
    case_summary: dict | None = None  # AI-prepared case summary
    history: list[dict] = []  # previous analyses summary
    metrics: list[dict] = []  # trendable health metrics across the patient's record
    consent_id: str


class ReviewIn(BaseModel):
    disposition: Literal["agree", "concerns", "escalate"]
    ai_claims_eval: list[dict] = []
    doctor_notes_bn: str


@router.get("/inbox", response_model=list[InboxItem])
def inbox(
    db: Session = Depends(get_db), user: User = Depends(require_verified_doctor)
) -> list[InboxItem]:
    rows = db.execute(
        select(VerificationRequest, User.full_name, Document.kind, VerificationReview.id)
        .join(User, User.id == VerificationRequest.patient_id)
        .join(Document, Document.id == VerificationRequest.document_id)
        .outerjoin(VerificationReview, VerificationReview.request_id == VerificationRequest.id)
        .where(VerificationRequest.doctor_id == user.id)
        .where(VerificationRequest.payment_status == "paid")
        .order_by(desc(VerificationRequest.created_at))
        .limit(100)
    ).all()
    return [
        InboxItem(
            request_id=str(r.id),
            patient_id=str(r.patient_id),
            patient_name=name,
            document_id=str(r.document_id),
            document_kind=kind,
            fee_bdt=r.fee_bdt,
            payment_status=r.payment_status,
            created_at=r.created_at,
            due_by=r.due_by,
            has_review=rev_id is not None,
        )
        for r, name, kind, rev_id in rows
    ]


@router.get("/cases/{request_id}", response_model=CaseView)
def get_case(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified_doctor),
) -> CaseView:
    req = db.get(VerificationRequest, request_id)
    if req is None or req.doctor_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "request not found")
    if req.payment_status != "paid":
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "payment pending")

    # Consent gate — required for every doctor-side patient-data read.
    consent = find_active_consent(
        db, patient_id=req.patient_id, doctor_id=user.id, context="async_review"
    )
    if consent is None:
        raise PermissionDenied("consent expired or revoked")

    patient = db.get(User, req.patient_id)
    doc = db.get(Document, req.document_id)
    if patient is None or doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "patient or document missing")

    # Most recent analysis for this document (Phase B analyze).
    target = db.execute(
        select(Analysis)
        .where(Analysis.document_id == req.document_id)
        .order_by(desc(Analysis.created_at))
        .limit(1)
    ).scalars().first()

    # History — last 5 analyses on OTHER documents.
    hist_rows = db.execute(
        select(Analysis)
        .where(Analysis.patient_id == req.patient_id)
        .where(Analysis.document_id != req.document_id)
        .order_by(desc(Analysis.created_at))
        .limit(5)
    ).scalars().all()
    history = [
        {
            "id": str(h.id),
            "document_id": str(h.document_id),
            "created_at": h.created_at.isoformat(),
            "structured": h.structured,
            "explanation_bn": h.explanation_bn,
        }
        for h in hist_rows
    ]

    # AI case summary — generated on demand, cached on the request if not present.
    case_summary: dict | None = None
    if req.ai_summary_id is None and target is not None:
        target_doc_analysis = {
            "kind": doc.kind,
            "structured": target.structured,
            "explanation_bn": target.explanation_bn,
            "red_flags": target.red_flags,
            "questions_bn": target.questions_bn,
            "model_name": target.model_name,
            "model_version": target.model_version,
        }
        hist_for_ai = [
            {
                "kind": "prescription",
                "structured": h["structured"],
                "explanation_bn": h["explanation_bn"],
                "model_name": target.model_name,
            }
            for h in history
        ]
        summary = get_provider().prepare_case_summary(target_doc_analysis, hist_for_ai)  # type: ignore[arg-type]
        case_summary = dict(summary)
        audit.record(
            db,
            "ai.case_summary",
            actor_id=user.id,
            actor_role="doctor",
            patient_id=req.patient_id,
            doctor_id=user.id,
            model_name=summary.get("model_name"),
            model_version=summary.get("model_version"),
            prompt_sha256=summary.get("prompt_sha256"),
            output_sha256=summary.get("output_sha256"),
            detail={"request_id": str(request_id)},
        )
        db.commit()
    elif target is not None:
        case_summary = None  # could rehydrate from a Summaries table; not in Phase C

    record_access(
        db,
        consent=consent,
        screen="case_summary",
        document_id=req.document_id,
        location="async",
    )
    db.commit()

    # Trendable metrics across the patient's whole record (latest per key) so the
    # doctor sees how key values have moved, and can verify against the hardcopy.
    metric_rows = db.execute(
        select(HealthMetric)
        .where(HealthMetric.patient_id == req.patient_id)
        .order_by(HealthMetric.metric_key)
    ).scalars().all()
    by_key: dict[str, list[HealthMetric]] = {}
    for m in metric_rows:
        by_key.setdefault(m.metric_key, []).append(m)
    metrics: list[dict] = []
    for key, ms in by_key.items():
        ms.sort(key=lambda x: (x.measured_at or x.created_at.date()).isoformat())
        latest = ms[-1]
        metrics.append(
            {
                "metric_key": key,
                "label_bn": latest.label_bn or key.replace("_", " ").title(),
                "latest_value": float(latest.value_num) if latest.value_num is not None else None,
                "unit": latest.unit,
                "latest_date": latest.measured_at.isoformat() if latest.measured_at else None,
                "count": len(ms),
                "abnormal": bool(latest.abnormal),
                "document_id": str(latest.document_id) if latest.document_id else None,
            }
        )

    return CaseView(
        request_id=str(req.id),
        patient_id=str(req.patient_id),
        patient_name=patient.full_name,
        document_id=str(doc.id),
        document_kind=doc.kind,
        analysis_id=str(target.id) if target else None,
        analysis=(
            {
                "structured": target.structured,
                "explanation_bn": target.explanation_bn,
                "red_flags": target.red_flags,
                "questions_bn": target.questions_bn,
                "confidence": float(target.confidence),
            }
            if target
            else None
        ),
        case_summary=case_summary,
        history=history,
        metrics=metrics,
        consent_id=str(consent.id),
    )


@router.post("/cases/{request_id}/review", status_code=status.HTTP_201_CREATED)
def submit_review(
    request_id: uuid.UUID,
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified_doctor),
) -> dict:
    req = db.get(VerificationRequest, request_id)
    if req is None or req.doctor_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "request not found")
    if req.payment_status != "paid":
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "payment pending")

    existing = db.execute(
        select(VerificationReview).where(VerificationReview.request_id == req.id)
    ).scalars().first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "already reviewed")

    rev = VerificationReview(
        request_id=req.id,
        patient_id=req.patient_id,
        doctor_id=user.id,
        disposition=body.disposition,
        ai_claims_eval=body.ai_claims_eval,
        doctor_notes_bn=body.doctor_notes_bn,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(rev)
    db.flush()
    audit.record(
        db,
        "doctor.review.submitted",
        actor_id=user.id,
        actor_role="doctor",
        patient_id=req.patient_id,
        doctor_id=user.id,
        detail={"request_id": str(request_id), "disposition": body.disposition},
    )
    db.commit()
    return {"review_id": str(rev.id), "submitted_at": rev.submitted_at.isoformat()}
