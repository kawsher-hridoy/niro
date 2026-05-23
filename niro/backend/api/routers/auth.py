"""OTP signin / verify / refresh / logout.

Phase 1 mock: OTP is always `123456` in dev. See docs/mocks.md M-1.
Real SMS in Phase F.

For OTP storage we use sha256(salt + code) — bcrypt is overkill for
short-lived 6-digit codes and brittle on bcrypt 5.x.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.db.models import OtpCode, PatientProfile, User
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import decode_token, make_token


router = APIRouter(prefix="/auth", tags=["auth"])


MOCK_OTP_CODE = "123456"
OTP_TTL = timedelta(minutes=10)


def _hash_otp(code: str, salt: str) -> str:
    return hashlib.sha256((salt + ":" + code).encode("utf-8")).hexdigest()


def _store_format(code: str) -> str:
    """Returns 'salt$hash' — split on '$' to verify."""
    salt = secrets.token_hex(16)
    return f"{salt}${_hash_otp(code, salt)}"


def _verify(code: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(_hash_otp(code, salt), expected)


class OtpRequestIn(BaseModel):
    phone: str = Field(min_length=10, max_length=20)


class OtpRequestOut(BaseModel):
    ok: bool
    dev_hint: str | None = None


class OtpVerifyIn(BaseModel):
    phone: str
    code: str
    full_name: str | None = None  # required on first-time signup


class TokenPair(BaseModel):
    access: str
    refresh: str
    role: str
    user_id: str


class RefreshIn(BaseModel):
    refresh: str


class AccessOut(BaseModel):
    access: str


@router.post("/otp/request", response_model=OtpRequestOut)
def request_otp(body: OtpRequestIn, db: Session = Depends(get_db)) -> OtpRequestOut:
    code = MOCK_OTP_CODE
    stored = _store_format(code)
    expires_at = datetime.now(timezone.utc) + OTP_TTL

    existing = db.get(OtpCode, body.phone)
    if existing:
        existing.code_hash = stored
        existing.expires_at = expires_at
        existing.attempts = 0
    else:
        db.add(OtpCode(phone=body.phone, code_hash=stored, expires_at=expires_at))

    phone_hash = hashlib.sha256(body.phone.encode("utf-8")).hexdigest()[:16]
    audit.record(db, "auth.otp.requested", detail={"phone_sha256_prefix": phone_hash})
    db.commit()

    is_dev = get_settings().app_env == "dev"
    return OtpRequestOut(
        ok=True, dev_hint=f"dev OTP is {MOCK_OTP_CODE}" if is_dev else None
    )


@router.post("/otp/verify", response_model=TokenPair)
def verify_otp(body: OtpVerifyIn, db: Session = Depends(get_db)) -> TokenPair:
    row = db.get(OtpCode, body.phone)
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "request OTP first")
    if row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP expired")
    if row.attempts >= 5:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too many attempts")
    if not _verify(body.code, row.code_hash):
        row.attempts += 1
        db.commit()
        audit.record(db, "auth.otp.failed", detail={"attempts": row.attempts})
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "wrong OTP code")

    user = db.query(User).filter(User.phone == body.phone).one_or_none()
    new_user = False
    if user is None:
        user = User(
            id=uuid.uuid4(),
            role="patient",  # Phase B only creates patients; doctors are admin-seeded
            phone=body.phone,
            full_name=body.full_name or "নতুন ব্যবহারকারী",
            language="bn",
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        db.add(PatientProfile(user_id=user.id))
        new_user = True
    else:
        user.last_login_at = datetime.now(timezone.utc)

    db.delete(row)
    audit.record(
        db,
        "auth.login",
        actor_id=user.id,
        actor_role=user.role,
        detail={"new_user": new_user},
    )
    db.commit()

    access = make_token(user.id, user.role, "access")
    refresh = make_token(user.id, user.role, "refresh")
    return TokenPair(access=access, refresh=refresh, role=user.role, user_id=str(user.id))


@router.post("/refresh", response_model=AccessOut)
def refresh(body: RefreshIn) -> AccessOut:
    payload = decode_token(body.refresh, "refresh")
    user_id = uuid.UUID(payload["sub"])
    role = payload["role"]
    return AccessOut(access=make_token(user_id, role, "access"))


@router.post("/logout")
def logout() -> dict:
    # No server-side session state. Client discards tokens.
    return {"ok": True}
