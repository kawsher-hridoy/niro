"""FastAPI application entrypoint.

Run via:
    uvicorn backend.main:app --reload --port 8000

Routes are mounted under /api/v1. New routers are added in Phase B+.
"""
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.api.routers import (
    analyses,
    chamber,
    consent,
    doctor as doctor_router,
    doctors,
    documents,
    profile,
    verifications,
)
from backend.api.routers import auth as auth_router
from backend.config import get_settings
from backend.db.session import get_db


structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
)
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    log.info("niro.startup", env=settings.app_env, provider=settings.ai_provider)
    yield
    log.info("niro.shutdown")


app = FastAPI(
    title="Niro API",
    version="0.1.0",
    description="Patient-owned medical record + AI document analyzer.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


api = APIRouter(prefix="/api/v1")


@api.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {
        "ok": True,
        "service": "niro-backend",
        "version": "0.1.0",
        "time": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(api)
app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(analyses.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(consent.router, prefix="/api/v1")
app.include_router(verifications.router, prefix="/api/v1")
app.include_router(doctor_router.router, prefix="/api/v1")
app.include_router(doctors.router, prefix="/api/v1")
app.include_router(chamber.router, prefix="/api/v1")
