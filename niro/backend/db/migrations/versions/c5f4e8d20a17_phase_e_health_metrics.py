"""phase E: health_metrics (trendable lab values)

Revision ID: c5f4e8d20a17
Revises: b3e2d7a91c44
Create Date: 2026-05-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c5f4e8d20a17"
down_revision: Union[str, None] = "b3e2d7a91c44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "health_metrics",
        sa.Column(
            "id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column("patient_id", sa.UUID(), nullable=False),
        sa.Column("analysis_id", sa.UUID(), nullable=False),
        sa.Column("document_id", sa.UUID(), nullable=True),
        sa.Column("metric_key", sa.String(length=64), nullable=False),
        sa.Column("label_bn", sa.String(length=128), nullable=True),
        sa.Column("value_num", sa.Numeric(precision=12, scale=3), nullable=True),
        sa.Column("value_text", sa.String(length=128), nullable=True),
        sa.Column("unit", sa.String(length=32), nullable=True),
        sa.Column("ref_low", sa.Numeric(precision=12, scale=3), nullable=True),
        sa.Column("ref_high", sa.Numeric(precision=12, scale=3), nullable=True),
        sa.Column(
            "abnormal", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("measured_at", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["patient_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_health_metrics_patient_key_date",
        "health_metrics",
        ["patient_id", "metric_key", "measured_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_health_metrics_patient_key_date", table_name="health_metrics")
    op.drop_table("health_metrics")
