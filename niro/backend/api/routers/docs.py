"""Live /docs module — YC-style pitch deck + technical documentation + admin access control."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.db.models import (
    Analysis,
    ChamberSession,
    Consent,
    Conversation,
    Document,
    DoctorProfile,
    DocsConfig,
    DocsSection,
    DocsTeamMember,
    HealthMetric,
    User,
    VerificationRequest,
)
from backend.db.session import get_db
from backend.services.auth import current_user, require_admin


router = APIRouter(tags=["docs"])


# ---------- Pydantic Models ----------


class DocsConfigOut(BaseModel):
    is_available: bool
    is_public: bool
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    message: str | None = None


class DocsSectionOut(BaseModel):
    section_key: str
    title: str
    content: str
    order: int


class DocsTeamMemberOut(BaseModel):
    id: str
    full_name: str
    role: str
    email: str
    photo_url: str | None = None
    order: int


class DocsLiveStatsOut(BaseModel):
    total_users: int
    total_patients: int
    total_doctors: int
    total_documents: int
    total_analyses: int
    total_verifications: int
    avg_confidence: float
    total_health_metrics: int
    total_conversations: int
    total_chamber_sessions: int


class DocsFeatureOut(BaseModel):
    name: str
    description: str
    status: Literal["live", "beta", "planned"]
    count: int | None = None


class DocsTechStackOut(BaseModel):
    category: str
    items: list[dict[str, str]]


class DocsConfigUpdateIn(BaseModel):
    is_public: bool | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None


class DocsSectionCreateIn(BaseModel):
    section_key: str
    title: str
    content: str
    order: int = 0
    is_published: bool = True


class DocsSectionUpdateIn(BaseModel):
    title: str | None = None
    content: str | None = None
    order: int | None = None
    is_published: bool | None = None


class DocsTeamMemberCreateIn(BaseModel):
    full_name: str
    role: str
    email: str
    photo_url: str | None = None
    order: int = 0
    is_published: bool = True


class DocsTeamMemberUpdateIn(BaseModel):
    full_name: str | None = None
    role: str | None = None
    email: str | None = None
    photo_url: str | None = None
    order: int | None = None
    is_published: bool | None = None


# ---------- Helper Functions ----------


def is_docs_available(db: Session) -> tuple[bool, str | None]:
    """Check if /docs is publicly accessible based on config.

    Returns:
        (is_available, message): True if available, plus optional message
    """
    config = db.get(DocsConfig, 1)
    if not config:
        return False, "Documentation not configured"

    if not config.is_public:
        return False, "Documentation is currently private"

    now = datetime.now(timezone.utc)

    # Check time window if set
    if config.start_datetime and now < config.start_datetime:
        return False, f"Documentation will be available from {config.start_datetime.strftime('%B %d, %Y')}"

    if config.end_datetime and now > config.end_datetime:
        return False, "Documentation access period has ended"

    return True, None


# ---------- Public Endpoints ----------


@router.get("/docs/config", response_model=DocsConfigOut)
def get_docs_config(db: Session = Depends(get_db)) -> DocsConfigOut:
    """Check if docs are available and get scheduling info."""
    config = db.get(DocsConfig, 1)
    if not config:
        return DocsConfigOut(
            is_available=False,
            is_public=False,
            message="Documentation not configured"
        )

    available, message = is_docs_available(db)

    return DocsConfigOut(
        is_available=available,
        is_public=config.is_public,
        start_datetime=config.start_datetime,
        end_datetime=config.end_datetime,
        message=message
    )


@router.get("/docs/sections", response_model=list[DocsSectionOut])
def get_docs_sections(db: Session = Depends(get_db)) -> list[DocsSectionOut]:
    """Get all published documentation sections, ordered."""
    available, message = is_docs_available(db)
    if not available:
        raise HTTPException(status.HTTP_403_FORBIDDEN, message or "Documentation not available")

    sections = db.execute(
        select(DocsSection)
        .where(DocsSection.is_published == True)
        .order_by(DocsSection.order)
    ).scalars().all()

    return [
        DocsSectionOut(
            section_key=s.section_key,
            title=s.title,
            content=s.content,
            order=s.order
        )
        for s in sections
    ]


@router.get("/docs/team", response_model=list[DocsTeamMemberOut])
def get_docs_team(db: Session = Depends(get_db)) -> list[DocsTeamMemberOut]:
    """Get all published team members, ordered."""
    available, message = is_docs_available(db)
    if not available:
        raise HTTPException(status.HTTP_403_FORBIDDEN, message or "Documentation not available")

    members = db.execute(
        select(DocsTeamMember)
        .where(DocsTeamMember.is_published == True)
        .order_by(DocsTeamMember.order)
    ).scalars().all()

    return [
        DocsTeamMemberOut(
            id=str(m.id),
            full_name=m.full_name,
            role=m.role,
            email=m.email,
            photo_url=m.photo_url,
            order=m.order
        )
        for m in members
    ]


@router.get("/docs/live-stats", response_model=DocsLiveStatsOut)
def get_docs_live_stats(db: Session = Depends(get_db)) -> DocsLiveStatsOut:
    """Get real-time system statistics."""
    available, message = is_docs_available(db)
    if not available:
        raise HTTPException(status.HTTP_403_FORBIDDEN, message or "Documentation not available")

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_patients = db.query(func.count(User.id)).filter(User.role == "patient").scalar() or 0
    total_doctors = db.query(func.count(DoctorProfile.user_id)).filter(DoctorProfile.verified == True).scalar() or 0
    total_documents = db.query(func.count(Document.id)).scalar() or 0
    total_analyses = db.query(func.count(Analysis.id)).scalar() or 0
    total_verifications = db.query(func.count(VerificationRequest.id)).filter(
        VerificationRequest.payment_status == "paid"
    ).scalar() or 0
    avg_confidence = db.query(func.avg(Analysis.confidence)).scalar() or 0.0
    total_health_metrics = db.query(func.count(HealthMetric.id)).scalar() or 0
    total_conversations = db.query(func.count(Conversation.id)).scalar() or 0
    total_chamber_sessions = db.query(func.count(ChamberSession.id)).scalar() or 0

    return DocsLiveStatsOut(
        total_users=int(total_users),
        total_patients=int(total_patients),
        total_doctors=int(total_doctors),
        total_documents=int(total_documents),
        total_analyses=int(total_analyses),
        total_verifications=int(total_verifications),
        avg_confidence=float(avg_confidence),
        total_health_metrics=int(total_health_metrics),
        total_conversations=int(total_conversations),
        total_chamber_sessions=int(total_chamber_sessions),
    )


@router.get("/docs/features", response_model=list[DocsFeatureOut])
def get_docs_features(db: Session = Depends(get_db)) -> list[DocsFeatureOut]:
    """Get feature matrix with live counts."""
    available, message = is_docs_available(db)
    if not available:
        raise HTTPException(status.HTTP_403_FORBIDDEN, message or "Documentation not available")

    total_documents = db.query(func.count(Document.id)).scalar() or 0
    total_analyses = db.query(func.count(Analysis.id)).scalar() or 0
    total_verifications = db.query(func.count(VerificationRequest.id)).filter(
        VerificationRequest.payment_status == "paid"
    ).scalar() or 0
    total_conversations = db.query(func.count(Conversation.id)).scalar() or 0
    total_health_metrics = db.query(func.count(HealthMetric.id)).scalar() or 0
    total_chamber_sessions = db.query(func.count(ChamberSession.id)).scalar() or 0

    return [
        DocsFeatureOut(
            name="AI Document Analysis",
            description="Upload prescriptions and lab reports, get AI-powered Bangla explanations",
            status="live",
            count=int(total_analyses)
        ),
        DocsFeatureOut(
            name="Document Upload & Storage",
            description="Secure cloud storage for all medical documents",
            status="live",
            count=int(total_documents)
        ),
        DocsFeatureOut(
            name="Doctor Verification",
            description="On-demand doctor review of AI analysis",
            status="live",
            count=int(total_verifications)
        ),
        DocsFeatureOut(
            name="Document Chat",
            description="Ask follow-up questions about your analysis",
            status="live",
            count=int(total_conversations)
        ),
        DocsFeatureOut(
            name="Health Metrics Tracking",
            description="Automatic extraction and trending of lab values",
            status="live",
            count=int(total_health_metrics)
        ),
        DocsFeatureOut(
            name="Chamber QR Sessions",
            description="Real-time profile sharing in doctor's chamber",
            status="live",
            count=int(total_chamber_sessions)
        ),
        DocsFeatureOut(
            name="Consent Management",
            description="Granular, time-bound access control for doctors",
            status="live",
            count=None
        ),
        DocsFeatureOut(
            name="Audit Logging",
            description="Complete access trail for patient transparency",
            status="live",
            count=None
        ),
    ]


@router.get("/docs/tech-stack", response_model=list[DocsTechStackOut])
def get_docs_tech_stack(db: Session = Depends(get_db)) -> list[DocsTechStackOut]:
    """Get technology stack information."""
    available, message = is_docs_available(db)
    if not available:
        raise HTTPException(status.HTTP_403_FORBIDDEN, message or "Documentation not available")

    return [
        DocsTechStackOut(
            category="Frontend",
            items=[
                {"name": "Next.js", "version": "16.2.6", "purpose": "React framework with App Router"},
                {"name": "React", "version": "19.2", "purpose": "UI library"},
                {"name": "Tailwind CSS", "version": "4", "purpose": "Utility-first styling"},
                {"name": "TypeScript", "version": "5.x", "purpose": "Type safety"},
            ]
        ),
        DocsTechStackOut(
            category="Backend",
            items=[
                {"name": "FastAPI", "version": "0.115", "purpose": "Python web framework"},
                {"name": "SQLAlchemy", "version": "2.0", "purpose": "ORM"},
                {"name": "Alembic", "version": "1.14", "purpose": "Database migrations"},
                {"name": "Pydantic", "version": "2.x", "purpose": "Data validation"},
            ]
        ),
        DocsTechStackOut(
            category="Database",
            items=[
                {"name": "PostgreSQL", "version": "16", "purpose": "Primary database"},
                {"name": "pgvector", "version": "0.5", "purpose": "Vector similarity (planned)"},
            ]
        ),
        DocsTechStackOut(
            category="AI & ML",
            items=[
                {"name": "Azure OpenAI", "version": "gpt-chat-latest", "purpose": "Vision + Bangla generation"},
                {"name": "PyMuPDF", "version": "1.24", "purpose": "PDF rasterization"},
            ]
        ),
        DocsTechStackOut(
            category="Infrastructure",
            items=[
                {"name": "Azure VM", "version": "Standard_B2s", "purpose": "Application hosting"},
                {"name": "Caddy", "version": "2.x", "purpose": "Reverse proxy + TLS"},
                {"name": "systemd", "version": "-", "purpose": "Process management"},
            ]
        ),
    ]


# ---------- Admin Endpoints ----------


@router.patch("/docs/config", response_model=DocsConfigOut)
def update_docs_config(
    body: DocsConfigUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)
) -> DocsConfigOut:
    """Update docs visibility and scheduling (admin only)."""
    config = db.get(DocsConfig, 1)
    if not config:
        config = DocsConfig(id=1, is_public=False)
        db.add(config)

    if body.is_public is not None:
        config.is_public = body.is_public
    if body.start_datetime is not None:
        config.start_datetime = body.start_datetime
    if body.end_datetime is not None:
        config.end_datetime = body.end_datetime

    config.updated_by = user.id
    config.updated_at = datetime.now(timezone.utc)

    db.commit()

    available, message = is_docs_available(db)

    return DocsConfigOut(
        is_available=available,
        is_public=config.is_public,
        start_datetime=config.start_datetime,
        end_datetime=config.end_datetime,
        message=message
    )


@router.post("/docs/sections", response_model=DocsSectionOut, status_code=status.HTTP_201_CREATED)
def create_docs_section(
    body: DocsSectionCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)
) -> DocsSectionOut:
    """Create a new documentation section (admin only)."""
    # Check if section_key already exists
    existing = db.execute(
        select(DocsSection).where(DocsSection.section_key == body.section_key)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Section '{body.section_key}' already exists")

    section = DocsSection(
        section_key=body.section_key,
        title=body.title,
        content=body.content,
        order=body.order,
        is_published=body.is_published
    )
    db.add(section)
    db.commit()

    return DocsSectionOut(
        section_key=section.section_key,
        title=section.title,
        content=section.content,
        order=section.order
    )


@router.patch("/docs/sections/{section_key}", response_model=DocsSectionOut)
def update_docs_section(
    section_key: str,
    body: DocsSectionUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)
) -> DocsSectionOut:
    """Update a documentation section (admin only)."""
    section = db.execute(
        select(DocsSection).where(DocsSection.section_key == section_key)
    ).scalar_one_or_none()

    if not section:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Section '{section_key}' not found")

    if body.title is not None:
        section.title = body.title
    if body.content is not None:
        section.content = body.content
    if body.order is not None:
        section.order = body.order
    if body.is_published is not None:
        section.is_published = body.is_published

    section.updated_at = datetime.now(timezone.utc)
    db.commit()

    return DocsSectionOut(
        section_key=section.section_key,
        title=section.title,
        content=section.content,
        order=section.order
    )


@router.delete("/docs/sections/{section_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_docs_section(
    section_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)
) -> None:
    """Delete a documentation section (admin only)."""
    section = db.execute(
        select(DocsSection).where(DocsSection.section_key == section_key)
    ).scalar_one_or_none()

    if not section:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Section '{section_key}' not found")

    db.delete(section)
    db.commit()


@router.post("/docs/team", response_model=DocsTeamMemberOut, status_code=status.HTTP_201_CREATED)
def create_team_member(
    body: DocsTeamMemberCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)
) -> DocsTeamMemberOut:
    """Add a team member (admin only)."""
    member = DocsTeamMember(
        full_name=body.full_name,
        role=body.role,
        email=body.email,
        photo_url=body.photo_url,
        order=body.order,
        is_published=body.is_published
    )
    db.add(member)
    db.commit()

    return DocsTeamMemberOut(
        id=str(member.id),
        full_name=member.full_name,
        role=member.role,
        email=member.email,
        photo_url=member.photo_url,
        order=member.order
    )


@router.patch("/docs/team/{member_id}", response_model=DocsTeamMemberOut)
def update_team_member(
    member_id: str,
    body: DocsTeamMemberUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)
) -> DocsTeamMemberOut:
    """Update a team member (admin only)."""
    import uuid

    try:
        member_uuid = uuid.UUID(member_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid member ID")

    member = db.get(DocsTeamMember, member_uuid)
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team member not found")

    if body.full_name is not None:
        member.full_name = body.full_name
    if body.role is not None:
        member.role = body.role
    if body.email is not None:
        member.email = body.email
    if body.photo_url is not None:
        member.photo_url = body.photo_url
    if body.order is not None:
        member.order = body.order
    if body.is_published is not None:
        member.is_published = body.is_published

    db.commit()

    return DocsTeamMemberOut(
        id=str(member.id),
        full_name=member.full_name,
        role=member.role,
        email=member.email,
        photo_url=member.photo_url,
        order=member.order
    )


@router.delete("/docs/team/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_member(
    member_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)
) -> None:
    """Remove a team member (admin only)."""
    import uuid

    try:
        member_uuid = uuid.UUID(member_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid member ID")

    member = db.get(DocsTeamMember, member_uuid)
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Team member not found")

    db.delete(member)
    db.commit()
