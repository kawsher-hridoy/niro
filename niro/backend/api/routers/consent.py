"""Consent grant/revoke. Consent is the patient's signed permission for
a specific doctor to see specific data for a specific time."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db.models import Consent, User
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import require_patient


router = APIRouter(prefix="/consents", tags=["consent"])


Scope = Literal["single_document", "last_3_months", "full_history"]
Context = Literal["async_review", "chamber", "export"]


class GrantIn(BaseModel):
    doctor_id: uuid.UUID
    scope: Scope
    context: Context
    expires_in_hours: int = 24
    document_id: uuid.UUID | None = None


class ConsentOut(BaseModel):
    id: str
    doctor_id: str
    scope: str
    context: str
    document_id: str | None
    granted_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None


@router.post("", response_model=ConsentOut, status_code=status.HTTP_201_CREATED)
def grant(
    body: GrantIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> ConsentOut:
    if body.expires_in_hours < 1 or body.expires_in_hours > 24 * 30:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "expires_in_hours out of range (1..720)")

    doctor = db.get(User, body.doctor_id)
    if doctor is None or doctor.role != "doctor":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "doctor not found")

    expires = datetime.now(timezone.utc) + timedelta(hours=body.expires_in_hours)
    c = Consent(
        patient_id=user.id,
        doctor_id=body.doctor_id,
        scope=body.scope,
        document_id=body.document_id,
        expires_at=expires,
        context=body.context,
    )
    db.add(c)
    db.flush()
    audit.record(
        db,
        "consent.granted",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        doctor_id=body.doctor_id,
        consent_id=c.id,
        detail={"scope": body.scope, "context": body.context, "hours": body.expires_in_hours},
    )
    db.commit()
    db.refresh(c)
    return _out(c)


@router.post("/{consent_id}/revoke", response_model=ConsentOut)
def revoke(
    consent_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> ConsentOut:
    c = db.get(Consent, consent_id)
    if c is None or c.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "consent not found")
    if c.revoked_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "already revoked")
    c.revoked_at = datetime.now(timezone.utc)
    audit.record(
        db,
        "consent.revoked",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        doctor_id=c.doctor_id,
        consent_id=c.id,
    )
    db.commit()
    db.refresh(c)
    return _out(c)


def _out(c: Consent) -> ConsentOut:
    return ConsentOut(
        id=str(c.id),
        doctor_id=str(c.doctor_id),
        scope=c.scope,
        context=c.context,
        document_id=str(c.document_id) if c.document_id else None,
        granted_at=c.granted_at,
        expires_at=c.expires_at,
        revoked_at=c.revoked_at,
    )
