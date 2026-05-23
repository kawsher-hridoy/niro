"""Doctor portal: inbox, case view (consent-gated), submit review.

The doctor never sees patient data without consent. ConsentGuard.require
is called inside every case-fetching route.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.ai.provider import get_provider
from backend.db.models import (
    Analysis,
    Document,
    DoctorProfile,
    User,
    VerificationRequest,
    VerificationReview,
)
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import require_doctor
from backend.services.consent import PermissionDenied, find_active_consent, record_access


router = APIRouter(prefix="/doctor", tags=["doctor-portal"])


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
    consent_id: str


class ReviewIn(BaseModel):
    disposition: Literal["agree", "concerns", "escalate"]
    ai_claims_eval: list[dict] = []
    doctor_notes_bn: str


@router.get("/inbox", response_model=list[InboxItem])
def inbox(
    db: Session = Depends(get_db), user: User = Depends(require_doctor)
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
    user: User = Depends(require_doctor),
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
        consent_id=str(consent.id),
    )


@router.post("/cases/{request_id}/review", status_code=status.HTTP_201_CREATED)
def submit_review(
    request_id: uuid.UUID,
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_doctor),
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
