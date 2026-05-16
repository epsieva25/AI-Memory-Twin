"""
Predictions routes — ML-powered weak subject and burnout detection.

Fixes applied:
  - All endpoints now have try/except with safe fallback responses.
  - DB being offline no longer raises a 500.
  - ML model unavailability returns a graceful degraded response.
"""
import logging
import traceback
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from database.connection import get_db
from models.academic_record import AcademicRecord
from models.stress_log import StressLog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predict", tags=["ML Predictions"])

_FALLBACK_WEAK = {
    "predictions": [],
    "weak_subjects": [],
    "message": "ML prediction unavailable — DB or model offline.",
    "success": False,
}

_FALLBACK_BURNOUT = {
    "burnout_risk": "Unknown",
    "risk_score": 0.0,
    "recommendation": "Could not assess burnout risk — DB or model offline.",
    "success": False,
}


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


@router.get("/weak-subject")
def get_weak_subject_predictions(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Predict weak subjects based on the student's academic records."""
    try:
        from ml.predictor import predict_weak_subjects
        student = get_demo_student(db)
        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        if not records:
            return {
                "predictions": [],
                "weak_subjects": [],
                "message": "No academic records found. Please add records first.",
                "success": True,
            }

        stress_log = db.query(StressLog).filter(
            StressLog.student_id == student.id
        ).order_by(StressLog.timestamp.desc()).first()

        stress_level = stress_log.stress_level if stress_log else 40.0
        sleep_hours = stress_log.sleep_hours if stress_log else 7.0

        record_dicts = [
            {
                "subject": r.subject,
                "marks": r.marks,
                "attendance": r.attendance,
                "assignment_completion": r.assignment_completion,
                "study_hours": 4.0,
                "sleep_hours": sleep_hours,
                "stress_level": stress_level,
            }
            for r in records
        ]
        return predict_weak_subjects(record_dicts)

    except Exception as e:
        logger.error(
            f"Error in GET /api/predict/weak-subject: {e}\n{traceback.format_exc()}"
        )
        return _FALLBACK_WEAK


@router.post("/weak-subject")
def predict_weak_subject_manual(data: Dict[str, Any]) -> Dict[str, Any]:
    """Run weak-subject prediction on manually provided records."""
    try:
        from ml.predictor import predict_weak_subjects
        records = data.get("records", [])
        if not records:
            return {"predictions": [], "weak_subjects": [], "message": "No records provided."}
        return predict_weak_subjects(records)
    except Exception as e:
        logger.error(
            f"Error in POST /api/predict/weak-subject: {e}\n{traceback.format_exc()}"
        )
        return _FALLBACK_WEAK


@router.get("/burnout")
def get_burnout_prediction(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Predict burnout risk from the student's latest stress log and academic records."""
    try:
        from ml.predictor import predict_burnout
        student = get_demo_student(db)
        stress_log = db.query(StressLog).filter(
            StressLog.student_id == student.id
        ).order_by(StressLog.timestamp.desc()).first()

        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        avg_marks = sum(r.marks for r in records) / len(records) if records else 70.0
        avg_attendance = sum(r.attendance for r in records) / len(records) if records else 80.0

        data = {
            "marks": avg_marks,
            "attendance": avg_attendance,
            "assignment_completion": 75.0,
            "study_hours": 4.0,
            "sleep_hours": stress_log.sleep_hours if stress_log else 7.0,
            "stress_level": stress_log.stress_level if stress_log else 40.0,
        }
        return predict_burnout(data)

    except Exception as e:
        logger.error(
            f"Error in GET /api/predict/burnout: {e}\n{traceback.format_exc()}"
        )
        return _FALLBACK_BURNOUT


@router.post("/burnout")
def predict_burnout_manual(data: Dict[str, Any]) -> Dict[str, Any]:
    """Run burnout prediction on manually provided data."""
    try:
        from ml.predictor import predict_burnout
        return predict_burnout(data)
    except Exception as e:
        logger.error(
            f"Error in POST /api/predict/burnout: {e}\n{traceback.format_exc()}"
        )
        return _FALLBACK_BURNOUT