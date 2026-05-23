"""Patient-initiated async doctor verification of an AI analysis.

Flow:
  1. POST /verifications  → patient requests review of a doc by a doctor.
     Server creates a Consent (async_review scope) + VerificationRequest (pending).
  2. POST /verifications/{id}/pay → MOCK: sleeps 2s, sets payment_status=paid.
     (See docs/mocks.md M-2.)
  3. Doctor sees it in /doctor/inbox (router doctor.py).
  4. Doctor submits review via POST /doctor/cases/{id}/review.
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.db.models import (
    Consent,
    Document,
    DoctorProfile,
    User,
    VerificationRequest,
    VerificationReview,
)
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import current_user, require_patient


router = APIRouter(prefix="/verifications", tags=["verifications"])


_FEE_BY_TIER = {1: 200, 2: 400, 3: 800}


class CreateIn(BaseModel):
    doctor_id: uuid.UUID
    document_id: uuid.UUID
    scope: Literal["single_document", "last_3_months", "full_history"] = "full_history"
    expires_in_hours: int = 24


class VerificationOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    document_id: str
    consent_id: str
    fee_bdt: int
    payment_status: str
    transaction_id: str | None
    created_at: datetime
    due_by: datetime
    review_id: str | None = None
    review_disposition: str | None = None
    review_submitted_at: datetime | None = None
    doctor_name: str | None = None


@router.post("", response_model=VerificationOut, status_code=status.HTTP_201_CREATED)
def create(
    body: CreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> VerificationOut:
    doctor = db.get(User, body.doctor_id)
    if doctor is None or doctor.role != "doctor":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "doctor not found")
    profile = db.get(DoctorProfile, doctor.id)
    if profile is None or not profile.verified:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "doctor not verified")

    doc = db.get(Document, body.document_id)
    if doc is None or doc.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document not found")

    expires = datetime.now(timezone.utc) + timedelta(hours=body.expires_in_hours)
    consent = Consent(
        patient_id=user.id,
        doctor_id=doctor.id,
        scope=body.scope,
        document_id=body.document_id if body.scope == "single_document" else None,
        expires_at=expires,
        context="async_review",
    )
    db.add(consent)
    db.flush()

    fee = _FEE_BY_TIER.get(profile.fee_tier, 200)
    req = VerificationRequest(
        patient_id=user.id,
        doctor_id=doctor.id,
        document_id=doc.id,
        consent_id=consent.id,
        fee_bdt=fee,
        payment_status="pending",
        due_by=expires,
    )
    db.add(req)
    db.flush()

    audit.record(
        db,
        "consent.granted",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        doctor_id=doctor.id,
        consent_id=consent.id,
        detail={"scope": body.scope, "context": "async_review"},
    )
    db.commit()
    db.refresh(req)
    return _out(req, db, doctor_name=doctor.full_name)


class PayIn(BaseModel):
    transaction_id: str | None = None


@router.post("/{request_id}/pay", response_model=VerificationOut)
def pay(
    request_id: uuid.UUID,
    body: PayIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> VerificationOut:
    """Phase-1 mock — sleeps 2s then sets paid. See docs/mocks.md M-2."""
    req = db.get(VerificationRequest, request_id)
    if req is None or req.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "request not found")
    if req.payment_status == "paid":
        return _out(req, db)
    time.sleep(2.0)
    req.payment_status = "paid"
    req.transaction_id = body.transaction_id or f"MOCK-{uuid.uuid4().hex[:12].upper()}"
    audit.record(
        db,
        "payment.mock_paid",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        doctor_id=req.doctor_id,
        detail={"fee_bdt": req.fee_bdt, "transaction_id": req.transaction_id},
    )
    db.commit()
    db.refresh(req)
    return _out(req, db)


@router.get("/{request_id}", response_model=VerificationOut)
def get_one(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> VerificationOut:
    req = db.get(VerificationRequest, request_id)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "request not found")
    if user.role == "patient" and req.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "request not found")
    if user.role == "doctor" and req.doctor_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "request not found")
    return _out(req, db)


@router.get("", response_model=list[VerificationOut])
def list_my(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> list[VerificationOut]:
    rows = db.execute(
        select(VerificationRequest, User.full_name)
        .join(User, User.id == VerificationRequest.doctor_id)
        .where(VerificationRequest.patient_id == user.id)
        .order_by(desc(VerificationRequest.created_at))
    ).all()
    return [_out(r, db, doctor_name=name) for r, name in rows]


def _out(req: VerificationRequest, db: Session, doctor_name: str | None = None) -> VerificationOut:
    if doctor_name is None:
        d = db.get(User, req.doctor_id)
        doctor_name = d.full_name if d else None
    rev = db.execute(
        select(VerificationReview).where(VerificationReview.request_id == req.id)
    ).scalars().first()
    return VerificationOut(
        id=str(req.id),
        patient_id=str(req.patient_id),
        doctor_id=str(req.doctor_id),
        document_id=str(req.document_id),
        consent_id=str(req.consent_id),
        fee_bdt=req.fee_bdt,
        payment_status=req.payment_status,
        transaction_id=req.transaction_id,
        created_at=req.created_at,
        due_by=req.due_by,
        review_id=str(rev.id) if rev else None,
        review_disposition=rev.disposition if rev else None,
        review_submitted_at=rev.submitted_at if rev else None,
        doctor_name=doctor_name,
    )
