from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database.connection import get_db
from models.student import Student
from models.academic_record import AcademicRecord
from models.stress_log import StressLog
from models.study_plan import StudyPlan
from models.notification import Notification
from schemas.schemas import StudentResponse, StudentBase
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/profile", tags=["Student Profile"])


class OnboardingCreate(BaseModel):
    full_name: str
    department: str
    year: int
    semester: int
    goals: str
    interests: Optional[str] = None
    current_cgpa: Optional[float] = None
    target_cgpa: float
    preferred_study_time: str
    daily_study_hours: float = Field(default=2.0, ge=0.5, le=16)
    weak_subjects: List[str] = []
    strong_subjects: List[str] = []


@router.get("", response_model=StudentResponse)
def get_profile(db: Session = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection offline")
    student = db.query(Student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profile not found")
    return student


@router.post("/create", response_model=StudentResponse, status_code=201)
def create_profile(data: OnboardingCreate, db: Session = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection offline")

    existing = db.query(Student).first()
    if existing:
        db.delete(existing)
        db.commit()

    try:
        student = Student(
            full_name=data.full_name.strip(),
            department=data.department.strip(),
            year=data.year,
            semester=data.semester,
            goals=data.goals.strip(),
            interests=(data.interests or "").strip() or None,
            current_cgpa=data.current_cgpa,
            target_cgpa=data.target_cgpa,
            preferred_study_time=data.preferred_study_time.strip(),
            daily_study_hours=data.daily_study_hours,
            weak_subjects=[s.strip() for s in data.weak_subjects if s.strip()],
            strong_subjects=[s.strip() for s in data.strong_subjects if s.strip()],
        )
        db.add(student)
        db.flush()

        # Placeholder academic rows (no fake scores — user updates via academics API)
        for subj in data.weak_subjects:
            name = subj.strip()
            if not name:
                continue
            db.add(AcademicRecord(
                student_id=student.id,
                subject=name,
                marks=0.0,
                attendance=0.0,
                assignments_completed=0,
                semester=data.semester,
            ))

        for subj in data.strong_subjects:
            name = subj.strip()
            if not name:
                continue
            if db.query(AcademicRecord).filter(
                AcademicRecord.student_id == student.id,
                AcademicRecord.subject == name,
            ).first():
                continue
            db.add(AcademicRecord(
                student_id=student.id,
                subject=name,
                marks=0.0,
                attendance=0.0,
                assignments_completed=0,
                semester=data.semester,
            ))

        db.add(StressLog(
            student_id=student.id,
            stress_level=40,
            mood="okay",
            sleep_hours=7.0,
            energy_level=70,
            timestamp=datetime.utcnow(),
        ))

        db.add(Notification(
            student_id=student.id,
            message=f"Welcome, {student.full_name}! Complete your academic records to unlock full insights.",
            type="success",
            timestamp=datetime.utcnow(),
        ))

        for subj in data.weak_subjects:
            name = subj.strip()
            if not name:
                continue
            db.add(StudyPlan(
                student_id=student.id,
                task=f"Review core topics in {name}",
                subject=name,
                priority="High",
                deadline=datetime.utcnow() + timedelta(days=3),
                completed=False,
                duration=min(data.daily_study_hours, 3.0),
                ai_generated=False,
            ))

        db.commit()
        db.refresh(student)

        try:
            from graphdb.neo4j_service import (
                create_student_node,
                create_subject_relationship,
                create_stress_performance_link,
                create_interest_relationship,
                mark_weak_subject,
            )
            create_student_node(student.id, student.full_name, student.department, student.year)
            for subj in data.strong_subjects:
                if subj.strip():
                    create_subject_relationship(student.id, subj.strip(), 0.0, 0.0)
            for subj in data.weak_subjects:
                s = subj.strip()
                if s:
                    mark_weak_subject(student.id, s)
                    create_subject_relationship(student.id, s, 0.0, 0.0)
            gpa = data.current_cgpa or ((data.target_cgpa / 10.0) * 4.0 if data.target_cgpa > 4 else data.target_cgpa)
            create_stress_performance_link(student.id, 40.0, gpa)
            if student.goals:
                create_interest_relationship(student.id, student.goals)
            if student.interests:
                create_interest_relationship(student.id, student.interests)
        except Exception as neo_e:
            logger.warning(f"Neo4j sync during onboarding skipped: {neo_e}")

        return student

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create profile: {e}")
        raise HTTPException(status_code=500, detail=f"Onboarding creation failed: {str(e)}")


@router.put("/update", response_model=StudentResponse)
def update_profile(data: StudentBase, db: Session = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection offline")
    student = db.query(Student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profile not found")

    try:
        for field in (
            "full_name", "department", "year", "semester", "goals", "interests",
            "target_cgpa", "current_cgpa", "preferred_study_time", "daily_study_hours",
            "weak_subjects", "strong_subjects",
            "learning_style", "career_goal", "placement_goal", "higher_studies_goal",
        ):
            val = getattr(data, field, None)
            if val is not None:
                setattr(student, field, val)
        db.commit()
        db.refresh(student)

        try:
            from graphdb.neo4j_service import create_student_node, create_interest_relationship
            create_student_node(student.id, student.full_name, student.department, student.year)
            if student.goals:
                create_interest_relationship(student.id, student.goals)
            if student.interests:
                create_interest_relationship(student.id, student.interests)
        except Exception as neo_e:
            logger.warning(f"Neo4j student update skipped: {neo_e}")

        return student
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
