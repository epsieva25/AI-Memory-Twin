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
from database.connection import get_db, get_active_student
from models.academic_record import AcademicRecord

logger = logging.getLogger(__name__)

from models.stress_log import StressLog
from fastapi import HTTPException

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


@router.get("/weak-subject")
def get_weak_subject_predictions(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Predict weak subjects based on the student's academic records."""
    try:
        from ml.predictor import predict_weak_subjects
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        if not records:
            # Fall back to the weak_subjects the student declared during onboarding
            declared_weak = getattr(student, "weak_subjects", None) or []
            if declared_weak:
                return {
                    "predictions": [
                        {
                            "subject": s,
                            "is_weak": True,
                            "risk_probability": 75.0,
                            "marks": 0.0,
                            "attendance": 0.0,
                            "recommendation": f"You identified {s} as a weak area. Add marks data to get precise predictions.",
                        }
                        for s in declared_weak
                    ],
                    "weak_subjects": declared_weak,
                    "total_weak": len(declared_weak),
                    "alert_level": "medium",
                    "message": "Based on onboarding preferences — add academic records for ML-powered predictions.",
                    "success": True,
                }
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

        # Group by subject to avoid duplicate predictions across semesters
        subject_map: Dict[str, Dict] = {}
        for r in records:
            if r.subject not in subject_map:
                subject_map[r.subject] = {"marks": [], "attendance": [], "assignments": []}
            if r.marks > 0:
                subject_map[r.subject]["marks"].append(r.marks)
            if r.attendance > 0:
                subject_map[r.subject]["attendance"].append(r.attendance)
            subject_map[r.subject]["assignments"].append(min(100.0, r.assignments_completed * 10.0))

        record_dicts = []
        for subject, data in subject_map.items():
            avg_marks = sum(data["marks"]) / len(data["marks"]) if data["marks"] else 0.0
            avg_att   = sum(data["attendance"]) / len(data["attendance"]) if data["attendance"] else 0.0
            avg_assign = sum(data["assignments"]) / len(data["assignments"]) if data["assignments"] else 0.0
            record_dicts.append({
                "subject": subject,
                "marks": avg_marks,
                "attendance": avg_att,
                "assignment_completion": avg_assign,
                "study_hours": 4.0,
                "sleep_hours": sleep_hours,
                "stress_level": stress_level,
            })

        return predict_weak_subjects(record_dicts)

    except HTTPException:
        raise
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
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        stress_log = db.query(StressLog).filter(
            StressLog.student_id == student.id
        ).order_by(StressLog.timestamp.desc()).first()

        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        avg_marks = sum(r.marks for r in records) / len(records) if records else 70.0
        avg_attendance = sum(r.attendance for r in records) / len(records) if records else 80.0
        avg_assignments = sum(r.assignments_completed for r in records) / len(records) if records else 7.0

        data = {
            "marks": avg_marks,
            "attendance": avg_attendance,
            "assignment_completion": min(100.0, avg_assignments * 10.0),
            "study_hours": 4.0,
            "sleep_hours": stress_log.sleep_hours if stress_log else 7.0,
            "stress_level": stress_log.stress_level if stress_log else 40.0,
        }
        return predict_burnout(data)

    except HTTPException:
        raise
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