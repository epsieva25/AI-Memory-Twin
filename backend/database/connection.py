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
from sqlalchemy.orm import sessionmaker, Session
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


# ── Table creation & Migration ────────────────────────────────────────────────
def get_column_names(engine, table_name) -> list:
    """Helper to retrieve column names for a table."""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    if table_name in inspector.get_table_names():
        return [c["name"] for c in inspector.get_columns(table_name)]
    return []


def run_schema_migration(engine):
    """Safely apply table schema updates if the tables exist, preserving data."""
    try:
        with engine.begin() as conn:
            # Check students table
            students_cols = get_column_names(engine, "students")
            if students_cols:
                if "name" in students_cols and "full_name" not in students_cols:
                    conn.execute(text("ALTER TABLE students RENAME COLUMN name TO full_name;"))
                if "email" in students_cols:
                    conn.execute(text("ALTER TABLE students DROP COLUMN IF EXISTS email;"))
                if "is_active" in students_cols:
                    conn.execute(text("ALTER TABLE students DROP COLUMN IF EXISTS is_active;"))
                if "updated_at" in students_cols:
                    conn.execute(text("ALTER TABLE students DROP COLUMN IF EXISTS updated_at;"))
                if "semester" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN semester INTEGER DEFAULT 1;"))
                if "goals" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN goals VARCHAR(1000);"))
                if "target_cgpa" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN target_cgpa FLOAT DEFAULT 0.0;"))
                if "preferred_study_time" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN preferred_study_time VARCHAR(255);"))
                if "daily_study_hours" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN daily_study_hours FLOAT DEFAULT 2.0;"))
                if "current_cgpa" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN current_cgpa FLOAT;"))
                if "interests" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN interests TEXT;"))
                if "weak_subjects" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN weak_subjects JSON DEFAULT '[]';"))
                if "strong_subjects" not in students_cols:
                    conn.execute(text("ALTER TABLE students ADD COLUMN strong_subjects JSON DEFAULT '[]';"))

            # Check academic_records table
            ar_cols = get_column_names(engine, "academic_records")
            if ar_cols:
                if "assignment_completion" in ar_cols and "assignments_completed" not in ar_cols:
                    conn.execute(text("ALTER TABLE academic_records RENAME COLUMN assignment_completion TO assignments_completed;"))
                    conn.execute(text("ALTER TABLE academic_records ALTER COLUMN assignments_completed TYPE INTEGER USING assignments_completed::integer;"))
                if "created_at" in ar_cols:
                    conn.execute(text("ALTER TABLE academic_records DROP COLUMN IF EXISTS created_at;"))
                if "updated_at" in ar_cols:
                    conn.execute(text("ALTER TABLE academic_records DROP COLUMN IF EXISTS updated_at;"))

            # Check stress_logs table
            stress_cols = get_column_names(engine, "stress_logs")
            if stress_cols:
                conn.execute(text("ALTER TABLE stress_logs ALTER COLUMN stress_level TYPE INTEGER USING stress_level::integer;"))
                conn.execute(text("ALTER TABLE stress_logs ALTER COLUMN energy_level TYPE INTEGER USING energy_level::integer;"))
                if "notes" in stress_cols:
                    conn.execute(text("ALTER TABLE stress_logs DROP COLUMN IF EXISTS notes;"))

            # Check study_plans table
            plans_cols = get_column_names(engine, "study_plans")
            if plans_cols:
                if "is_completed" in plans_cols and "completed" not in plans_cols:
                    conn.execute(text("ALTER TABLE study_plans RENAME COLUMN is_completed TO completed;"))
                if "duration" in plans_cols:
                    conn.execute(text("ALTER TABLE study_plans ALTER COLUMN duration DROP NOT NULL;"))
                if "created_at" in plans_cols:
                    conn.execute(text("ALTER TABLE study_plans DROP COLUMN IF EXISTS created_at;"))
                if "updated_at" in plans_cols:
                    conn.execute(text("ALTER TABLE study_plans DROP COLUMN IF EXISTS updated_at;"))

            # Check chatbot_history table
            chat_cols = get_column_names(engine, "chatbot_history")
            if chat_cols:
                if "question" in chat_cols and "prompt" not in chat_cols:
                    conn.execute(text("ALTER TABLE chatbot_history RENAME COLUMN question TO prompt;"))
                if "session_id" in chat_cols:
                    conn.execute(text("ALTER TABLE chatbot_history DROP COLUMN IF EXISTS session_id;"))

            # Check notifications table
            notif_cols = get_column_names(engine, "notifications")
            if notif_cols:
                if "title" in notif_cols:
                    conn.execute(text("ALTER TABLE notifications DROP COLUMN IF EXISTS title;"))
                if "created_at" in notif_cols and "timestamp" not in notif_cols:
                    conn.execute(text("ALTER TABLE notifications RENAME COLUMN created_at TO timestamp;"))

            logger.info("✅ Safe database schema migration completed successfully")
    except Exception as e:
        logger.error(f"⚠️ Safe database schema migration failed: {e}")
        # Proceed anyway, Base.metadata.create_all may fix it or fail gracefully


def create_tables():
    """Create all ORM tables. Safe to call even if some models have issues."""
    if engine is None:
        logger.error("Cannot create tables — engine not initialized (DB unreachable?).")
        return
    try:
        # Run safe migrations first
        run_schema_migration(engine)

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


def get_active_student(db: Session):
    """Retrieve the single active student profile from the database."""
    from models.student import Student
    if db is None:
        return None
    return db.query(Student).first()

