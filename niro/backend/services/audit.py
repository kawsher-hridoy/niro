"""Append-only audit writer. One row per event.

PHI must never appear in `detail`. IDs and hashes only.
See docs/ai-safety/audit-logging.md for the event taxonomy.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from backend.db.models import AuditLog


def record(
    db: Session,
    event: str,
    *,
    actor_id: uuid.UUID | None = None,
    actor_role: str | None = None,
    patient_id: uuid.UUID | None = None,
    doctor_id: uuid.UUID | None = None,
    document_id: uuid.UUID | None = None,
    analysis_id: uuid.UUID | None = None,
    consent_id: uuid.UUID | None = None,
    model_name: str | None = None,
    model_version: str | None = None,
    prompt_sha256: str | None = None,
    output_sha256: str | None = None,
    confidence: float | None = None,
    detail: dict[str, Any] | None = None,
    commit: bool = True,
) -> None:
    row = AuditLog(
        event=event,
        actor_id=actor_id,
        actor_role=actor_role,
        patient_id=patient_id,
        doctor_id=doctor_id,
        document_id=document_id,
        analysis_id=analysis_id,
        consent_id=consent_id,
        model_name=model_name,
        model_version=model_version,
        prompt_sha256=prompt_sha256,
        output_sha256=output_sha256,
        confidence=confidence,
        detail=detail or {},
    )
    db.add(row)
    if commit:
        db.flush()
