"""Patient profile + timeline + export + delete."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import and_, desc, func, select
from sqlalchemy.orm import Session

from backend.db.models import (
    AccessLog,
    Analysis,
    Consent,
    Document,
    DoctorProfile,
    HealthMetric,
    PatientProfile,
    User,
    VerificationRequest,
    VerificationReview,
)
from backend.db.session import get_db
from backend.services import audit
from backend.services.auth import current_user, require_patient


router = APIRouter(tags=["profile"])


class MeOut(BaseModel):
    user_id: str
    role: str
    phone: str
    full_name: str
    language: str
    dob: str | None = None
    sex: str | None = None
    allergies: list = []
    conditions: list = []
    doctor_verified: bool | None = None
    doctor_bmdc_number: str | None = None


class MePatchIn(BaseModel):
    full_name: str | None = None
    dob: str | None = None
    sex: str | None = None
    allergies: list | None = None
    conditions: list | None = None
    height_cm: int | None = None
    weight_kg: float | None = None


class TimelineEntryOut(BaseModel):
    entry_type: str  # 'document' | 'review' | 'analysis'
    occurred_at: datetime
    document_id: str | None = None
    analysis_id: str | None = None
    review_id: str | None = None
    title_bn: str
    subtitle_bn: str | None = None
    doctor_name: str | None = None


class AccessLogEntryOut(BaseModel):
    id: str
    doctor_id: str
    doctor_name: str | None
    screen: str
    document_id: str | None
    viewed_at: datetime
    location: str | None


class DashboardUserOut(BaseModel):
    id: str
    full_name: str
    phone: str


class DashboardCountsOut(BaseModel):
    documents: int
    analyses: int
    verifications: int
    active_consents: int
    doctor_views_30d: int


class DashboardDocumentOut(BaseModel):
    id: str
    kind: str
    uploaded_at: datetime
    analysis_id: str | None = None


class DashboardAnalysisOut(BaseModel):
    id: str
    document_id: str
    summary_bn: str
    confidence: float
    recommend_human_review: bool
    red_flag_count: int
    created_at: datetime


class DashboardAccessOut(BaseModel):
    doctor_name: str | None
    screen: str
    viewed_at: datetime
    context: Literal["async", "chamber"]


class DashboardOut(BaseModel):
    user: DashboardUserOut
    counts: DashboardCountsOut
    recent_documents: list[DashboardDocumentOut]
    recent_analyses: list[DashboardAnalysisOut]
    recent_access: list[DashboardAccessOut]


# Bangla labels for known fine-grained report types. Unknown slugs fall back
# to a humanized form of the slug itself.
_REPORT_TYPE_BN: dict[str, str] = {
    "prescription": "প্রেসক্রিপশন",
    "discharge_summary": "ডিসচার্জ সামারি",
    "cbc": "সিবিসি (রক্তের সম্পূর্ণ গণনা)",
    "lipid_panel": "লিপিড প্রোফাইল",
    "blood_sugar": "রক্তে শর্করা",
    "liver_function": "লিভার ফাংশন",
    "kidney_function": "কিডনি ফাংশন",
    "thyroid": "থাইরয়েড",
    "urinalysis": "প্রস্রাব পরীক্ষা",
    "echocardiography": "ইকোকার্ডিওগ্রাফি",
    "ecg": "ইসিজি",
    "chest_xray": "বুকের এক্স-রে",
    "ultrasound_abdomen": "পেটের আল্ট্রাসাউন্ড",
    "lab_report_other": "অন্যান্য ল্যাব রিপোর্ট",
}


def _report_type_label_bn(slug: str | None) -> str:
    if not slug:
        return "অন্যান্য রিপোর্ট"
    if slug in _REPORT_TYPE_BN:
        return _REPORT_TYPE_BN[slug]
    return slug.replace("_", " ").title()


class RecordItemOut(BaseModel):
    analysis_id: str
    document_id: str
    report_date: str | None = None
    uploaded_at: datetime
    confidence: float
    summary_bn: str
    original_name: str | None = None
    mime_type: str


class RecordGroupOut(BaseModel):
    report_type: str | None
    label_bn: str
    count: int
    latest_date: datetime
    items: list[RecordItemOut]


@router.get("/me/records", response_model=list[RecordGroupOut])
def records(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> list[RecordGroupOut]:
    """All analyses grouped by fine-grained report_type, newest group first."""
    rows = db.execute(
        select(Analysis, Document.original_name, Document.mime_type)
        .join(Document, Document.id == Analysis.document_id)
        .where(Analysis.patient_id == user.id)
        .order_by(desc(Analysis.created_at))
    ).all()

    groups: dict[str | None, list[RecordItemOut]] = {}
    latest: dict[str | None, datetime] = {}
    for a, original_name, mime_type in rows:
        key = a.report_type
        groups.setdefault(key, []).append(
            RecordItemOut(
                analysis_id=str(a.id),
                document_id=str(a.document_id),
                report_date=a.report_date.isoformat() if a.report_date else None,
                uploaded_at=a.created_at,
                confidence=float(a.confidence),
                summary_bn=(a.explanation_bn or "")[:80],
                original_name=original_name,
                mime_type=mime_type,
            )
        )
        if key not in latest or a.created_at > latest[key]:
            latest[key] = a.created_at

    result: list[RecordGroupOut] = []
    for key, items in groups.items():
        # Sort items within a group by the report's own date, fallback upload time.
        items.sort(
            key=lambda it: (it.report_date or it.uploaded_at.isoformat()),
            reverse=True,
        )
        result.append(
            RecordGroupOut(
                report_type=key,
                label_bn=_report_type_label_bn(key),
                count=len(items),
                latest_date=latest[key],
                items=items,
            )
        )
    result.sort(key=lambda g: g.latest_date, reverse=True)
    return result


class MetricSummaryOut(BaseModel):
    metric_key: str
    label_bn: str
    latest_value: float
    unit: str | None = None
    latest_date: str | None = None
    count: int
    abnormal: bool


class MetricPointOut(BaseModel):
    value_num: float
    unit: str | None = None
    ref_low: float | None = None
    ref_high: float | None = None
    abnormal: bool
    measured_at: str | None = None
    analysis_id: str
    document_id: str | None = None


class MetricInsightOut(BaseModel):
    first_value: float
    last_value: float
    delta: float  # last - first
    delta_pct: float | None = None  # (delta / first) * 100; None if first == 0
    slope_per_30d: float | None = None  # least-squares slope per 30 days
    span_days: int  # days between first and last measurement
    direction: str  # "improving" | "worsening" | "stable" | "increasing" | "decreasing"
    verdict_bn: str  # plain-Bangla one-liner


class MetricHistoryOut(BaseModel):
    metric_key: str
    label_bn: str
    unit: str | None = None
    ref_low: float | None = None
    ref_high: float | None = None
    points: list[MetricPointOut]
    insight: MetricInsightOut | None = None


# Metrics where a LOWER value is the desired direction (HbA1c down = improvement).
_LOWER_IS_BETTER: set[str] = {
    "blood_glucose_fasting",
    "blood_glucose_random",
    "blood_glucose_2hpp",
    "hba1c",
    "ldl_cholesterol",
    "total_cholesterol",
    "triglycerides",
    "creatinine",
    "urea",
    "alt_sgpt",
    "ast_sgot",
    "bilirubin_total",
    "uric_acid",
    "crp",
    "esr",
    "wbc",
    "blood_pressure_systolic",
    "blood_pressure_diastolic",
}
# Metrics where HIGHER is desired (HDL up = improvement, hemoglobin up = improvement).
_HIGHER_IS_BETTER: set[str] = {
    "hdl_cholesterol",
    "hemoglobin",
    "vitamin_d",
    "vitamin_b12",
    "lvef",
    "egfr",
}


_BN_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")


def _bn(value: object) -> str:
    """ASCII-digits → Bangla numerals on whatever str(value) produces."""
    return str(value).translate(_BN_DIGITS)


def _compute_insight(
    metric_key: str,
    label_bn: str,
    unit: str | None,
    rows: list[HealthMetric],
) -> MetricInsightOut | None:
    """Compute a trend insight + Bangla verdict from oldest-first metric rows.
    Returns None when fewer than 2 points exist (no trend yet)."""
    if len(rows) < 2:
        return None

    def _date(m: HealthMetric):
        return m.measured_at or m.created_at.date()

    first, last = rows[0], rows[-1]
    if first.value_num is None or last.value_num is None:
        return None

    first_v = float(first.value_num)
    last_v = float(last.value_num)
    delta = last_v - first_v
    delta_pct = (delta / first_v) * 100.0 if first_v != 0 else None
    span_days = max(0, (_date(last) - _date(first)).days)

    slope_per_30d: float | None = None
    if span_days > 0:
        x0 = _date(first)
        xs = [(_date(m) - x0).days for m in rows if m.value_num is not None]
        ys = [float(m.value_num) for m in rows if m.value_num is not None]
        n = len(xs)
        if n >= 2:
            mean_x = sum(xs) / n
            mean_y = sum(ys) / n
            num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
            den = sum((x - mean_x) ** 2 for x in xs)
            if den > 0:
                slope_per_30d = (num / den) * 30.0

    # Direction classification — symmetric around ±5% to call "stable".
    pct_for_dir = delta_pct if delta_pct is not None else (100.0 if delta > 0 else -100.0)
    if abs(pct_for_dir) < 5.0:
        direction = "stable"
    elif metric_key in _LOWER_IS_BETTER:
        direction = "improving" if delta < 0 else "worsening"
    elif metric_key in _HIGHER_IS_BETTER:
        direction = "improving" if delta > 0 else "worsening"
    else:
        # Unknown directionality: report change without judgment.
        direction = "increasing" if delta > 0 else "decreasing"

    direction_bn = {
        "improving": "উন্নতি",
        "worsening": "অবনতি",
        "stable": "স্থিতিশীল",
        "increasing": "বৃদ্ধি",
        "decreasing": "হ্রাস",
    }[direction]

    unit_str = f" {unit}" if unit else ""
    delta_pct_str = (
        f" ({'+' if delta > 0 else ''}{_bn(round(delta_pct, 1))}%)"
        if delta_pct is not None
        else ""
    )
    span_str = f"{_bn(span_days)} দিনে" if span_days > 0 else "একই দিনে"
    verdict_bn = (
        f"{span_str} {label_bn} {_bn(round(first_v, 2))}{unit_str} → "
        f"{_bn(round(last_v, 2))}{unit_str}{delta_pct_str} — {direction_bn}"
    )

    return MetricInsightOut(
        first_value=round(first_v, 3),
        last_value=round(last_v, 3),
        delta=round(delta, 3),
        delta_pct=round(delta_pct, 2) if delta_pct is not None else None,
        slope_per_30d=round(slope_per_30d, 4) if slope_per_30d is not None else None,
        span_days=span_days,
        direction=direction,
        verdict_bn=verdict_bn,
    )


def _metric_label_bn(key: str, fallback: str | None) -> str:
    if fallback:
        return fallback
    return key.replace("_", " ").title()


def _point_sort_key(m: HealthMetric) -> str:
    return m.measured_at.isoformat() if m.measured_at else m.created_at.isoformat()


@router.get("/me/metrics", response_model=list[MetricSummaryOut])
def metrics_summary(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> list[MetricSummaryOut]:
    """One row per metric the patient has data for, with its latest value."""
    rows = db.execute(
        select(HealthMetric)
        .where(HealthMetric.patient_id == user.id)
        .order_by(HealthMetric.metric_key)
    ).scalars().all()

    by_key: dict[str, list[HealthMetric]] = {}
    for m in rows:
        by_key.setdefault(m.metric_key, []).append(m)

    out: list[MetricSummaryOut] = []
    for key, ms in by_key.items():
        ms.sort(key=_point_sort_key)
        latest = ms[-1]
        out.append(
            MetricSummaryOut(
                metric_key=key,
                label_bn=_metric_label_bn(key, latest.label_bn),
                latest_value=float(latest.value_num) if latest.value_num is not None else 0.0,
                unit=latest.unit,
                latest_date=(latest.measured_at.isoformat() if latest.measured_at else None),
                count=len(ms),
                abnormal=bool(latest.abnormal),
            )
        )
    out.sort(key=lambda s: (not s.abnormal, s.label_bn))
    return out


@router.get("/me/metrics/{metric_key}", response_model=MetricHistoryOut)
def metric_history(
    metric_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> MetricHistoryOut:
    """Full time series for one metric, oldest-first, for charting."""
    rows = db.execute(
        select(HealthMetric)
        .where(HealthMetric.patient_id == user.id)
        .where(HealthMetric.metric_key == metric_key)
    ).scalars().all()
    rows.sort(key=_point_sort_key)

    label = _metric_label_bn(metric_key, rows[0].label_bn if rows else None)
    unit = next((r.unit for r in rows if r.unit), None)
    ref_low = next((float(r.ref_low) for r in rows if r.ref_low is not None), None)
    ref_high = next((float(r.ref_high) for r in rows if r.ref_high is not None), None)

    return MetricHistoryOut(
        metric_key=metric_key,
        label_bn=label,
        unit=unit,
        ref_low=ref_low,
        ref_high=ref_high,
        points=[
            MetricPointOut(
                value_num=float(r.value_num) if r.value_num is not None else 0.0,
                unit=r.unit,
                ref_low=float(r.ref_low) if r.ref_low is not None else None,
                ref_high=float(r.ref_high) if r.ref_high is not None else None,
                abnormal=bool(r.abnormal),
                measured_at=(r.measured_at.isoformat() if r.measured_at else None),
                analysis_id=str(r.analysis_id),
                document_id=str(r.document_id) if r.document_id else None,
            )
            for r in rows
        ],
        insight=_compute_insight(metric_key, label, unit, rows),
    )


@router.get("/me", response_model=MeOut)
def me(db: Session = Depends(get_db), user: User = Depends(current_user)) -> MeOut:
    pp = db.get(PatientProfile, user.id)
    dp = db.get(DoctorProfile, user.id) if user.role == "doctor" else None
    return MeOut(
        user_id=str(user.id),
        role=user.role,
        phone=user.phone,
        full_name=user.full_name,
        language=user.language,
        dob=pp.dob.isoformat() if pp and pp.dob else None,
        sex=pp.sex if pp else None,
        allergies=pp.allergies if pp else [],
        conditions=pp.conditions if pp else [],
        doctor_verified=dp.verified if dp else None,
        doctor_bmdc_number=dp.bmdc_number if dp else None,
    )


@router.patch("/me", response_model=MeOut)
def update_me(
    body: MePatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> MeOut:
    if body.full_name:
        user.full_name = body.full_name
    pp = db.get(PatientProfile, user.id)
    if pp is None:
        pp = PatientProfile(user_id=user.id)
        db.add(pp)
    if body.dob:
        from datetime import date
        pp.dob = date.fromisoformat(body.dob)
    if body.sex:
        pp.sex = body.sex
    if body.allergies is not None:
        pp.allergies = body.allergies
    if body.conditions is not None:
        pp.conditions = body.conditions
    if body.height_cm is not None:
        pp.height_cm = body.height_cm
    if body.weight_kg is not None:
        pp.weight_kg = body.weight_kg
    db.commit()
    return me(db, user)


@router.get("/me/dashboard", response_model=DashboardOut)
def dashboard(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> DashboardOut:
    now = datetime.now(timezone.utc)
    views_since = now - timedelta(days=30)

    counts_row = db.execute(
        select(
            select(func.count(Document.id))
            .where(Document.patient_id == user.id)
            .scalar_subquery()
            .label("documents"),
            select(func.count(Analysis.id))
            .where(Analysis.patient_id == user.id)
            .scalar_subquery()
            .label("analyses"),
            select(func.count(VerificationRequest.id))
            .outerjoin(
                VerificationReview,
                VerificationReview.request_id == VerificationRequest.id,
            )
            .where(VerificationRequest.patient_id == user.id)
            .where(VerificationRequest.payment_status == "paid")
            .where(VerificationReview.id.is_not(None))
            .scalar_subquery()
            .label("verifications"),
            select(func.count(Consent.id))
            .where(Consent.patient_id == user.id)
            .where(Consent.revoked_at.is_(None))
            .where(Consent.expires_at > now)
            .scalar_subquery()
            .label("active_consents"),
            select(func.count(AccessLog.id))
            .where(AccessLog.patient_id == user.id)
            .where(AccessLog.viewed_at >= views_since)
            .scalar_subquery()
            .label("doctor_views_30d"),
        )
    ).one()._mapping

    latest_analysis = (
        select(
            Analysis.document_id.label("document_id"),
            Analysis.id.label("analysis_id"),
            func.row_number()
            .over(partition_by=Analysis.document_id, order_by=desc(Analysis.created_at))
            .label("rn"),
        )
        .where(Analysis.patient_id == user.id)
        .subquery()
    )

    doc_rows = db.execute(
        select(Document.id, Document.kind, Document.uploaded_at, latest_analysis.c.analysis_id)
        .outerjoin(
            latest_analysis,
            and_(
                latest_analysis.c.document_id == Document.id,
                latest_analysis.c.rn == 1,
            ),
        )
        .where(Document.patient_id == user.id)
        .order_by(desc(Document.uploaded_at))
        .limit(5)
    ).all()

    analysis_rows = db.execute(
        select(Analysis)
        .where(Analysis.patient_id == user.id)
        .order_by(desc(Analysis.created_at))
        .limit(3)
    ).scalars().all()

    access_rows = db.execute(
        select(AccessLog, User.full_name, Consent.context)
        .join(User, User.id == AccessLog.doctor_id)
        .outerjoin(Consent, Consent.id == AccessLog.consent_id)
        .where(AccessLog.patient_id == user.id)
        .order_by(desc(AccessLog.viewed_at))
        .limit(3)
    ).all()

    return DashboardOut(
        user=DashboardUserOut(
            id=str(user.id),
            full_name=user.full_name,
            phone=user.phone,
        ),
        counts=DashboardCountsOut(
            documents=int(counts_row["documents"] or 0),
            analyses=int(counts_row["analyses"] or 0),
            verifications=int(counts_row["verifications"] or 0),
            active_consents=int(counts_row["active_consents"] or 0),
            doctor_views_30d=int(counts_row["doctor_views_30d"] or 0),
        ),
        recent_documents=[
            DashboardDocumentOut(
                id=str(doc_id),
                kind=kind,
                uploaded_at=uploaded_at,
                analysis_id=str(analysis_id) if analysis_id else None,
            )
            for doc_id, kind, uploaded_at, analysis_id in doc_rows
        ],
        recent_analyses=[
            DashboardAnalysisOut(
                id=str(a.id),
                document_id=str(a.document_id),
                summary_bn=(a.explanation_bn or "")[:80],
                confidence=float(a.confidence),
                recommend_human_review=float(a.confidence) < 0.5,
                red_flag_count=len(a.red_flags or []),
                created_at=a.created_at,
            )
            for a in analysis_rows
        ],
        recent_access=[
            DashboardAccessOut(
                doctor_name=doctor_name,
                screen=row.screen,
                viewed_at=row.viewed_at,
                context="chamber"
                if (consent_context == "chamber" or (row.location or "").startswith("chamber:"))
                else "async",
            )
            for row, doctor_name, consent_context in access_rows
        ],
    )


@router.get("/me/timeline", response_model=list[TimelineEntryOut])
def timeline(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> list[TimelineEntryOut]:
    entries: list[TimelineEntryOut] = []

    docs = db.execute(
        select(Document)
        .where(Document.patient_id == user.id)
        .order_by(desc(Document.uploaded_at))
    ).scalars().all()
    for d in docs:
        kind_bn = {
            "prescription": "প্রেসক্রিপশন",
            "lab_report": "ল্যাব রিপোর্ট",
            "discharge": "ডিসচার্জ সামারি",
            "other": "ডকুমেন্ট",
        }.get(d.kind, d.kind)
        entries.append(
            TimelineEntryOut(
                entry_type="document",
                occurred_at=d.uploaded_at,
                document_id=str(d.id),
                title_bn=f"{kind_bn} আপলোড",
                subtitle_bn=d.original_name,
            )
        )

    anls = db.execute(
        select(Analysis)
        .where(Analysis.patient_id == user.id)
        .order_by(desc(Analysis.created_at))
    ).scalars().all()
    for a in anls:
        entries.append(
            TimelineEntryOut(
                entry_type="analysis",
                occurred_at=a.created_at,
                analysis_id=str(a.id),
                document_id=str(a.document_id),
                title_bn="AI বিশ্লেষণ",
                subtitle_bn=(a.explanation_bn or "")[:80],
            )
        )

    revs = db.execute(
        select(VerificationReview, User.full_name)
        .join(User, User.id == VerificationReview.doctor_id)
        .where(VerificationReview.patient_id == user.id)
        .order_by(desc(VerificationReview.submitted_at))
    ).all()
    for r, doctor_name in revs:
        disp_bn = {
            "agree": "AI-এর সাথে একমত",
            "concerns": "কিছু আপত্তি আছে",
            "escalate": "আরও বিশেষজ্ঞ লাগবে",
        }.get(r.disposition, r.disposition)
        entries.append(
            TimelineEntryOut(
                entry_type="review",
                occurred_at=r.submitted_at,
                review_id=str(r.id),
                doctor_name=doctor_name,
                title_bn=f"ডাক্তার পর্যালোচনা — {disp_bn}",
                subtitle_bn=(r.doctor_notes_bn or "")[:80],
            )
        )

    entries.sort(key=lambda e: e.occurred_at, reverse=True)
    return entries


@router.get("/me/access-log", response_model=list[AccessLogEntryOut])
def access_log(
    db: Session = Depends(get_db), user: User = Depends(require_patient)
) -> list[AccessLogEntryOut]:
    rows = db.execute(
        select(AccessLog, User.full_name)
        .join(User, User.id == AccessLog.doctor_id)
        .where(AccessLog.patient_id == user.id)
        .order_by(desc(AccessLog.viewed_at))
        .limit(100)
    ).all()
    return [
        AccessLogEntryOut(
            id=str(r.id),
            doctor_id=str(r.doctor_id),
            doctor_name=name,
            screen=r.screen,
            document_id=str(r.document_id) if r.document_id else None,
            viewed_at=r.viewed_at,
            location=r.location,
        )
        for r, name in rows
    ]


@router.delete("/me", status_code=204)
def delete_me(db: Session = Depends(get_db), user: User = Depends(require_patient)) -> None:
    audit.record(
        db, "system.user.deleted", actor_id=user.id, actor_role=user.role, patient_id=user.id
    )
    db.delete(user)
    db.commit()
