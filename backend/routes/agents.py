"""
Multi-Agent AI routes.

Fixes applied:
  - Swapped get_demo_student with get_active_student.
  - Returns 404 if no student profile is created yet.
"""
import logging
import traceback
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db, get_active_student

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["Multi-Agent AI"])


def _get_orchestrator():
    """Lazily import AgentOrchestrator to avoid crashing if agents module fails."""
    try:
        from agents.orchestrator import AgentOrchestrator
        return AgentOrchestrator()
    except Exception as e:
        logger.warning(f"AgentOrchestrator unavailable: {e}")
        return None


@router.post("/run-cycle")
def run_agent_cycle(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Run a full agent orchestration cycle for the active student."""
    try:
        orchestrator = _get_orchestrator()
        if not orchestrator:
            return {
                "success": False,
                "message": "Agent orchestrator is currently unavailable.",
                "results": {},
            }
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        result = orchestrator.run_full_cycle(student.id, db)
        return {"success": True, "message": "Agent cycle completed", "results": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in POST /api/agents/run-cycle: {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "message": "Agent cycle failed. Please try again.",
            "detail": str(e),
        }


@router.post("/motivation")
def get_motivation(db: Session = Depends(get_db)):
    """Generate a personalized motivational message for the active student."""
    try:
        orchestrator = _get_orchestrator()
        if not orchestrator:
            return {
                "success": False,
                "message": "Motivation agent is currently unavailable.",
                "motivation": (
                    "Keep going! Every expert was once a beginner. "
                    "Consistency and discipline will get you to your goals."
                ),
            }

        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")

        from models.academic_record import AcademicRecord
        from models.stress_log import StressLog

        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()
        stress_log = db.query(StressLog).filter(
            StressLog.student_id == student.id
        ).order_by(StressLog.timestamp.desc()).first()

        avg_marks = sum(r.marks for r in records) / len(records) if records else 70.0
        gpa = (avg_marks / 100) * 4.0
        weak_subjects = [r.subject for r in records if r.marks < 60]

        result = orchestrator.motivation.run({
            "gpa": gpa,
            "stress_level": stress_log.stress_level if stress_log else 40,
            "weak_subjects": weak_subjects,
        })
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in POST /api/agents/motivation: {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "message": "Could not generate motivation right now.",
            "motivation": (
                "You're doing great! Remember: progress, not perfection. "
                "Take it one step at a time."
            ),
        }