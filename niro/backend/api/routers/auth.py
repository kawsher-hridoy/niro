"""Niro auth — Fix #2 (D-012).

Endpoints (all under `/api/v1/auth`):
  - POST /signup/start         pending signup row + OTP
  - POST /signup/verify        consume signup → users row + JWT
  - POST /signup/resend-otp    refresh OTP on pending row (max 3 resends)
  - POST /login/password       phone-or-email + password
  - POST /login/otp/request    legacy OTP login (seeded doctors, no-password users)
  - POST /login/otp/verify     legacy OTP login verify → JWT
  - POST /password/reset/start   send OTP scoped to purpose='reset'
  - POST /password/reset/confirm verify OTP + set new password
  - POST /refresh              access token from refresh token
  - POST /logout               client-side discard

Password hashing: argon2-cffi (D-012). OTP hashing: sha256(salt:code) (D-009).
Lockout: 5 failed password logins → locked_until = now + 15 min.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, Field, StringConstraints, field_validator
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.db.models import DoctorProfile, OtpCode, PatientProfile, PendingSignup, User
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import (
    decode_token,
    hash_password,
    make_token,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["auth"])


MOCK_OTP_CODE = "123456"
OTP_TTL = timedelta(minutes=10)
SIGNUP_TTL = timedelta(minutes=20)
MAX_LOGIN_FAILURES = 5
LOCKOUT_DURATION = timedelta(minutes=15)
MAX_OTP_ATTEMPTS = 5
MAX_RESEND = 3

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
_PHONE_RE = re.compile(r"^\+?[1-9]\d{7,14}$")


# ---------- helpers ----------

def _hash_otp(code: str, salt: str) -> str:
    return hashlib.sha256((salt + ":" + code).encode("utf-8")).hexdigest()


def _store_otp(code: str) -> str:
    salt = secrets.token_hex(16)
    return f"{salt}${_hash_otp(code, salt)}"


def _verify_otp(code: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(_hash_otp(code, salt), expected)


def _phone_hash_short(phone: str) -> str:
    return hashlib.sha256(phone.encode("utf-8")).hexdigest()[:16]


def _email_hash_short(email: str) -> str:
    return hashlib.sha256(email.encode("utf-8")).hexdigest()[:16]


def _normalize_phone(phone: str) -> str:
    p = phone.strip().replace(" ", "")
    if not p.startswith("+"):
        p = "+" + p
    return p


def _is_email(s: str) -> bool:
    return "@" in s


def _is_dev() -> bool:
    return get_settings().app_env != "prod"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------- shared payloads ----------

class FieldError(BaseModel):
    detail: str
    fields: dict[str, str] | None = None


class TokenPair(BaseModel):
    access: str
    refresh: str
    role: str
    user_id: str


class AccessOut(BaseModel):
    access: str


class RefreshIn(BaseModel):
    refresh: str


# ---------- signup ----------

class SignupStartIn(BaseModel):
    full_name: Annotated[str, StringConstraints(min_length=2, max_length=80, strip_whitespace=True)]
    email: Annotated[str, StringConstraints(min_length=3, max_length=254)]
    phone: Annotated[str, StringConstraints(min_length=8, max_length=20)]
    password: Annotated[str, StringConstraints(min_length=8, max_length=128)]
    confirm_password: Annotated[str, StringConstraints(min_length=8, max_length=128)]

    @field_validator("email")
    @classmethod
    def _v_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("invalid email")
        return v

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        v = _normalize_phone(v)
        if not _PHONE_RE.match(v):
            raise ValueError("invalid phone — use E.164, e.g. +8801712345678")
        return v


class SignupStartOut(BaseModel):
    signup_token: str
    expires_at: datetime
    otp: str | None = None  # dev-only


class SignupVerifyIn(BaseModel):
    signup_token: str
    code: Annotated[str, StringConstraints(min_length=4, max_length=8)]


class SignupResendIn(BaseModel):
    signup_token: str


class SignupResendOut(BaseModel):
    expires_at: datetime
    resend_count: int
    otp: str | None = None


class DoctorApplyIn(SignupStartIn):
    bmdc_number: Annotated[str, StringConstraints(min_length=4, max_length=32, strip_whitespace=True)]
    specialties: list[str] = Field(min_length=1, max_length=6)
    chamber_name: Annotated[str, StringConstraints(min_length=2, max_length=120, strip_whitespace=True)]
    chamber_address: Annotated[str, StringConstraints(max_length=180, strip_whitespace=True)] = ""
    chamber_hours: Annotated[str, StringConstraints(max_length=80, strip_whitespace=True)] = ""
    bio: Annotated[str, StringConstraints(max_length=500, strip_whitespace=True)] = ""
    fee_tier: int = Field(default=1, ge=1, le=3)

    @field_validator("specialties")
    @classmethod
    def _v_specialties(cls, v: list[str]) -> list[str]:
        cleaned = []
        for item in v:
            slug = re.sub(r"[^a-z0-9_\-]", "", item.strip().lower())[:32]
            if slug and slug not in cleaned:
                cleaned.append(slug)
        if not cleaned:
            raise ValueError("at least one specialty is required")
        return cleaned


class DoctorApplyOut(BaseModel):
    access: str
    refresh: str
    role: str
    user_id: str
    verified: bool
    pending: bool


def _validate_password_strength(password: str, confirm: str) -> dict[str, str] | None:
    errs: dict[str, str] = {}
    if password != confirm:
        errs["confirm_password"] = "পাসওয়ার্ড মেলেনি"
    if len(password) < 8:
        errs["password"] = "কমপক্ষে ৮ অক্ষর হতে হবে"
    elif not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        errs["password"] = "অন্তত একটি অক্ষর এবং একটি সংখ্যা থাকতে হবে"
    return errs or None


@router.post("/signup/start", response_model=SignupStartOut)
def signup_start(body: SignupStartIn, db: Session = Depends(get_db)) -> SignupStartOut:
    errs = _validate_password_strength(body.password, body.confirm_password)
    if errs:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            {"detail": "validation failed", "fields": errs},
        )

    # Uniqueness against existing users
    field_errs: dict[str, str] = {}
    if db.query(User).filter(User.phone == body.phone).first():
        field_errs["phone"] = "এই ফোন নম্বরে ইতিমধ্যে একটি অ্যাকাউন্ট আছে"
    if db.query(User).filter(User.email == body.email).first():
        field_errs["email"] = "এই ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট আছে"
    if field_errs:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"detail": "duplicate account", "fields": field_errs},
        )

    # Clean any stale pending rows for this phone/email
    db.query(PendingSignup).filter(
        (PendingSignup.phone == body.phone) | (PendingSignup.email == body.email)
    ).delete(synchronize_session=False)

    signup_token = secrets.token_hex(32)
    otp_code = MOCK_OTP_CODE if _is_dev() else f"{secrets.randbelow(1_000_000):06d}"
    expires_at = _utcnow() + SIGNUP_TTL

    db.add(
        PendingSignup(
            signup_token=signup_token,
            phone=body.phone,
            email=body.email,
            full_name=body.full_name,
            password_hash=hash_password(body.password),
            otp_code_hash=_store_otp(otp_code),
            expires_at=expires_at,
        )
    )
    audit.record(
        db,
        "auth.signup.started",
        detail={
            "phone_sha256_prefix": _phone_hash_short(body.phone),
            "email_sha256_prefix": _email_hash_short(body.email),
        },
    )
    db.commit()

    return SignupStartOut(
        signup_token=signup_token,
        expires_at=expires_at,
        otp=otp_code if _is_dev() else None,
    )


@router.post("/signup/verify", response_model=TokenPair)
def signup_verify(body: SignupVerifyIn, db: Session = Depends(get_db)) -> TokenPair:
    row = db.query(PendingSignup).filter(PendingSignup.signup_token == body.signup_token).first()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "signup session expired or invalid")
    if row.expires_at < _utcnow():
        db.delete(row)
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "signup session expired")
    if row.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too many attempts")
    if not _verify_otp(body.code, row.otp_code_hash):
        row.attempts += 1
        audit.record(db, "auth.signup.otp_failed", detail={"attempts": row.attempts})
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "wrong OTP code")

    # Re-check uniqueness right before insert
    if db.query(User).filter(User.phone == row.phone).first():
        db.delete(row)
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, "phone already registered")
    if db.query(User).filter(User.email == row.email).first():
        db.delete(row)
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")

    now = _utcnow()
    user = User(
        id=uuid.uuid4(),
        role="patient",
        phone=row.phone,
        email=row.email,
        password_hash=row.password_hash,
        full_name=row.full_name,
        language="bn",
        phone_verified_at=now,
        last_login_at=now,
    )
    db.add(user)
    db.flush()
    db.add(PatientProfile(user_id=user.id))
    db.delete(row)

    audit.record(
        db,
        "auth.signup.verified",
        actor_id=user.id,
        actor_role=user.role,
        detail={"phone_sha256_prefix": _phone_hash_short(user.phone)},
    )
    db.commit()

    return TokenPair(
        access=make_token(user.id, user.role, "access"),
        refresh=make_token(user.id, user.role, "refresh"),
        role=user.role,
        user_id=str(user.id),
    )


@router.post("/signup/resend-otp", response_model=SignupResendOut)
def signup_resend_otp(body: SignupResendIn, db: Session = Depends(get_db)) -> SignupResendOut:
    row = db.query(PendingSignup).filter(PendingSignup.signup_token == body.signup_token).first()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "signup session expired or invalid")
    if row.resend_count >= MAX_RESEND:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "OTP resend limit reached")

    otp_code = MOCK_OTP_CODE if _is_dev() else f"{secrets.randbelow(1_000_000):06d}"
    row.otp_code_hash = _store_otp(otp_code)
    row.expires_at = _utcnow() + SIGNUP_TTL
    row.attempts = 0
    row.resend_count += 1
    db.commit()

    return SignupResendOut(
        expires_at=row.expires_at,
        resend_count=row.resend_count,
        otp=otp_code if _is_dev() else None,
    )


@router.post("/doctor/apply", response_model=DoctorApplyOut, status_code=status.HTTP_201_CREATED)
def doctor_apply(body: DoctorApplyIn, db: Session = Depends(get_db)) -> DoctorApplyOut:
    errs = _validate_password_strength(body.password, body.confirm_password)
    if errs:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            {"detail": "validation failed", "fields": errs},
        )

    field_errs: dict[str, str] = {}
    if db.query(User).filter(User.phone == body.phone).first():
        field_errs["phone"] = "এই ফোন নম্বরে ইতিমধ্যে একটি অ্যাকাউন্ট আছে"
    if db.query(User).filter(User.email == body.email).first():
        field_errs["email"] = "এই ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট আছে"
    if db.query(DoctorProfile).filter(DoctorProfile.bmdc_number == body.bmdc_number).first():
        field_errs["bmdc_number"] = "এই BMDC নম্বর দিয়ে আবেদন করা হয়েছে"
    if field_errs:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"detail": "duplicate account", "fields": field_errs},
        )

    now = _utcnow()
    auto_verified = _is_dev()
    user = User(
        id=uuid.uuid4(),
        role="doctor",
        phone=body.phone,
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        language="bn",
        phone_verified_at=now,
        last_login_at=now,
    )
    db.add(user)
    db.flush()
    db.add(
        DoctorProfile(
            user_id=user.id,
            bmdc_number=body.bmdc_number,
            qualifications=[],
            specialties=body.specialties,
            fee_tier=body.fee_tier,
            chambers=[
                {
                    "name": body.chamber_name,
                    "address": body.chamber_address or None,
                    "hours": body.chamber_hours or None,
                }
            ],
            verified=auto_verified,
            bio=body.bio or None,
        )
    )
    audit.record(
        db,
        "auth.doctor.application.submitted",
        actor_id=user.id,
        actor_role="doctor",
        detail={
            "bmdc_number": body.bmdc_number,
            "specialties": body.specialties,
            "auto_verified": auto_verified,
        },
    )
    db.commit()

    return DoctorApplyOut(
        access=make_token(user.id, user.role, "access"),
        refresh=make_token(user.id, user.role, "refresh"),
        role=user.role,
        user_id=str(user.id),
        verified=auto_verified,
        pending=not auto_verified,
    )


# ---------- password login ----------

class PasswordLoginIn(BaseModel):
    identifier: Annotated[str, StringConstraints(min_length=3, max_length=254)]
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]


@router.post("/login/password", response_model=TokenPair)
def login_password(body: PasswordLoginIn, db: Session = Depends(get_db)) -> TokenPair:
    identifier = body.identifier.strip()
    if _is_email(identifier):
        user = db.query(User).filter(User.email == identifier.lower()).first()
    else:
        user = db.query(User).filter(User.phone == _normalize_phone(identifier)).first()

    if user is None or user.password_hash is None:
        # Constant-ish work even on miss to dampen enumeration
        verify_password(body.password, "$argon2id$v=19$m=65536,t=3,p=4$" + "A" * 22 + "$" + "B" * 43)
        audit.record(
            db,
            "auth.login.password.failure",
            detail={"reason": "no_user_or_no_password"},
        )
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")

    now = _utcnow()
    if user.locked_until and user.locked_until > now:
        raise HTTPException(
            status.HTTP_423_LOCKED,
            f"account locked until {user.locked_until.isoformat()}",
        )

    if not verify_password(body.password, user.password_hash):
        user.failed_login_count += 1
        if user.failed_login_count >= MAX_LOGIN_FAILURES:
            user.locked_until = now + LOCKOUT_DURATION
            audit.record(
                db,
                "auth.account.locked",
                actor_id=user.id,
                actor_role=user.role,
                detail={"failures": user.failed_login_count},
            )
        audit.record(
            db,
            "auth.login.password.failure",
            actor_id=user.id,
            actor_role=user.role,
            detail={"attempts": user.failed_login_count},
        )
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")

    # Success — reset counter, update last_login_at
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    audit.record(
        db,
        "auth.login.password.success",
        actor_id=user.id,
        actor_role=user.role,
        detail={"identifier_kind": "email" if _is_email(identifier) else "phone"},
    )
    db.commit()

    return TokenPair(
        access=make_token(user.id, user.role, "access"),
        refresh=make_token(user.id, user.role, "refresh"),
        role=user.role,
        user_id=str(user.id),
    )


# ---------- legacy OTP login (seeded doctors / no-password users) ----------

class OtpRequestIn(BaseModel):
    phone: Annotated[str, StringConstraints(min_length=8, max_length=20)]

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return _normalize_phone(v)


class OtpRequestOut(BaseModel):
    ok: bool
    dev_hint: str | None = None


class OtpVerifyIn(BaseModel):
    phone: Annotated[str, StringConstraints(min_length=8, max_length=20)]
    code: Annotated[str, StringConstraints(min_length=4, max_length=8)]
    full_name: str | None = None

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return _normalize_phone(v)


def _issue_otp(db: Session, phone: str, purpose: str) -> str:
    code = MOCK_OTP_CODE if _is_dev() else f"{secrets.randbelow(1_000_000):06d}"
    stored = _store_otp(code)
    expires_at = _utcnow() + OTP_TTL

    existing = db.get(OtpCode, phone)
    if existing:
        existing.code_hash = stored
        existing.purpose = purpose
        existing.expires_at = expires_at
        existing.attempts = 0
    else:
        db.add(
            OtpCode(
                phone=phone, code_hash=stored, purpose=purpose, expires_at=expires_at
            )
        )
    return code


@router.post("/login/otp/request", response_model=OtpRequestOut)
def login_otp_request(body: OtpRequestIn, db: Session = Depends(get_db)) -> OtpRequestOut:
    _issue_otp(db, body.phone, purpose="login")
    audit.record(
        db, "auth.otp.requested", detail={"phone_sha256_prefix": _phone_hash_short(body.phone)}
    )
    db.commit()
    return OtpRequestOut(
        ok=True, dev_hint=f"dev OTP is {MOCK_OTP_CODE}" if _is_dev() else None
    )


@router.post("/login/otp/verify", response_model=TokenPair)
def login_otp_verify(body: OtpVerifyIn, db: Session = Depends(get_db)) -> TokenPair:
    row = db.get(OtpCode, body.phone)
    if row is None or row.purpose != "login":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "request OTP first")
    if row.expires_at < _utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP expired")
    if row.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too many attempts")
    if not _verify_otp(body.code, row.code_hash):
        row.attempts += 1
        audit.record(db, "auth.otp.failed", detail={"attempts": row.attempts})
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "wrong OTP code")

    user = db.query(User).filter(User.phone == body.phone).one_or_none()
    new_user = False
    now = _utcnow()
    if user is None:
        user = User(
            id=uuid.uuid4(),
            role="patient",
            phone=body.phone,
            full_name=body.full_name or "নতুন ব্যবহারকারী",
            language="bn",
            phone_verified_at=now,
            last_login_at=now,
        )
        db.add(user)
        db.flush()
        db.add(PatientProfile(user_id=user.id))
        new_user = True
    else:
        if user.phone_verified_at is None:
            user.phone_verified_at = now
        user.last_login_at = now

    db.delete(row)
    audit.record(
        db,
        "auth.login",
        actor_id=user.id,
        actor_role=user.role,
        detail={"new_user": new_user, "kind": "otp"},
    )
    db.commit()

    return TokenPair(
        access=make_token(user.id, user.role, "access"),
        refresh=make_token(user.id, user.role, "refresh"),
        role=user.role,
        user_id=str(user.id),
    )


# ---------- password reset ----------

class ResetStartIn(BaseModel):
    phone: Annotated[str, StringConstraints(min_length=8, max_length=20)]

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return _normalize_phone(v)


class ResetStartOut(BaseModel):
    reset_token: str
    expires_at: datetime
    otp: str | None = None


class ResetConfirmIn(BaseModel):
    phone: Annotated[str, StringConstraints(min_length=8, max_length=20)]
    code: Annotated[str, StringConstraints(min_length=4, max_length=8)]
    new_password: Annotated[str, StringConstraints(min_length=8, max_length=128)]

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return _normalize_phone(v)


@router.post("/password/reset/start", response_model=ResetStartOut)
def password_reset_start(body: ResetStartIn, db: Session = Depends(get_db)) -> ResetStartOut:
    user = db.query(User).filter(User.phone == body.phone).first()
    # Don't leak existence — always proceed, but only actually issue if user exists
    expires_at = _utcnow() + OTP_TTL
    reset_token = secrets.token_hex(16)
    otp_code: str | None = None
    if user is not None:
        otp_code = _issue_otp(db, body.phone, purpose="reset")
        audit.record(
            db,
            "auth.password.reset.started",
            actor_id=user.id,
            actor_role=user.role,
            detail={"phone_sha256_prefix": _phone_hash_short(body.phone)},
        )
        db.commit()

    return ResetStartOut(
        reset_token=reset_token,
        expires_at=expires_at,
        otp=otp_code if (_is_dev() and otp_code) else None,
    )


@router.post("/password/reset/confirm", response_model=TokenPair)
def password_reset_confirm(
    body: ResetConfirmIn, db: Session = Depends(get_db)
) -> TokenPair:
    errs = _validate_password_strength(body.new_password, body.new_password)
    if errs:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            {"detail": "validation failed", "fields": errs},
        )

    row = db.get(OtpCode, body.phone)
    if row is None or row.purpose != "reset":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "request a reset OTP first")
    if row.expires_at < _utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP expired")
    if row.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too many attempts")
    if not _verify_otp(body.code, row.code_hash):
        row.attempts += 1
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "wrong OTP code")

    user = db.query(User).filter(User.phone == body.phone).first()
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "user not found")

    user.password_hash = hash_password(body.new_password)
    user.failed_login_count = 0
    user.locked_until = None
    if user.phone_verified_at is None:
        user.phone_verified_at = _utcnow()
    user.last_login_at = _utcnow()
    db.delete(row)

    audit.record(
        db,
        "auth.password.reset.confirmed",
        actor_id=user.id,
        actor_role=user.role,
        detail={"phone_sha256_prefix": _phone_hash_short(body.phone)},
    )
    db.commit()

    return TokenPair(
        access=make_token(user.id, user.role, "access"),
        refresh=make_token(user.id, user.role, "refresh"),
        role=user.role,
        user_id=str(user.id),
    )


# ---------- token mgmt ----------

@router.post("/refresh", response_model=AccessOut)
def refresh(body: RefreshIn) -> AccessOut:
    payload = decode_token(body.refresh, "refresh")
    user_id = uuid.UUID(payload["sub"])
    role = payload["role"]
    return AccessOut(access=make_token(user_id, role, "access"))


@router.post("/logout")
def logout() -> dict:
    return {"ok": True}
