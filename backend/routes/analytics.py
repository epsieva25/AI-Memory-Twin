from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime, timedelta
from database.connection import get_db, get_active_student
from models.academic_record import AcademicRecord
from models.stress_log import StressLog
from models.study_plan import StudyPlan
from services.recommendation_service import generate_recommendations
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Analytics"])


def _empty_dashboard():
    return {
        "gpa": 0.0,
        "target_cgpa": 0.0,
        "avg_attendance": 0,
        "productivity_score": 0,
        "avg_stress": 0,
        "study_consistency": 0,
        "total_tasks": 0,
        "completed_tasks": 0,
        "subject_breakdown": [],
        "gpa_trend": [],
        "recent_stress": [],
        "weak_subjects": [],
        "upcoming_deadlines": [],
        "recommendations": ["Complete onboarding and add academic records to get started."],
    }


@router.get("/api/dashboard")
@router.get("/api/analytics/dashboard")
def get_dashboard_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")

        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        stress_logs = (
            db.query(StressLog)
            .filter(StressLog.student_id == student.id)
            .order_by(StressLog.timestamp.desc())
            .limit(7)
            .all()
        )

        plans = db.query(StudyPlan).filter(StudyPlan.student_id == student.id).all()
        total_tasks = len(plans)
        completed_tasks = sum(1 for p in plans if p.completed)

        scored = [r for r in records if r.marks > 0]
        avg_marks = sum(r.marks for r in scored) / len(scored) if scored else 0

        # Use stored current_cgpa (10-scale) if available, else derive from marks
        if student.current_cgpa and student.current_cgpa > 0:
            gpa = round(student.current_cgpa, 2)          # already 10-scale
            target = round(student.target_cgpa, 2)        # also 10-scale
        else:
            # Derive percentage → 10-pt scale (marks/100 * 10)
            gpa = round((avg_marks / 100) * 10.0, 2) if avg_marks else 0.0
            target = round(student.target_cgpa, 2) if student.target_cgpa <= 10 else round(student.target_cgpa / 4 * 10, 2)

        att_scored = [r for r in records if r.attendance > 0]
        avg_attendance = sum(r.attendance for r in att_scored) / len(att_scored) if att_scored else 0
        avg_stress = sum(s.stress_level for s in stress_logs) / len(stress_logs) if stress_logs else 0
        productivity = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)

        # Study consistency: completed tasks in last 7 days vs daily goal
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_done = sum(1 for p in plans if p.completed)
        daily_hours = student.daily_study_hours or 2.0
        expected = max(1, int(daily_hours * 7))
        study_consistency = min(100, round((recent_done / expected) * 100)) if expected else 0

        subject_map: Dict[str, List] = {}
        for r in records:
            subject_map.setdefault(r.subject, []).append(r.marks)

        subject_data = []
        weak_subjects: List[str] = []
        for subj, marks_list in subject_map.items():
            valid = [m for m in marks_list if m > 0]
            avg = sum(valid) / len(valid) if valid else 0
            status = "unknown" if not valid else "weak" if avg < 60 else "average" if avg < 75 else "strong"
            subject_data.append({
                "subject": subj,
                "average_marks": round(avg, 1),
                "status": status,
            })
            if status == "weak":
                weak_subjects.append(subj)

        gpa_trend = []
        semesters = sorted(set(r.semester for r in records))
        for sem in semesters:
            sem_records = [r for r in records if r.semester == sem and r.marks > 0]
            if not sem_records:
                continue
            sem_avg = sum(r.marks for r in sem_records) / len(sem_records)
            gpa_trend.append({"semester": f"Sem {sem}", "gpa": round((sem_avg / 100) * 10.0, 2)})


        upcoming = (
            db.query(StudyPlan)
            .filter(
                StudyPlan.student_id == student.id,
                StudyPlan.completed == False,
            )
            .order_by(StudyPlan.deadline.asc())
            .limit(5)
            .all()
        )
        upcoming_deadlines = [
            {
                "id": t.id,
                "title": t.task,
                "subject": t.subject,
                "priority": t.priority,
                "deadline": t.deadline.isoformat() if t.deadline else None,
            }
            for t in upcoming
        ]

        recommendations = generate_recommendations(
            gpa=gpa,
            target_cgpa=target,
            avg_attendance=avg_attendance,
            avg_stress=avg_stress,
            productivity=productivity,
            weak_subjects=weak_subjects,
            pending_tasks=total_tasks - completed_tasks,
            daily_study_hours=daily_hours,
        )

        return {
            "gpa": gpa,
            "target_cgpa": target,
            "avg_attendance": round(avg_attendance, 1),
            "productivity_score": productivity,
            "avg_stress": round(avg_stress, 1),
            "study_consistency": study_consistency,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "subject_breakdown": subject_data,
            "gpa_trend": gpa_trend,
            "weak_subjects": weak_subjects,
            "upcoming_deadlines": upcoming_deadlines,
            "recommendations": recommendations,
            "recent_stress": [
                {
                    "day": s.timestamp.strftime("%a"),
                    "stress": s.stress_level,
                    "energy": s.energy_level,
                    "sleep": s.sleep_hours,
                }
                for s in reversed(stress_logs)
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Dashboard analytics error: {e}")
        return _empty_dashboard()


@router.get("/api/analytics")
@router.get("/api/analytics/performance")
def get_performance_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")

        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        if not records:
            return {"message": "No academic records found", "performance": [], "study_consistency": []}

        subject_performance = {}
        for r in records:
            subject_performance.setdefault(r.subject, {"marks": [], "attendance": [], "assignments": []})
            if r.marks > 0:
                subject_performance[r.subject]["marks"].append(r.marks)
            if r.attendance > 0:
                subject_performance[r.subject]["attendance"].append(r.attendance)
            subject_performance[r.subject]["assignments"].append(min(100.0, r.assignments_completed * 10.0))

        result = []
        for subj, data in subject_performance.items():
            marks = data["marks"]
            if not marks:
                continue
            avg_marks = sum(marks) / len(marks)
            avg_att = sum(data["attendance"]) / len(data["attendance"]) if data["attendance"] else 0
            avg_assign = sum(data["assignments"]) / len(data["assignments"]) if data["assignments"] else 0
            result.append({
                "subject": subj,
                "score": round(avg_marks, 1),
                "classAvg": round(avg_marks * 0.9, 1),
                "attendance": round(avg_att, 1),
                "assignment_completion": round(avg_assign, 1),
            })

        plans = db.query(StudyPlan).filter(StudyPlan.student_id == student.id).all()
        by_day: Dict[str, float] = {}
        for p in plans:
            if p.completed and p.deadline:
                day = p.deadline.strftime("%a")
                by_day[day] = by_day.get(day, 0) + (p.duration or 1.0)

        study_consistency = [
            {"day": d, "hours": round(h, 1), "efficiency": min(100, round(h * 15))}
            for d, h in by_day.items()
        ] or []

        stress_logs = (
            db.query(StressLog)
            .filter(StressLog.student_id == student.id)
            .order_by(StressLog.timestamp.desc())
            .limit(14)
            .all()
        )
        stress_vs_productivity = []
        for i, log in enumerate(reversed(stress_logs[-6:])):
            stress_vs_productivity.append({
                "week": f"W{i + 1}",
                "stress": log.stress_level,
                "productivity": max(0, 100 - log.stress_level),
            })

        return {
            "performance": result,
            "study_consistency": study_consistency,
            "stress_vs_productivity": stress_vs_productivity,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Performance analytics error: {e}")
        return {"performance": [], "study_consistency": [], "stress_vs_productivity": []}


@router.get("/api/analytics/stress")
def get_stress_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")

        logs = (
            db.query(StressLog)
            .filter(StressLog.student_id == student.id)
            .order_by(StressLog.timestamp.desc())
            .limit(30)
            .all()
        )

        return {
            "logs": [
                {
                    "date": log.timestamp.isoformat(),
                    "stress_level": log.stress_level,
                    "mood": log.mood,
                    "sleep_hours": log.sleep_hours,
                    "energy_level": log.energy_level,
                }
                for log in reversed(logs)
            ],
            "avg_stress": round(sum(l.stress_level for l in logs) / len(logs), 1) if logs else 0,
            "avg_sleep": round(sum(l.sleep_hours for l in logs) / len(logs), 1) if logs else 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Stress analytics error: {e}")
        return {"logs": [], "avg_stress": 0, "avg_sleep": 0}
