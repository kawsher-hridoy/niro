"""SQLAlchemy Declarative Base. ORM models attach here.

Models are defined in db/models.py (Phase A: users, otp_codes, patient_profiles,
doctor_profiles, documents). Alembic discovers them via the import in
db/migrations/env.py.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
