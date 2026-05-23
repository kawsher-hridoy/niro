"""JWT auth helpers + password hashing.

Token format: jose JWT signed HS256 with APP_SECRET.
Payload: {sub: user_id, role, type: "access"|"refresh", exp}.

Password hashing: argon2-cffi (D-012). OWASP-recommended; no passlib +
bcrypt 5.x compat issues (D-009).

Phase B uses bearer in Authorization header. Phase 2 may move to
httpOnly cookies via the Next.js BFF.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.db.models import User
from backend.db.session import get_db


ACCESS_TTL = timedelta(hours=1)
REFRESH_TTL = timedelta(days=30)
ALGO = "HS256"

_ph = PasswordHasher()


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError):
        return False


def make_token(
    user_id: uuid.UUID, role: str, kind: Literal["access", "refresh"]
) -> str:
    settings = get_settings()
    ttl = ACCESS_TTL if kind == "access" else REFRESH_TTL
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": kind,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    return jwt.encode(payload, settings.app_secret, algorithm=ALGO)


def decode_token(token: str, expected_type: Literal["access", "refresh"]) -> dict:
    try:
        payload = jwt.decode(token, get_settings().app_secret, algorithms=[ALGO])
    except JWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token") from e
    if payload.get("type") != expected_type:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong token type")
    return payload


def _strip_bearer(header: str | None) -> str:
    if not header:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    parts = header.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    return parts[1].strip()


def current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    token = _strip_bearer(authorization)
    payload = decode_token(token, "access")
    user_id = uuid.UUID(payload["sub"])
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found")
    return user


def require_role(*roles: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"requires role: {roles}")
        return user
    return dep


require_patient = require_role("patient")
require_doctor = require_role("doctor")
require_admin = require_role("admin")
