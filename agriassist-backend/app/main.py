"""
AgriAssist / SmartFarm AI Backend
==================================
FastAPI application with all routers registered.

Startup sequence:
  1. Connect to PostgreSQL and create all tables
  2. Load FAISS index from disk (or create fresh)
  3. Train/load ML models (crop & yield)
  4. Register all API routers
"""
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

# ── Logging setup ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("agriassist")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== AgriAssist Backend starting up ===")

    # 1. Database
    try:
        from app.db.database import check_db_connection, create_all_tables
        check_db_connection()
        create_all_tables()
    except Exception as e:
        logger.error(f"Database startup failed: {e}")
        raise

    # 2. FAISS index
    try:
        from app.rag.pipeline import load_faiss_index
        load_faiss_index()
    except Exception as e:
        logger.warning(f"FAISS index load warning (non-fatal): {e}")

    # 3. ML models — train in background so startup is fast
    try:
        from app.ml.crop_model import load_crop_model
        from app.ml.yield_model import load_yield_model
        load_crop_model()
        load_yield_model()
    except Exception as e:
        logger.warning(f"ML model load warning (non-fatal): {e}")

    # 4. Groq key check
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not set — chat and RAG endpoints will fail.")
    else:
        logger.info(f"Groq model: {settings.GROQ_MODEL}")

    logger.info("=== Startup complete. Ready to serve. ===")
    yield
    logger.info("=== AgriAssist Backend shutting down ===")


# ── App factory ───────────────────────────────────────────────────────────
app = FastAPI(
    title="AgriAssist Backend",
    description="AI-powered agriculture assistant — chat, RAG, ML predictions, and more.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────
from app.api.routers import (
    chat, rag, predict, stats, farm,
    market, irrigation, economics, sensors,
    calendar, settings as settings_router,
    profile, translate, crop_planning,
    weather,
)

app.include_router(chat.router)
app.include_router(rag.router)
app.include_router(predict.router)
app.include_router(stats.router)
app.include_router(farm.router)
app.include_router(market.router)
app.include_router(irrigation.router)
app.include_router(economics.router)
app.include_router(sensors.router)
app.include_router(calendar.router)
app.include_router(settings_router.router)
app.include_router(profile.router)
app.include_router(translate.router)
app.include_router(crop_planning.router)
app.include_router(weather.router)


# ── Health endpoints ──────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """Used by Docker healthcheck and load balancers."""
    return {"status": "ok", "service": "AgriAssist Backend"}


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "AgriAssist API is running.",
        "docs": "/docs",
        "version": "1.0.0",
    }
