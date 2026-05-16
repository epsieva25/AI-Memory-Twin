"""
Database connection — SQLAlchemy engine, session factory, and table creation.

Fixes applied:
  - Engine creation is wrapped so an offline DB doesn't crash the import.
  - get_db() yields None-safe fallback if SessionLocal is unavailable.
  - create_tables() is safely wrapped.
"""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

# ── Engine ────────────────────────────────────────────────────────────────────
try:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,        # Validates connections before use
        pool_recycle=300,          # Recycle connections every 5 min
        pool_size=5,
        max_overflow=10,
        echo=settings.app_env == "development",
        connect_args={},
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("✅ SQLAlchemy engine created successfully")
except Exception as e:
    logger.error(f"❌ Failed to create SQLAlchemy engine: {e}")
    engine = None
    SessionLocal = None


# ── Session dependency ────────────────────────────────────────────────────────
def get_db():
    """
    Yield a DB session for use in route dependencies.
    If the DB is unavailable, yields None — routes must check for None
    and return their fallback response.
    """
    if SessionLocal is None:
        logger.warning("DB session requested but SessionLocal is None (engine failed to init).")
        yield None
        return
    try:
        db = SessionLocal()
    except Exception as e:
        logger.error(f"Failed to create DB session: {e}")
        yield None
        return
    try:
        yield db
    except Exception as e:
        logger.error(f"DB session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


# ── Table creation ────────────────────────────────────────────────────────────
def create_tables():
    """Create all ORM tables. Safe to call even if some models have issues."""
    if engine is None:
        logger.error("Cannot create tables — engine not initialized (DB unreachable?).")
        return
    try:
        from models import student, academic_record, stress_log, study_plan, notification, chatbot_history  # noqa
        Base.metadata.create_all(bind=engine)
        logger.info("✅ All database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Table creation error: {e}")
        raise


# ── Health check helper ───────────────────────────────────────────────────────
def check_db_connection() -> bool:
    """Return True if the database is reachable, False otherwise."""
    if engine is None:
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
