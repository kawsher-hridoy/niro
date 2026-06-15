"""add reset_token to otp_codes

Revision ID: e8f3a1b4c9d2
Revises: a9b5d9e308af
Create Date: 2026-05-30 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8f3a1b4c9d2'
down_revision: Union[str, None] = 'a9b5d9e308af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add reset_token column to otp_codes table for password reset validation
    op.add_column('otp_codes', sa.Column('reset_token', sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column('otp_codes', 'reset_token')
