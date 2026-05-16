"""
FastAPI main application entry point for AI Memory Twin for Students.

Architecture:
  - FastAPI with async support
  - PostgreSQL via SQLAlchemy
  - Neo4j for graph relationships
  - Ollama / Llama3 for AI tutoring
  - ML pipeline (scikit-learn + XGBoost)
  - Multi-agent orchestration
"""
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import settings
from database.connection import create_tables
from utils.middleware import RequestLoggingMiddleware, GlobalExceptionMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("memorytwin")

_startup_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    logger.info("🚀 Starting AI Memory Twin Backend...")

    # Create DB tables
    try:
        create_tables()
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Database init failed: {e}")

    # Auto-seed demo data on first run
    try:
        from utils.seed import seed_database
        seed_database()
    except Exception as e:
        logger.warning(f"⚠️  Auto-seed skipped: {e}")

    # AI startup validation (Ollama connectivity + Llama3 inference warmup)
    try:
        from services.llm_service import validate_ai_startup
        if validate_ai_startup():
            logger.info("✅ Ollama connected — Llama3 loaded — AI inference ready")
        else:
            logger.warning("⚠️  AI startup validation incomplete — tutor may use fallback until Ollama is ready")
    except Exception as e:
        logger.warning(f"⚠️  AI startup validation skipped: {e}")

    # Train ML models if not already trained
    try:
        import os
        if not os.path.exists("ml/weak_subject_model.pkl"):
            logger.info("🤖 Training ML models...")
            from datasets.generate_data import generate_dataset
            df = generate_dataset(5000)
            os.makedirs("datasets", exist_ok=True)
            df.to_csv("datasets/student_data.csv", index=False)
            from ml.train_models import train_weak_subject_model, train_burnout_model
            train_weak_subject_model(df)
            train_burnout_model(df)
            logger.info("✅ ML models trained")
    except Exception as e:
        logger.warning(f"⚠️  ML training skipped: {e}")

    logger.info(f"🎉 Backend ready in {round(time.time() - _startup_time, 2)}s")
    yield

    logger.info("🛑 Shutting down AI Memory Twin Backend...")
    try:
        from graphdb.neo4j_service import close_driver
        close_driver()
    except Exception:
        pass


app = FastAPI(
    title="AI Memory Twin for Students",
    description=(
        "🧠 Intelligent AI-powered academic platform — "
        "FastAPI + PostgreSQL + Neo4j + Llama 3"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Health", "description": "Health check endpoints"},
        {"name": "Academic Records", "description": "CRUD for student academic data"},
        {"name": "Study Planner", "description": "Task management and AI plan generation"},
        {"name": "AI Tutor", "description": "Llama 3-powered tutoring, quiz, summarization"},
        {"name": "Analytics", "description": "Dashboard, performance, and stress analytics"},
        {"name": "ML Predictions", "description": "Weak subject and burnout prediction"},
        {"name": "Stress Monitor", "description": "Stress logging and pattern analysis"},
        {"name": "Graph Visualization", "description": "Neo4j relationship graphs"},
        {"name": "Notifications", "description": "Notification management"},
        {"name": "Multi-Agent AI", "description": "Agent orchestration"},
    ]
)

# ─── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(GlobalExceptionMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
from routes.academics import router as academics_router
from routes.planner import router as planner_router
from routes.notifications import router as notifications_router
from routes.analytics import router as analytics_router
from routes.predictions import router as predictions_router
from routes.tutor import router as tutor_router
from routes.stress import router as stress_router
from routes.graph import router as graph_router
from routes.agents import router as agents_router

for router in [
    academics_router, planner_router, notifications_router,
    analytics_router, predictions_router, tutor_router, stress_router,
    graph_router, agents_router
]:
    app.include_router(router)


# ─── Health Endpoints ─────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="Root — confirms backend is alive")
def root():
    return {
        "service": "AI Memory Twin for Students",
        "status": "✅ running",
        "version": "1.0.0",
        "docs": "/docs",
        "uptime_seconds": round(time.time() - _startup_time, 1),
    }


@app.get("/health", tags=["Health"], summary="Detailed health check for Docker monitoring")
def health_check():
    """Used by Docker healthcheck and monitoring tools."""
    from database.connection import check_db_connection
    db_ok = check_db_connection()
    return JSONResponse(
        status_code=200 if db_ok else 503,
        content={
            "status": "healthy" if db_ok else "degraded",
            "database": "connected" if db_ok else "unreachable",
            "uptime_seconds": round(time.time() - _startup_time, 1),
            "version": "1.0.0",
        }
    )


@app.get("/health/db", tags=["Health"], summary="Check Database connectivity")
def health_db_check():
    """Check if PostgreSQL is reachable."""
    from database.connection import check_db_connection
    ok = check_db_connection()
    return JSONResponse(
        status_code=200 if ok else 503,
        content={
            "status": "connected" if ok else "unreachable",
            "database": "PostgreSQL",
            "uptime_seconds": round(time.time() - _startup_time, 1),
        }
    )


@app.get("/health/ai", tags=["Health"], summary="Check Ollama / LLM connectivity")
def health_ai_check():
    """Check if the Ollama LLM service is reachable and the model is available."""
    try:
        from services.llm_service import check_ai_health
        result = check_ai_health()
        is_healthy = (
            result.get("ollama") == "connected" and 
            result.get("inference") == "working"
        )
        return JSONResponse(
            status_code=200 if is_healthy else 503,
            content={
                **result,
                "uptime_seconds": round(time.time() - _startup_time, 1),
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "ollama": "unreachable",
                "model": "unknown",
                "inference": "failing",
                "reason": str(e),
                "uptime_seconds": round(time.time() - _startup_time, 1),
            }
        )