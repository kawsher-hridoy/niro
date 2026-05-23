"""Blob storage backend. Local FS in dev; S3-compatible in prod.

Writes: blob bytes + sha256. Reads by storage_key.
Path layout: <STORAGE_LOCAL_PATH>/<patient_id>/<document_id>.<ext>
"""
from __future__ import annotations

import hashlib
import uuid
from pathlib import Path

from backend.config import get_settings


_EXT_BY_MIME = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "application/pdf": "pdf",
}


def _root() -> Path:
    p = Path(get_settings().storage_local_path).expanduser().resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def ext_for_mime(mime: str) -> str:
    return _EXT_BY_MIME.get(mime.lower(), "bin")


def write_blob(
    *,
    patient_id: uuid.UUID,
    document_id: uuid.UUID,
    data: bytes,
    mime: str,
) -> tuple[str, str]:
    """Persist bytes. Returns (storage_key, sha256_hex)."""
    sha = hashlib.sha256(data).hexdigest()
    ext = ext_for_mime(mime)
    dest_dir = _root() / str(patient_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{document_id}.{ext}"
    dest.write_bytes(data)
    rel = f"{patient_id}/{document_id}.{ext}"
    return rel, sha


def read_blob(storage_key: str) -> bytes:
    """Read bytes by storage_key. Used by analyze + signed download."""
    return (_root() / storage_key).read_bytes()


def absolute_path(storage_key: str) -> Path:
    return _root() / storage_key
