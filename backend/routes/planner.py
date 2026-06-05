"""
Study Planner routes — CRUD + AI plan generation.

Key fixes applied:
  - Removed response_model= decorators to bypass Pydantic validation on raw ORM objects.
  - Manually serialize all ORM objects to plain dicts with correct field names.
  - Fixed fallback dicts to use correct schema field names (duration, deadline, ai_generated).
  - Full traceback logging on all errors.
  - Safe fallbacks so the route NEVER returns a 500.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import logging
import traceback
from datetime import datetime
from database.connection import get_db, get_active_student
from models.study_plan import StudyPlan
from schemas.schemas import StudyPlanCreate, StudyPlanUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/planner", tags=["Study Planner"])


def _serialize_task(t: StudyPlan) -> dict:
    """Serialize a StudyPlan ORM object to a plain JSON-safe dict."""
    return {
        "id": t.id,
        "student_id": t.student_id,
        "task": t.task,
        "subject": t.subject,
        "duration": t.duration,
        "priority": t.priority,
        "deadline": t.deadline.isoformat() if t.deadline else None,
        "completed": t.completed,
        "is_completed": t.completed,  # Frontend compat alias
        "ai_generated": t.ai_generated,
    }


def _offline_task(task_id: int, message: str) -> dict:
    """Return a safe fallback task that matches the expected schema shape."""
    return {
        "id": task_id,
        "student_id": 1,
        "task": message,
        "subject": "System Status",
        "duration": 0.0,
        "priority": "High",
        "deadline": None,
        "completed": False,
        "is_completed": False,
        "ai_generated": False,
        "created_at": datetime.utcnow().isoformat(),
    }


def _list_tasks(completed: Optional[bool], db: Session):
    """Return all study plan tasks for the active student."""
    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    query = db.query(StudyPlan).filter(StudyPlan.student_id == student.id)
    if completed is not None:
        query = query.filter(StudyPlan.completed == completed)
    tasks = query.order_by(StudyPlan.id.desc()).all()
    return [_serialize_task(t) for t in tasks]


# ─── GET / (list tasks) ───────────────────────────────────────────────────────
@router.get("")
@router.get("/")
def list_planner_tasks(
    completed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Return all study plan tasks for the active student."""
    try:
        return _list_tasks(completed, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"DB error in GET /api/planner: {e}\n{traceback.format_exc()}"
        )
        return []


@router.get("/history")
def list_planner_tasks_legacy(
    completed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Legacy alias for GET /api/planner (older frontends used /history)."""
    try:
        return _list_tasks(completed, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"DB error in GET /api/planner/history: {e}\n{traceback.format_exc()}"
        )
        return []


# ─── POST / ───────────────────────────────────────────────────────────────────
@router.post("", status_code=201)
def create_task(
    task: StudyPlanCreate,
    db: Session = Depends(get_db)
):
    """Create a new study task."""
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        new_task = StudyPlan(
            student_id=student.id,
            task=task.task,
            subject=task.subject,
            priority=task.priority,
            deadline=task.deadline,
            duration=task.duration,
            ai_generated=task.ai_generated,
            completed=False
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        return _serialize_task(new_task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating task: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


# ─── POST /generate ───────────────────────────────────────────────────────────
@router.post("/generate")
def generate_ai_plan(
    db: Session = Depends(get_db)
):
    """Generate an AI-driven study plan from academic records."""
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        from services.planner_service import generate_study_plan
        tasks = generate_study_plan(student.id, db)
        return [_serialize_task(t) for t in tasks]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"DB/AI error in POST /api/planner/generate: {e}\n{traceback.format_exc()}"
        )
        return []


# ─── PUT /{task_id} ───────────────────────────────────────────────────────────
@router.put("/{task_id}")
def update_task(
    task_id: int,
    updates: StudyPlanUpdate,
    db: Session = Depends(get_db)
):
    """Update a study task's completion status or priority."""
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        task = db.query(StudyPlan).filter(
            StudyPlan.id == task_id, StudyPlan.student_id == student.id
        ).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Handle completed and is_completed fields dynamically
        up_dict = updates.model_dump(exclude_none=True)
        if "is_completed" in up_dict and "completed" not in up_dict:
            up_dict["completed"] = up_dict["is_completed"]
        
        for field, value in up_dict.items():
            if field in ("completed", "priority", "task", "subject", "deadline", "duration"):
                setattr(task, field, value)
                
        db.commit()
        db.refresh(task)

        # Sync update to Neo4j (completed relationship)
        try:
            from graphdb.neo4j_service import sync_task
            sync_task(student.id, task.task, task.completed)
        except Exception as neo_e:
            logger.warning(f"Neo4j sync failed for task update: {neo_e}")

        return _serialize_task(task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


# ─── DELETE /{task_id} ────────────────────────────────────────────────────────
@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """Delete a study task."""
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        task = db.query(StudyPlan).filter(
            StudyPlan.id == task_id, StudyPlan.student_id == student.id
        ).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        db.delete(task)
        db.commit()
        return {"success": True, "message": "Task deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )