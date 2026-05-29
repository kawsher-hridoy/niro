"""AI analysis of an uploaded document.

POST /analyses {document_id, use_history?} → analyzes the doc, writes
an Analysis row + an audit row. History-aware mode includes the patient's
last 3 analyses as context.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.ai.policy import AIPolicyViolation
from backend.ai.provider import DocumentAnalysis, DocumentReadError, get_provider
from backend.db.models import Analysis, Document, User
from backend.db.session import get_db
from backend.services import audit, storage
from backend.services.auth import current_user, require_patient


router = APIRouter(prefix="/analyses", tags=["analyses"])


class AnalyzeIn(BaseModel):
    document_id: uuid.UUID
    use_history: bool = True
    user_prompt: str | None = Field(default=None, max_length=1000)


class AnalysisOut(BaseModel):
    id: str
    document_id: str
    kind: str
    structured: dict
    explanation_bn: str
    red_flags: list[dict]
    questions_bn: list[str]
    confidence: float
    model_name: str
    model_version: str
    latency_ms: int
    created_at: datetime
    recommend_human_review: bool = Field(
        default=False,
        description="True when confidence < 0.5 — UI surfaces 'request human verification'.",
    )

    @classmethod
    def from_orm(cls, a: Analysis, doc_kind: str) -> "AnalysisOut":
        conf = float(a.confidence) if isinstance(a.confidence, Decimal) else float(a.confidence)
        return cls(
            id=str(a.id),
            document_id=str(a.document_id),
            kind=doc_kind,
            structured=a.structured,
            explanation_bn=a.explanation_bn,
            red_flags=a.red_flags,
            questions_bn=a.questions_bn,
            confidence=conf,
            model_name=a.model_name,
            model_version=a.model_version,
            latency_ms=a.latency_ms,
            created_at=a.created_at,
            recommend_human_review=conf < 0.5,
        )


@router.post("", response_model=AnalysisOut, status_code=status.HTTP_201_CREATED)
def analyze(
    body: AnalyzeIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> AnalysisOut:
    doc = db.get(Document, body.document_id)
    if doc is None or doc.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document not found")

    image_bytes = storage.read_blob(doc.storage_key)

    history: list[DocumentAnalysis] = []
    if body.use_history:
        rows = db.execute(
            select(Analysis)
            .where(Analysis.patient_id == user.id)
            .order_by(desc(Analysis.created_at))
            .limit(3)
        ).scalars().all()
        for r in rows:
            history.append(
                {
                    "kind": "prescription",  # we don't strictly need this for the prompt
                    "structured": r.structured,
                    "explanation_bn": r.explanation_bn,
                    "model_name": r.model_name,
                }
            )

    provider = get_provider()
    try:
        result = provider.analyze_document(
            image_bytes,
            mime=doc.mime_type,
            hint_kind=doc.kind,  # type: ignore[arg-type]
            history=history,
            user_prompt=body.user_prompt,
        )
    except DocumentReadError as e:
        audit.record(
            db,
            "ai.document_unreadable",
            actor_id=user.id,
            actor_role="patient",
            patient_id=user.id,
            document_id=doc.id,
            detail={"reason": str(e)[:200], "mime": doc.mime_type},
        )
        db.commit()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "could not read document; PDF may be encrypted or corrupted",
        ) from e
    except AIPolicyViolation as e:
        audit.record(
            db,
            "ai.policy_violation",
            actor_id=user.id,
            actor_role="patient",
            patient_id=user.id,
            document_id=doc.id,
            detail={"reason": str(e)[:200]},
        )
        db.commit()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "ai output violated safety policy; please request human verification",
        ) from e

    analysis = Analysis(
        document_id=doc.id,
        patient_id=user.id,
        model_name=result["model_name"],
        model_version=result["model_version"],
        structured=result["structured"],
        explanation_bn=result["explanation_bn"],
        red_flags=result["red_flags"],
        questions_bn=result["questions_bn"],
        confidence=Decimal(str(round(result["confidence"], 3))),
        prompt_sha256=result["prompt_sha256"],
        output_sha256=result["output_sha256"],
        latency_ms=result["latency_ms"],
    )
    db.add(analysis)
    db.flush()
    event_name = "ai.analyze.history_aware" if history else "ai.analyze.document"
    audit.record(
        db,
        event_name,
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        document_id=doc.id,
        analysis_id=analysis.id,
        model_name=result["model_name"],
        model_version=result["model_version"],
        prompt_sha256=result["prompt_sha256"],
        output_sha256=result["output_sha256"],
        confidence=result["confidence"],
        detail={
            "latency_ms": result["latency_ms"],
            "history_count": len(history),
            "kind": doc.kind,
            "has_user_prompt": bool(body.user_prompt and body.user_prompt.strip()),
            "prompt_version": result.get("_prompt_version"),  # type: ignore[typeddict-item]
        },
    )
    db.commit()
    db.refresh(analysis)
    return AnalysisOut.from_orm(analysis, doc.kind)


@router.get("/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> AnalysisOut:
    a = db.get(Analysis, analysis_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "analysis not found")
    # Patient sees own. Doctor access via /doctor/cases consent path (Phase C).
    if user.role == "patient" and a.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "analysis not found")
    doc = db.get(Document, a.document_id)
    return AnalysisOut.from_orm(a, doc.kind if doc else "other")


@router.get("", response_model=list[AnalysisOut])
def list_my_analyses(
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> list[AnalysisOut]:
    rows = db.execute(
        select(Analysis, Document.kind)
        .join(Document, Document.id == Analysis.document_id)
        .where(Analysis.patient_id == user.id)
        .order_by(desc(Analysis.created_at))
    ).all()
    return [AnalysisOut.from_orm(a, kind) for a, kind in rows]
