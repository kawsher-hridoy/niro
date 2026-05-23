"""ConsentGuard — yes/no on "may doctor D see patient P's data X right now".

Enforced at the repository layer (not the UI). Every doctor-side data
fetch should call `require` before reading patient data.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.models import AccessLog, Consent
from backend.services import audit


class PermissionDenied(Exception):
    """Raised when no active consent exists for a doctor-side access."""


def find_active_consent(
    db: Session,
    *,
    patient_id: uuid.UUID,
    doctor_id: uuid.UUID,
    context: str | None = None,
) -> Consent | None:
    now = datetime.now(timezone.utc)
    stmt = (
        select(Consent)
        .where(Consent.patient_id == patient_id)
        .where(Consent.doctor_id == doctor_id)
        .where(Consent.revoked_at.is_(None))
        .where(Consent.expires_at > now)
        .order_by(Consent.granted_at.desc())
    )
    if context:
        stmt = stmt.where(Consent.context == context)
    return db.execute(stmt).scalars().first()


def require(
    db: Session,
    *,
    patient_id: uuid.UUID,
    doctor_id: uuid.UUID,
    context: str | None = None,
) -> Consent:
    """Return the active consent or raise PermissionDenied."""
    consent = find_active_consent(
        db, patient_id=patient_id, doctor_id=doctor_id, context=context
    )
    if consent is None:
        audit.record(
            db,
            "consent.check_denied",
            actor_id=doctor_id,
            actor_role="doctor",
            patient_id=patient_id,
            doctor_id=doctor_id,
            detail={"reason": "no_active_consent", "context": context or "*"},
        )
        raise PermissionDenied(
            "no active consent for doctor to access this patient's data"
        )
    return consent


def record_access(
    db: Session,
    *,
    consent: Consent,
    screen: str,
    document_id: uuid.UUID | None = None,
    location: str | None = None,
) -> None:
    row = AccessLog(
        patient_id=consent.patient_id,
        doctor_id=consent.doctor_id,
        consent_id=consent.id,
        screen=screen,
        document_id=document_id,
        location=location,
    )
    db.add(row)
    audit.record(
        db,
        "doctor.view." + screen,
        actor_id=consent.doctor_id,
        actor_role="doctor",
        patient_id=consent.patient_id,
        doctor_id=consent.doctor_id,
        consent_id=consent.id,
        document_id=document_id,
        detail={"location": location or "remote"},
        commit=False,
    )
