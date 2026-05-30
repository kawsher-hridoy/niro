"""phase E: analysis report_type + report_date

Revision ID: b3e2d7a91c44
Revises: 7c1a9f4b2e10
Create Date: 2026-05-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b3e2d7a91c44"
down_revision: Union[str, None] = "7c1a9f4b2e10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("report_type", sa.String(length=64), nullable=True))
    op.add_column("analyses", sa.Column("report_date", sa.Date(), nullable=True))
    op.create_index(
        "ix_analyses_patient_reporttype_date",
        "analyses",
        ["patient_id", "report_type", "report_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_analyses_patient_reporttype_date", table_name="analyses")
    op.drop_column("analyses", "report_date")
    op.drop_column("analyses", "report_type")
