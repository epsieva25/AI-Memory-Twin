from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from database.connection import get_db
from models.academic_record import AcademicRecord
from models.stress_log import StressLog
from models.study_plan import StudyPlan

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


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


@router.get("/dashboard")
def get_dashboard_analytics(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Return complete dashboard analytics for the student."""
    try:
        student = get_demo_student(db)
        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        stress_logs = db.query(StressLog).filter(
            StressLog.student_id == student.id
        ).order_by(StressLog.timestamp.desc()).limit(7).all()

        total_tasks = db.query(StudyPlan).filter(StudyPlan.student_id == student.id).count()
        completed_tasks = db.query(StudyPlan).filter(
            StudyPlan.student_id == student.id,
            StudyPlan.is_completed == True  # noqa
        ).count()

        avg_marks = sum(r.marks for r in records) / len(records) if records else 0
        gpa = round((avg_marks / 100) * 4.0, 2)

        avg_attendance = sum(r.attendance for r in records) / len(records) if records else 0
        avg_stress = sum(s.stress_level for s in stress_logs) / len(stress_logs) if stress_logs else 0
        productivity = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)

        subject_data = []
        subject_map: Dict[str, List] = {}
        for r in records:
            if r.subject not in subject_map:
                subject_map[r.subject] = []
            subject_map[r.subject].append(r.marks)

        for subj, marks_list in subject_map.items():
            avg = sum(marks_list) / len(marks_list)
            subject_data.append({
                "subject": subj,
                "average_marks": round(avg, 1),
                "status": "weak" if avg < 60 else "average" if avg < 75 else "strong"
            })

        gpa_trend = []
        semesters = sorted(set(r.semester for r in records))
        for sem in semesters:
            sem_records = [r for r in records if r.semester == sem]
            sem_avg = sum(r.marks for r in sem_records) / len(sem_records)
            gpa_trend.append({"semester": f"Sem {sem}", "gpa": round((sem_avg / 100) * 4.0, 2)})

        return {
            "gpa": gpa,
            "avg_attendance": round(avg_attendance, 1),
            "productivity_score": productivity,
            "avg_stress": round(avg_stress, 1),
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "subject_breakdown": subject_data,
            "gpa_trend": gpa_trend,
            "recent_stress": [
                {
                    "day": s.timestamp.strftime("%a"),
                    "stress": s.stress_level,
                    "energy": s.energy_level,
                    "sleep": s.sleep_hours
                }
                for s in reversed(stress_logs)
            ]
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for analytics dashboard: {e}")
        return {
            "gpa": 0.0, "avg_attendance": 0, "productivity_score": 0, "avg_stress": 0,
            "total_tasks": 0, "completed_tasks": 0, "subject_breakdown": [], "gpa_trend": [], "recent_stress": []
        }


@router.get("/performance")
def get_performance_analytics(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        student = get_demo_student(db)
        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        if not records:
            return {"message": "No academic records found", "data": []}

        subject_performance = {}
        for r in records:
            if r.subject not in subject_performance:
                subject_performance[r.subject] = {"marks": [], "attendance": [], "assignments": []}
            subject_performance[r.subject]["marks"].append(r.marks)
            subject_performance[r.subject]["attendance"].append(r.attendance)
            subject_performance[r.subject]["assignments"].append(r.assignment_completion)

        result = []
        for subj, data in subject_performance.items():
            avg_marks = sum(data["marks"]) / len(data["marks"])
            avg_att = sum(data["attendance"]) / len(data["attendance"])
            avg_assign = sum(data["assignments"]) / len(data["assignments"])
            result.append({
                "subject": subj,
                "score": round(avg_marks, 1),
                "classAvg": round(avg_marks * 0.85, 1),
                "attendance": round(avg_att, 1),
                "assignment_completion": round(avg_assign, 1)
            })

        return {"performance": result}
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for performance analytics: {e}")
        return {"performance": []}


@router.get("/stress")
def get_stress_analytics(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        student = get_demo_student(db)
        logs = db.query(StressLog).filter(
            StressLog.student_id == student.id
        ).order_by(StressLog.timestamp.desc()).limit(30).all()

        return {
            "logs": [
                {
                    "date": log.timestamp.isoformat(),
                    "stress_level": log.stress_level,
                    "mood": log.mood,
                    "sleep_hours": log.sleep_hours,
                    "energy_level": log.energy_level
                }
                for log in reversed(logs)
            ],
            "avg_stress": round(sum(l.stress_level for l in logs) / len(logs), 1) if logs else 0,
            "avg_sleep": round(sum(l.sleep_hours for l in logs) / len(logs), 1) if logs else 0,
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for stress analytics: {e}")
        return {"logs": [], "avg_stress": 0, "avg_sleep": 0}