from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from models.stress_log import StressLog
from schemas.schemas import StressLogCreate, StressLogResponse
from services.emotion_service import analyze_text_sentiment, analyze_stress_pattern

router = APIRouter(prefix="/api/stress", tags=["Stress Monitor"])


def get_demo_student(db: Session):
    """Get or create the default demo student."""
    from models.student import Student
    student = db.query(Student).filter(Student.email == "demo@memorytwin.ai").first()
    if not student:
        student = Student(
            name="Mary Jasper",
            email="demo@memorytwin.ai",
            department="CSE",
            year=4,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    return student


@router.get("/", response_model=List[StressLogResponse])
def get_stress_logs(
    limit: int = 30,
    db: Session = Depends(get_db)
):
    try:
        student = get_demo_student(db)
        return (
            db.query(StressLog)
            .filter(StressLog.student_id == student.id)
            .order_by(StressLog.timestamp.desc())
            .limit(limit)
            .all()
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for stress logs: {e}")
        return []


@router.post("/", response_model=StressLogResponse, status_code=201)
def log_stress(
    log: StressLogCreate,
    db: Session = Depends(get_db)
):
    student = get_demo_student(db)
    new_log = StressLog(**log.model_dump(), student_id=student.id)
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


@router.post("/analyze")
def analyze_stress(
    payload: dict,
    db: Session = Depends(get_db)
):
    try:
        student = get_demo_student(db)
        text = payload.get("text", "")
        if text:
            sentiment_result = analyze_text_sentiment(text)
        else:
            sentiment_result = {}

        recent_logs = (
            db.query(StressLog)
            .filter(StressLog.student_id == student.id)
            .order_by(StressLog.timestamp.desc())
            .limit(7)
            .all()
        )
        log_dicts = [
            {
                "stress_level": l.stress_level,
                "sleep_hours": l.sleep_hours,
                "energy_level": l.energy_level,
                "mood": l.mood
            }
            for l in recent_logs
        ]
        pattern_result = analyze_stress_pattern(log_dicts)

        return {
            "text_analysis": sentiment_result,
            "pattern_analysis": pattern_result
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for stress analysis: {e}")
        return {
            "text_analysis": {},
            "pattern_analysis": {"trend": "Stable", "recommendation": "Maintain a healthy lifestyle.", "risk_level": "Low"}
        }


@router.get("/report")
def get_stress_report(
    db: Session = Depends(get_db)
):
    try:
        student = get_demo_student(db)
        logs = (
            db.query(StressLog)
            .filter(StressLog.student_id == student.id)
            .order_by(StressLog.timestamp.desc())
            .limit(30)
            .all()
        )
        log_dicts = [
            {
                "stress_level": l.stress_level,
                "sleep_hours": l.sleep_hours,
                "energy_level": l.energy_level,
                "mood": l.mood,
                "timestamp": l.timestamp.isoformat()
            }
            for l in logs
        ]
        analysis = analyze_stress_pattern(log_dicts)
        mood_counts = {}
        for l in logs:
            mood_counts[l.mood] = mood_counts.get(l.mood, 0) + 1

        return {
            "period": "Last 30 logs",
            "total_entries": len(logs),
            "mood_distribution": mood_counts,
            **analysis
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for stress report: {e}")
        return {
            "period": "Last 30 logs",
            "total_entries": 0,
            "mood_distribution": {},
            "trend": "Stable",
            "recommendation": "Database offline.",
            "risk_level": "Unknown"
        }