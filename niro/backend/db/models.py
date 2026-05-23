"""ORM models for Phase A — the foundation tables.

PHI columns are commented inline (★). Encryption strategy is at-rest only
in dev; pgcrypto column-level encryption arrives in Phase F (see
docs/ai-safety/security-compliance.md).
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)  # ★
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)  # ★
    language: Mapped[str] = mapped_column(String(8), nullable=False, default="bn")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("role IN ('patient','doctor','admin')", name="ck_users_role"),
    )

    patient_profile: Mapped["PatientProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    doctor_profile: Mapped["DoctorProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class OtpCode(Base):
    __tablename__ = "otp_codes"

    phone: Mapped[str] = mapped_column(String(20), primary_key=True)
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)  # ★
    sex: Mapped[str | None] = mapped_column(String(1), nullable=True)
    allergies: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")  # ★
    conditions: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")  # ★
    height_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    __table_args__ = (
        CheckConstraint("sex IN ('M','F','O')", name="ck_patient_profiles_sex"),
    )

    user: Mapped[User] = relationship(back_populates="patient_profile")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    bmdc_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    qualifications: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    specialties: Mapped[list] = mapped_column(
        ARRAY(String(32)), nullable=False, server_default="{}"
    )
    fee_tier: Mapped[int] = mapped_column(Integer, nullable=False)
    chambers: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    device_id_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    __table_args__ = (
        CheckConstraint("fee_tier IN (1,2,3)", name="ck_doctor_profiles_fee_tier"),
    )

    user: Mapped[User] = relationship(back_populates="doctor_profile")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = _uuid_pk()
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    original_name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # ★
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    source: Mapped[str] = mapped_column(String(32), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "kind IN ('prescription','lab_report','discharge','other')",
            name="ck_documents_kind",
        ),
        CheckConstraint(
            "source IN ('patient_upload','doctor_added')",
            name="ck_documents_source",
        ),
    )
