"""Chamber session flow — doctor generates QR, patient scans + grants consent,
doctor reads patient profile in real time, can add a new prescription back
to the patient's profile.

Differentiator vs all other BD telemedicine apps: works in offline chambers
where most BD care actually happens.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.db.models import (
    Analysis,
    ChamberSession,
    Consent,
    Document,
    User,
)
from backend.db.session import get_db
from backend.services import audit, storage
from backend.services.auth import current_user, require_doctor, require_patient
from backend.services.consent import find_active_consent, record_access


router = APIRouter(prefix="/chamber", tags=["chamber"])


_DEFAULT_SESSION_TTL = timedelta(hours=2)


class SessionOut(BaseModel):
    id: str
    qr_token: str
    qr_payload: str  # URL-safe payload patient scans
    doctor_name: str
    chamber_address: str | None
    opened_at: datetime
    expires_at: datetime
    bound_at: datetime | None = None
    closed_at: datetime | None = None
    consent_id: str | None = None
    patient_id: str | None = None
    patient_name: str | None = None


class OpenIn(BaseModel):
    chamber_address: str | None = None


@router.post("/session", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def open_session(
    body: OpenIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_doctor),
) -> SessionOut:
    token = secrets.token_urlsafe(24)
    expires = datetime.now(timezone.utc) + _DEFAULT_SESSION_TTL
    sess = ChamberSession(
        doctor_id=user.id,
        qr_token=token,
        expires_at=expires,
        chamber_address=body.chamber_address,
    )
    db.add(sess)
    db.flush()
    audit.record(
        db,
        "chamber.session.opened",
        actor_id=user.id,
        actor_role="doctor",
        doctor_id=user.id,
        detail={"session_id": str(sess.id), "chamber_address": body.chamber_address},
    )
    db.commit()
    db.refresh(sess)
    return _out(sess, db, user)


class ScanIn(BaseModel):
    scope: Literal["single_document", "last_3_months", "full_history"] = "full_history"
    expires_in_hours: int = 2  # default tied to chamber session


@router.post("/session/{qr_token}/scan", response_model=SessionOut)
def scan(
    qr_token: str,
    body: ScanIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> SessionOut:
    sess = db.execute(
        select(ChamberSession).where(ChamberSession.qr_token == qr_token)
    ).scalars().first()
    if sess is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    if sess.closed_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "session already closed")
    if sess.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "session expired")
    if sess.bound_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "session already bound")

    expires = min(
        sess.expires_at,
        datetime.now(timezone.utc) + timedelta(hours=body.expires_in_hours),
    )
    consent = Consent(
        patient_id=user.id,
        doctor_id=sess.doctor_id,
        scope=body.scope,
        expires_at=expires,
        context="chamber",
    )
    db.add(consent)
    db.flush()

    sess.patient_id = user.id
    sess.consent_id = consent.id
    sess.bound_at = datetime.now(timezone.utc)

    audit.record(
        db,
        "chamber.session.bound",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        doctor_id=sess.doctor_id,
        consent_id=consent.id,
        detail={"session_id": str(sess.id), "scope": body.scope},
    )
    audit.record(
        db,
        "consent.granted",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        doctor_id=sess.doctor_id,
        consent_id=consent.id,
        detail={"scope": body.scope, "context": "chamber"},
    )
    db.commit()
    db.refresh(sess)
    doctor = db.get(User, sess.doctor_id)
    assert doctor is not None
    return _out(sess, db, doctor)


class ProfileSnapshotOut(BaseModel):
    session: SessionOut
    patient_name: str
    timeline: list[dict]
    latest_analysis: dict | None = None


@router.get("/session/{session_id}", response_model=SessionOut)
def get_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> SessionOut:
    sess = db.get(ChamberSession, session_id)
    if sess is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    if user.role == "doctor" and sess.doctor_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    if user.role == "patient" and sess.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    doctor = db.get(User, sess.doctor_id)
    assert doctor is not None
    return _out(sess, db, doctor)


@router.get("/session/{session_id}/profile", response_model=ProfileSnapshotOut)
def get_profile(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_doctor),
) -> ProfileSnapshotOut:
    sess = db.get(ChamberSession, session_id)
    if sess is None or sess.doctor_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    if sess.patient_id is None or sess.consent_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "patient has not scanned yet")
    if sess.closed_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "session closed")
    consent = find_active_consent(
        db, patient_id=sess.patient_id, doctor_id=user.id, context="chamber"
    )
    if consent is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "consent expired or revoked")

    patient = db.get(User, sess.patient_id)
    assert patient is not None

    docs = db.execute(
        select(Document)
        .where(Document.patient_id == sess.patient_id)
        .order_by(desc(Document.uploaded_at))
        .limit(20)
    ).scalars().all()
    anls = db.execute(
        select(Analysis)
        .where(Analysis.patient_id == sess.patient_id)
        .order_by(desc(Analysis.created_at))
        .limit(20)
    ).scalars().all()

    timeline_rows = []
    for d in docs:
        timeline_rows.append(
            {
                "kind": "document",
                "id": str(d.id),
                "doc_kind": d.kind,
                "occurred_at": d.uploaded_at.isoformat(),
                "title_bn": _kind_bn(d.kind),
            }
        )
    for a in anls:
        timeline_rows.append(
            {
                "kind": "analysis",
                "id": str(a.id),
                "document_id": str(a.document_id),
                "occurred_at": a.created_at.isoformat(),
                "title_bn": "AI বিশ্লেষণ",
                "preview_bn": (a.explanation_bn or "")[:120],
            }
        )
    timeline_rows.sort(key=lambda r: r["occurred_at"], reverse=True)

    latest = anls[0] if anls else None
    latest_dict = (
        {
            "id": str(latest.id),
            "structured": latest.structured,
            "explanation_bn": latest.explanation_bn,
            "red_flags": latest.red_flags,
            "confidence": float(latest.confidence),
        }
        if latest
        else None
    )

    record_access(
        db,
        consent=consent,
        screen="timeline",
        location=f"chamber:{sess.chamber_address or 'unspecified'}",
    )
    db.commit()
    return ProfileSnapshotOut(
        session=_out(sess, db, user),
        patient_name=patient.full_name,
        timeline=timeline_rows,
        latest_analysis=latest_dict,
    )


@router.post("/session/{session_id}/prescription", status_code=status.HTTP_201_CREATED)
async def write_prescription(
    session_id: uuid.UUID,
    file: UploadFile = File(...),
    kind: str = Form("prescription"),
    db: Session = Depends(get_db),
    user: User = Depends(require_doctor),
) -> dict:
    sess = db.get(ChamberSession, session_id)
    if sess is None or sess.doctor_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    if sess.patient_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "patient not bound")
    if sess.closed_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "session closed")
    consent = find_active_consent(
        db, patient_id=sess.patient_id, doctor_id=user.id, context="chamber"
    )
    if consent is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "consent expired")

    if kind not in ("prescription", "lab_report", "discharge", "other"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid kind")

    data = await file.read()
    mime = file.content_type or "image/png"

    document_id = uuid.uuid4()
    storage_key, sha = storage.write_blob(
        patient_id=sess.patient_id, document_id=document_id, data=data, mime=mime
    )
    doc = Document(
        id=document_id,
        patient_id=sess.patient_id,
        kind=kind,
        original_name=file.filename,
        storage_key=storage_key,
        mime_type=mime,
        sha256=sha,
        size_bytes=len(data),
        source="doctor_added",
    )
    db.add(doc)
    audit.record(
        db,
        "doctor.prescription.written",
        actor_id=user.id,
        actor_role="doctor",
        patient_id=sess.patient_id,
        doctor_id=user.id,
        consent_id=consent.id,
        document_id=document_id,
        detail={
            "session_id": str(sess.id),
            "chamber_address": sess.chamber_address,
            "kind": kind,
        },
    )
    db.commit()
    return {"document_id": str(document_id), "added_by": "doctor"}


@router.post("/session/{session_id}/close", response_model=SessionOut)
def close_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> SessionOut:
    sess = db.get(ChamberSession, session_id)
    if sess is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    if user.role == "doctor" and sess.doctor_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    if user.role == "patient" and sess.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    if sess.closed_at is None:
        sess.closed_at = datetime.now(timezone.utc)
        if sess.consent_id:
            consent = db.get(Consent, sess.consent_id)
            if consent and consent.revoked_at is None:
                consent.revoked_at = sess.closed_at
        audit.record(
            db,
            "chamber.session.closed",
            actor_id=user.id,
            actor_role=user.role,
            patient_id=sess.patient_id,
            doctor_id=sess.doctor_id,
            consent_id=sess.consent_id,
            detail={"session_id": str(sess.id), "close_reason": "manual"},
        )
        db.commit()
    db.refresh(sess)
    doctor = db.get(User, sess.doctor_id)
    assert doctor is not None
    return _out(sess, db, doctor)


def _out(sess: ChamberSession, db: Session, doctor: User) -> SessionOut:
    patient = db.get(User, sess.patient_id) if sess.patient_id else None
    # qr_payload is what the QR encodes — patient app reads this and calls /scan
    payload = f"niro://chamber/{sess.qr_token}"
    return SessionOut(
        id=str(sess.id),
        qr_token=sess.qr_token,
        qr_payload=payload,
        doctor_name=doctor.full_name,
        chamber_address=sess.chamber_address,
        opened_at=sess.opened_at,
        expires_at=sess.expires_at,
        bound_at=sess.bound_at,
        closed_at=sess.closed_at,
        consent_id=str(sess.consent_id) if sess.consent_id else None,
        patient_id=str(sess.patient_id) if sess.patient_id else None,
        patient_name=patient.full_name if patient else None,
    )


def _kind_bn(k: str) -> str:
    return {
        "prescription": "প্রেসক্রিপশন",
        "lab_report": "ল্যাব রিপোর্ট",
        "discharge": "ডিসচার্জ সামারি",
        "other": "ডকুমেন্ট",
    }.get(k, k)
