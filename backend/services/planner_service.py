"""
Study Planner service — generates AI-driven study plans.
"""
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from models.academic_record import AcademicRecord
from models.stress_log import StressLog
from models.study_plan import StudyPlan


def generate_study_plan(student_id: int, db: Session) -> List[StudyPlan]:
    """Generate a personalized AI study plan."""
    records = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == student_id
    ).all()

    stress_log = db.query(StressLog).filter(
        StressLog.student_id == student_id
    ).order_by(StressLog.timestamp.desc()).first()

    stress_level = stress_log.stress_level if stress_log else 40.0
    sleep_hours = stress_log.sleep_hours if stress_log else 7.0

    # Determine available study capacity
    if stress_level > 70 or sleep_hours < 6:
        daily_capacity = 3  # hours
    elif stress_level > 50:
        daily_capacity = 4
    else:
        daily_capacity = 5

    # Sort subjects by weakness (lowest marks first)
    sorted_records = sorted(records, key=lambda r: r.marks)

    tasks = []
    base_date = datetime.utcnow()

    for i, record in enumerate(sorted_records[:5]):  # top 5 subjects to plan
        is_weak = record.marks < 60 or record.attendance < 75
        priority = "High" if is_weak and i < 2 else "Medium" if i < 4 else "Low"
        duration = daily_capacity * (0.4 if is_weak else 0.2)

        task = StudyPlan(
            student_id=student_id,
            task=_generate_task_description(record),
            subject=record.subject,
            duration=round(duration, 1),
            priority=priority,
            deadline=base_date + timedelta(days=i + 1),
            is_completed=False,
            ai_generated=True
        )
        db.add(task)
        tasks.append(task)

    db.commit()
    for task in tasks:
        db.refresh(task)

    return tasks


def _generate_task_description(record: AcademicRecord) -> str:
    if record.marks < 60:
        return f"Intensive review of {record.subject} — focus on core concepts and past papers"
    if record.attendance < 75:
        return f"Catch up on missed {record.subject} lectures and complete pending assignments"
    if record.marks < 75:
        return f"Strengthen understanding of {record.subject} — practice problem sets"
    return f"Revision session for {record.subject} — maintain performance"
