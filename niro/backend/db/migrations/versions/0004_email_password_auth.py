"""Fix #2 — email + password auth, pending signups, OTP purpose

Revision ID: 0004_email_password_auth
Revises: 28e9c4a069e8
Create Date: 2026-05-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_email_password_auth"
down_revision: Union[str, None] = "28e9c4a069e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users: new columns for email + password + verification + lockout
    op.add_column("users", sa.Column("email", sa.String(length=254), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.add_column(
        "users", sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "failed_login_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.add_column(
        "users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_index(
        "users_email_idx",
        "users",
        ["email"],
        unique=False,
        postgresql_where=sa.text("email IS NOT NULL"),
    )

    # otp_codes: add purpose column (login | reset)
    op.add_column(
        "otp_codes",
        sa.Column(
            "purpose",
            sa.String(length=16),
            nullable=False,
            server_default=sa.text("'login'"),
        ),
    )
    op.create_check_constraint(
        "ck_otp_codes_purpose", "otp_codes", "purpose IN ('login','reset')"
    )

    # pending_signups: holds signup state until OTP verified
    op.create_table(
        "pending_signups",
        sa.Column(
            "id",
            sa.UUID(),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("signup_token", sa.String(length=64), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("full_name", sa.String(length=128), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("otp_code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "attempts", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "resend_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("signup_token"),
    )
    op.create_index("pending_signups_phone_idx", "pending_signups", ["phone"])


def downgrade() -> None:
    op.drop_index("pending_signups_phone_idx", table_name="pending_signups")
    op.drop_table("pending_signups")

    op.drop_constraint("ck_otp_codes_purpose", "otp_codes", type_="check")
    op.drop_column("otp_codes", "purpose")

    op.drop_index("users_email_idx", table_name="users")
    op.drop_constraint("uq_users_email", "users", type_="unique")
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_count")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "phone_verified_at")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "email")
