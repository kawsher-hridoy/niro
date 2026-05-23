"""Document upload, list, get, delete."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.db.models import Document, User
from backend.db.session import get_db
from backend.services import audit, storage
from backend.services.auth import require_patient


router = APIRouter(prefix="/documents", tags=["documents"])

_MAX_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_MIMES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"}


class DocumentOut(BaseModel):
    id: str
    kind: str
    original_name: str | None
    mime_type: str
    size_bytes: int
    uploaded_at: datetime
    source: str

    @classmethod
    def from_orm(cls, d: Document) -> "DocumentOut":
        return cls(
            id=str(d.id),
            kind=d.kind,
            original_name=d.original_name,
            mime_type=d.mime_type,
            size_bytes=d.size_bytes,
            uploaded_at=d.uploaded_at,
            source=d.source,
        )


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload(
    file: UploadFile = File(...),
    kind: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> DocumentOut:
    if kind not in ("prescription", "lab_report", "discharge", "other"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid kind")
    mime = (file.content_type or "").lower()
    if mime not in _ALLOWED_MIMES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"unsupported mime: {mime}")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "empty file")
    if len(data) > _MAX_SIZE:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "file too large")

    document_id = uuid.uuid4()
    storage_key, sha = storage.write_blob(
        patient_id=user.id, document_id=document_id, data=data, mime=mime
    )

    doc = Document(
        id=document_id,
        patient_id=user.id,
        kind=kind,
        original_name=file.filename,
        storage_key=storage_key,
        mime_type=mime,
        sha256=sha,
        size_bytes=len(data),
        source="patient_upload",
    )
    db.add(doc)
    audit.record(
        db,
        "document.upload",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        document_id=document_id,
        detail={"mime": mime, "size_bytes": len(data), "kind": kind},
    )
    db.commit()
    db.refresh(doc)
    return DocumentOut.from_orm(doc)


@router.get("", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> list[DocumentOut]:
    rows = db.execute(
        select(Document)
        .where(Document.patient_id == user.id)
        .order_by(desc(Document.uploaded_at))
    ).scalars().all()
    return [DocumentOut.from_orm(d) for d in rows]


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> DocumentOut:
    doc = db.get(Document, document_id)
    if doc is None or doc.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document not found")
    audit.record(
        db,
        "document.view",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        document_id=doc.id,
    )
    db.commit()
    return DocumentOut.from_orm(doc)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> None:
    doc = db.get(Document, document_id)
    if doc is None or doc.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document not found")
    try:
        storage.absolute_path(doc.storage_key).unlink(missing_ok=True)
    except OSError:
        pass
    db.delete(doc)
    audit.record(
        db,
        "document.delete",
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        document_id=doc.id,
    )
    db.commit()
