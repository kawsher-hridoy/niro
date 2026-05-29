"""Patient chat about an analyzed document.

GET  /conversations/{analysis_id}          → existing thread (messages[])
POST /conversations/{analysis_id}/messages → ask a question, get an AI reply

The conversation is grounded in the stored Analysis (structured data +
explanation + red flags), not by re-reading the document image. Every AI
reply runs policy.assert_compliant() and is audited — same contract as
the analyze path. No patient text in audit detail.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session

from backend.ai.policy import AIPolicyViolation
from backend.ai.provider import ChatTurn, DocumentAnalysis, get_provider
from backend.db.models import Analysis, ChatMessage, Conversation, Document, User
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import require_patient


router = APIRouter(prefix="/conversations", tags=["chat"])

_TURN_LIMIT = 10  # prior turns sent to the model as context
_HISTORY_LIMIT = 3


class MessageIn(BaseModel):
    content_bn: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: str
    role: str
    content_bn: str
    confidence: float | None = None
    recommend_human_review: bool = False
    created_at: datetime

    @classmethod
    def from_orm(cls, m: ChatMessage) -> "MessageOut":
        conf = (
            float(m.confidence)
            if isinstance(m.confidence, (Decimal, float, int))
            else None
        )
        return cls(
            id=str(m.id),
            role=m.role,
            content_bn=m.content_bn,
            confidence=conf,
            recommend_human_review=conf is not None and conf < 0.5,
            created_at=m.created_at,
        )


class ConversationOut(BaseModel):
    analysis_id: str
    conversation_id: str | None
    messages: list[MessageOut]


def _load_owned_analysis(db: Session, analysis_id: uuid.UUID, user: User) -> Analysis:
    a = db.get(Analysis, analysis_id)
    if a is None or a.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "analysis not found")
    return a


@router.get("/{analysis_id}", response_model=ConversationOut)
def get_conversation(
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> ConversationOut:
    _load_owned_analysis(db, analysis_id, user)
    convo = db.execute(
        select(Conversation).where(Conversation.analysis_id == analysis_id)
    ).scalar_one_or_none()
    if convo is None:
        return ConversationOut(analysis_id=str(analysis_id), conversation_id=None, messages=[])
    rows = db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == convo.id)
        .order_by(asc(ChatMessage.created_at))
    ).scalars().all()
    return ConversationOut(
        analysis_id=str(analysis_id),
        conversation_id=str(convo.id),
        messages=[MessageOut.from_orm(m) for m in rows],
    )


@router.post(
    "/{analysis_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def post_message(
    analysis_id: uuid.UUID,
    body: MessageIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> MessageOut:
    analysis = _load_owned_analysis(db, analysis_id, user)
    doc = db.get(Document, analysis.document_id)

    # Get-or-create the conversation.
    convo = db.execute(
        select(Conversation).where(Conversation.analysis_id == analysis_id)
    ).scalar_one_or_none()
    if convo is None:
        convo = Conversation(analysis_id=analysis_id, patient_id=user.id)
        db.add(convo)
        db.flush()

    # Prior turns (oldest-first), capped.
    prior = db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == convo.id)
        .order_by(desc(ChatMessage.created_at))
        .limit(_TURN_LIMIT)
    ).scalars().all()
    turns: list[ChatTurn] = [
        {"role": m.role, "content": m.content_bn} for m in reversed(prior)  # type: ignore[typeddict-item]
    ]

    # Persist the user turn before calling the model.
    user_msg = ChatMessage(conversation_id=convo.id, role="user", content_bn=body.content_bn)
    db.add(user_msg)
    db.flush()

    analysis_view: DocumentAnalysis = {
        "kind": doc.kind if doc else "other",  # type: ignore[typeddict-item]
        "structured": analysis.structured,
        "explanation_bn": analysis.explanation_bn,
        "red_flags": analysis.red_flags,
        "questions_bn": analysis.questions_bn,
    }

    # Last-3 analyses as additional grounding (excluding this one).
    hist_rows = db.execute(
        select(Analysis)
        .where(Analysis.patient_id == user.id, Analysis.id != analysis.id)
        .order_by(desc(Analysis.created_at))
        .limit(_HISTORY_LIMIT)
    ).scalars().all()
    history: list[DocumentAnalysis] = [
        {
            "kind": "prescription",  # not needed for grounding text
            "structured": r.structured,
            "explanation_bn": r.explanation_bn,
            "model_name": r.model_name,
        }
        for r in hist_rows
    ]

    provider = get_provider()
    try:
        reply = provider.chat_about_analysis(
            analysis_view,
            user_message=body.content_bn,
            turns=turns,
            history=history,
        )
    except AIPolicyViolation as e:
        audit.record(
            db,
            "ai.chat.policy_violation",
            actor_id=user.id,
            actor_role="patient",
            patient_id=user.id,
            analysis_id=analysis.id,
            detail={"reason": str(e)[:200]},
        )
        db.commit()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "ai output violated safety policy; please consult a doctor",
        ) from e

    assistant_msg = ChatMessage(
        conversation_id=convo.id,
        role="assistant",
        content_bn=reply["answer_bn"],
        confidence=Decimal(str(round(reply["confidence"], 3))),
        prompt_sha256=reply["prompt_sha256"],
        output_sha256=reply["output_sha256"],
        latency_ms=reply["latency_ms"],
    )
    db.add(assistant_msg)
    db.flush()
    audit.record(
        db,
        "ai.chat.message",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        analysis_id=analysis.id,
        model_name=reply["model_name"],
        model_version=reply["model_version"],
        prompt_sha256=reply["prompt_sha256"],
        output_sha256=reply["output_sha256"],
        confidence=reply["confidence"],
        detail={"latency_ms": reply["latency_ms"], "turn_count": len(turns) + 1},
    )
    db.commit()
    db.refresh(assistant_msg)
    return MessageOut.from_orm(assistant_msg)
