"""AI analysis of an uploaded document.

POST /analyses {document_id, use_history?} → analyzes the doc, writes
an Analysis row + an audit row. History-aware mode includes the patient's
last 3 analyses as context.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.ai.policy import AIPolicyViolation
from backend.ai.provider import DocumentAnalysis, DocumentReadError, get_provider
from backend.db.models import Analysis, Document, HealthMetric, User
from backend.db.session import get_db
from backend.services import audit, storage
from backend.services.auth import current_user, require_patient


router = APIRouter(prefix="/analyses", tags=["analyses"])


# Bangla labels for the canonical metric keys the lab prompt may emit.
METRIC_LABEL_BN: dict[str, str] = {
    "blood_glucose_fasting": "রক্তে শর্করা (উপবাস)",
    "blood_glucose_random": "রক্তে শর্করা (যেকোনো সময়)",
    "blood_glucose_2hpp": "রক্তে শর্করা (খাবারের ২ ঘণ্টা পর)",
    "hba1c": "এইচবিএ১সি",
    "ldl_cholesterol": "এলডিএল কোলেস্টেরল",
    "hdl_cholesterol": "এইচডিএল কোলেস্টেরল",
    "total_cholesterol": "মোট কোলেস্টেরল",
    "triglycerides": "ট্রাইগ্লিসারাইড",
    "creatinine": "ক্রিয়েটিনিন",
    "egfr": "ইজিএফআর",
    "urea": "ইউরিয়া",
    "hemoglobin": "হিমোগ্লোবিন",
    "wbc": "শ্বেত রক্তকণিকা",
    "platelet": "অণুচক্রিকা (প্লাটিলেট)",
    "tsh": "টিএসএইচ",
    "t3": "টি৩",
    "t4": "টি৪",
    "alt_sgpt": "এএলটি (এসজিপিটি)",
    "ast_sgot": "এএসটি (এসজিওটি)",
    "bilirubin_total": "মোট বিলিরুবিন",
    "uric_acid": "ইউরিক অ্যাসিড",
    "vitamin_d": "ভিটামিন ডি",
    "vitamin_b12": "ভিটামিন বি১২",
    "crp": "সিআরপি",
    "esr": "ইএসআর",
    "lvef": "এলভিইএফ (হৃদপিণ্ডের পাম্পিং)",
    "blood_pressure_systolic": "রক্তচাপ (সিস্টোলিক)",
    "blood_pressure_diastolic": "রক্তচাপ (ডায়াস্টোলিক)",
}


def _num(value: object) -> float | None:
    """Best-effort numeric coercion from the model's value_num / ref bound."""
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip().replace(",", ""))
        except ValueError:
            return None
    return None


# Synonyms → canonical metric_key. The LLM is asked to emit a canonical key,
# but when it returns null we salvage by substring-matching the lab's "parameter"
# text (English or Bangla). Order matters: longer/more specific patterns first.
METRIC_KEY_SYNONYMS: list[tuple[str, str]] = [
    # blood glucose variants — order before generic "glucose"
    ("fasting blood sugar", "blood_glucose_fasting"),
    ("fasting glucose", "blood_glucose_fasting"),
    ("fbs", "blood_glucose_fasting"),
    ("উপবাস", "blood_glucose_fasting"),
    ("খালি পেট", "blood_glucose_fasting"),
    ("2 hour post prandial", "blood_glucose_2hpp"),
    ("2hr pp", "blood_glucose_2hpp"),
    ("2hpp", "blood_glucose_2hpp"),
    ("post prandial", "blood_glucose_2hpp"),
    ("খাবারের পর", "blood_glucose_2hpp"),
    ("random blood sugar", "blood_glucose_random"),
    ("random glucose", "blood_glucose_random"),
    ("rbs", "blood_glucose_random"),
    # hba1c
    ("hba1c", "hba1c"),
    ("hb a1c", "hba1c"),
    ("glycated hemoglobin", "hba1c"),
    ("glycosylated hb", "hba1c"),
    ("a1c", "hba1c"),
    ("এইচবিএ১সি", "hba1c"),
    # lipids
    ("ldl cholesterol", "ldl_cholesterol"),
    ("ldl-c", "ldl_cholesterol"),
    ("ldl", "ldl_cholesterol"),
    ("এলডিএল", "ldl_cholesterol"),
    ("hdl cholesterol", "hdl_cholesterol"),
    ("hdl-c", "hdl_cholesterol"),
    ("hdl", "hdl_cholesterol"),
    ("এইচডিএল", "hdl_cholesterol"),
    ("total cholesterol", "total_cholesterol"),
    ("cholesterol total", "total_cholesterol"),
    ("triglyceride", "triglycerides"),
    ("tg", "triglycerides"),
    ("ট্রাইগ্লিসারাইড", "triglycerides"),
    # kidney
    ("serum creatinine", "creatinine"),
    ("s. creatinine", "creatinine"),
    ("creatinine", "creatinine"),
    ("ক্রিয়েটিনিন", "creatinine"),
    ("egfr", "egfr"),
    ("e.gfr", "egfr"),
    ("gfr", "egfr"),
    ("blood urea", "urea"),
    ("urea nitrogen", "urea"),
    ("bun", "urea"),
    ("urea", "urea"),
    # CBC
    ("hemoglobin", "hemoglobin"),
    ("haemoglobin", "hemoglobin"),
    ("hb", "hemoglobin"),
    ("হিমোগ্লোবিন", "hemoglobin"),
    ("white blood cell", "wbc"),
    ("total wbc", "wbc"),
    ("wbc count", "wbc"),
    ("wbc", "wbc"),
    ("শ্বেত রক্তকণিকা", "wbc"),
    ("platelet count", "platelet"),
    ("platelets", "platelet"),
    ("platelet", "platelet"),
    ("plt", "platelet"),
    ("অণুচক্রিকা", "platelet"),
    # thyroid
    ("tsh", "tsh"),
    ("free t3", "t3"),
    ("ft3", "t3"),
    (" t3", "t3"),  # leading space avoids matching inside "ft3"
    ("free t4", "t4"),
    ("ft4", "t4"),
    (" t4", "t4"),
    # liver
    ("sgpt", "alt_sgpt"),
    ("alt ", "alt_sgpt"),
    ("alanine", "alt_sgpt"),
    ("sgot", "ast_sgot"),
    ("ast ", "ast_sgot"),
    ("aspartate", "ast_sgot"),
    ("total bilirubin", "bilirubin_total"),
    ("bilirubin", "bilirubin_total"),
    # others
    ("uric acid", "uric_acid"),
    ("25-oh", "vitamin_d"),
    ("vitamin d", "vitamin_d"),
    ("vit d", "vitamin_d"),
    ("vitamin b12", "vitamin_b12"),
    ("vit b12", "vitamin_b12"),
    ("b12", "vitamin_b12"),
    ("c-reactive protein", "crp"),
    ("crp", "crp"),
    ("esr", "esr"),
    ("ejection fraction", "lvef"),
    ("lvef", "lvef"),
    ("ef ", "lvef"),
    ("systolic", "blood_pressure_systolic"),
    ("diastolic", "blood_pressure_diastolic"),
    # generic glucose last — only match if no specific glucose variant did
    ("glucose", "blood_glucose_random"),
    ("blood sugar", "blood_glucose_random"),
    ("রক্তে শর্করা", "blood_glucose_random"),
]

_VALID_METRIC_KEYS = set(METRIC_LABEL_BN.keys())


def _normalize_metric_key(ai_key: object, parameter: object) -> str | None:
    """Pick a canonical metric_key. Trust the model's choice if valid; otherwise
    salvage by substring-matching the lab's printed parameter text."""
    if isinstance(ai_key, str) and ai_key.strip() in _VALID_METRIC_KEYS:
        return ai_key.strip()
    if not isinstance(parameter, str):
        return None
    haystack = parameter.lower().strip()
    if not haystack:
        return None
    for needle, canonical in METRIC_KEY_SYNONYMS:
        if needle in haystack:
            return canonical
    return None


def _extract_metrics(
    db: Session,
    *,
    patient_id: uuid.UUID,
    analysis_id: uuid.UUID,
    document_id: uuid.UUID,
    structured: dict,
    measured_at: date | None,
) -> int:
    """Fan structured lab values with a canonical metric_key into health_metrics rows.
    Salvages model-emitted null keys via _normalize_metric_key()."""
    values = structured.get("values")
    if not isinstance(values, list):
        return 0
    count = 0
    for v in values:
        if not isinstance(v, dict):
            continue
        key = _normalize_metric_key(v.get("metric_key"), v.get("parameter"))
        if key is None:
            continue
        value_num = _num(v.get("value_num"))
        if value_num is None:
            value_num = _num(v.get("value"))
        if value_num is None:
            continue
        db.add(
            HealthMetric(
                patient_id=patient_id,
                analysis_id=analysis_id,
                document_id=document_id,
                metric_key=key[:64],
                label_bn=METRIC_LABEL_BN.get(key),
                value_num=value_num,
                value_text=str(v.get("value"))[:128] if v.get("value") is not None else None,
                unit=(str(v.get("unit"))[:32] if v.get("unit") else None),
                ref_low=_num(v.get("ref_low")),
                ref_high=_num(v.get("ref_high")),
                abnormal=bool(v.get("abnormal")),
                measured_at=measured_at,
            )
        )
        count += 1
    return count


class AnalyzeIn(BaseModel):
    document_id: uuid.UUID
    use_history: bool = True
    user_prompt: str | None = Field(default=None, max_length=1000)


class AnalysisOut(BaseModel):
    id: str
    document_id: str
    kind: str
    report_type: str | None = None
    report_date: date | None = None
    structured: dict
    explanation_bn: str
    red_flags: list[dict]
    questions_bn: list[str]
    confidence: float
    model_name: str
    model_version: str
    latency_ms: int
    created_at: datetime
    recommend_human_review: bool = Field(
        default=False,
        description="True when confidence < 0.5 — UI surfaces 'request human verification'.",
    )

    @classmethod
    def from_orm(cls, a: Analysis, doc_kind: str) -> "AnalysisOut":
        conf = float(a.confidence) if isinstance(a.confidence, Decimal) else float(a.confidence)
        return cls(
            id=str(a.id),
            document_id=str(a.document_id),
            kind=doc_kind,
            report_type=a.report_type,
            report_date=a.report_date,
            structured=a.structured,
            explanation_bn=a.explanation_bn,
            red_flags=a.red_flags,
            questions_bn=a.questions_bn,
            confidence=conf,
            model_name=a.model_name,
            model_version=a.model_version,
            latency_ms=a.latency_ms,
            created_at=a.created_at,
            recommend_human_review=conf < 0.5,
        )


@router.post("", response_model=AnalysisOut, status_code=status.HTTP_201_CREATED)
def analyze(
    body: AnalyzeIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> AnalysisOut:
    doc = db.get(Document, body.document_id)
    if doc is None or doc.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document not found")

    image_bytes = storage.read_blob(doc.storage_key)

    history: list[DocumentAnalysis] = []
    if body.use_history:
        rows = db.execute(
            select(Analysis)
            .where(Analysis.patient_id == user.id)
            .order_by(desc(Analysis.created_at))
            .limit(3)
        ).scalars().all()
        for r in rows:
            history.append(
                {
                    "kind": "prescription",  # we don't strictly need this for the prompt
                    "structured": r.structured,
                    "explanation_bn": r.explanation_bn,
                    "model_name": r.model_name,
                }
            )

    provider = get_provider()
    try:
        result = provider.analyze_document(
            image_bytes,
            mime=doc.mime_type,
            hint_kind=doc.kind,  # type: ignore[arg-type]
            history=history,
            user_prompt=body.user_prompt,
        )
    except DocumentReadError as e:
        audit.record(
            db,
            "ai.document_unreadable",
            actor_id=user.id,
            actor_role="patient",
            patient_id=user.id,
            document_id=doc.id,
            detail={"reason": str(e)[:200], "mime": doc.mime_type},
        )
        db.commit()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "could not read document; PDF may be encrypted or corrupted",
        ) from e
    except AIPolicyViolation as e:
        audit.record(
            db,
            "ai.policy_violation",
            actor_id=user.id,
            actor_role="patient",
            patient_id=user.id,
            document_id=doc.id,
            detail={"reason": str(e)[:200]},
        )
        db.commit()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "ai output violated safety policy; please request human verification",
        ) from e

    report_date_raw = result.get("report_date")
    report_date_val: date | None = None
    if isinstance(report_date_raw, str):
        try:
            report_date_val = date.fromisoformat(report_date_raw)
        except ValueError:
            report_date_val = None

    analysis = Analysis(
        document_id=doc.id,
        patient_id=user.id,
        model_name=result["model_name"],
        model_version=result["model_version"],
        report_type=result.get("report_type"),
        report_date=report_date_val,
        structured=result["structured"],
        explanation_bn=result["explanation_bn"],
        red_flags=result["red_flags"],
        questions_bn=result["questions_bn"],
        confidence=Decimal(str(round(result["confidence"], 3))),
        prompt_sha256=result["prompt_sha256"],
        output_sha256=result["output_sha256"],
        latency_ms=result["latency_ms"],
    )
    db.add(analysis)
    db.flush()
    metric_count = _extract_metrics(
        db,
        patient_id=user.id,
        analysis_id=analysis.id,
        document_id=doc.id,
        structured=result["structured"],
        measured_at=report_date_val or doc.uploaded_at.date(),
    )
    event_name = "ai.analyze.history_aware" if history else "ai.analyze.document"
    audit.record(
        db,
        event_name,
        actor_id=user.id,
        actor_role="patient",
        patient_id=user.id,
        document_id=doc.id,
        analysis_id=analysis.id,
        model_name=result["model_name"],
        model_version=result["model_version"],
        prompt_sha256=result["prompt_sha256"],
        output_sha256=result["output_sha256"],
        confidence=result["confidence"],
        detail={
            "latency_ms": result["latency_ms"],
            "history_count": len(history),
            "kind": doc.kind,
            "report_type": result.get("report_type"),
            "metric_count": metric_count,
            "has_user_prompt": bool(body.user_prompt and body.user_prompt.strip()),
            "prompt_version": result.get("_prompt_version"),  # type: ignore[typeddict-item]
        },
    )
    db.commit()
    db.refresh(analysis)
    return AnalysisOut.from_orm(analysis, doc.kind)


@router.get("/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> AnalysisOut:
    a = db.get(Analysis, analysis_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "analysis not found")
    # Patient sees own. Doctor access via /doctor/cases consent path (Phase C).
    if user.role == "patient" and a.patient_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "analysis not found")
    doc = db.get(Document, a.document_id)
    return AnalysisOut.from_orm(a, doc.kind if doc else "other")


@router.get("", response_model=list[AnalysisOut])
def list_my_analyses(
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> list[AnalysisOut]:
    rows = db.execute(
        select(Analysis, Document.kind)
        .join(Document, Document.id == Analysis.document_id)
        .where(Analysis.patient_id == user.id)
        .order_by(desc(Analysis.created_at))
    ).all()
    return [AnalysisOut.from_orm(a, kind) for a, kind in rows]


class LatestAnalysisRef(BaseModel):
    id: uuid.UUID
    created_at: datetime


@router.get("/by-document/{document_id}/latest", response_model=LatestAnalysisRef)
def latest_for_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_patient),
) -> LatestAnalysisRef:
    """Cheap lookup so the upload page can poll for a result if its long
    POST /analyses connection was dropped by a flaky network mid-call."""
    row = db.execute(
        select(Analysis.id, Analysis.created_at)
        .join(Document, Document.id == Analysis.document_id)
        .where(Analysis.document_id == document_id, Analysis.patient_id == user.id)
        .order_by(desc(Analysis.created_at))
        .limit(1)
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no analysis yet")
    return LatestAnalysisRef(id=row.id, created_at=row.created_at)
