from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from models.academic_record import AcademicRecord
from schemas.schemas import AcademicRecordCreate, AcademicRecordResponse

router = APIRouter(prefix="/api/academics", tags=["Academic Records"])


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


@router.get("/", response_model=List[AcademicRecordResponse])
def get_all_records(db: Session = Depends(get_db)):
    try:
        student = get_demo_student(db)
        return db.query(AcademicRecord).filter(AcademicRecord.student_id == student.id).all()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for academics get: {e}")
        return []


@router.post("/", response_model=AcademicRecordResponse, status_code=201)
def create_record(
    record: AcademicRecordCreate,
    db: Session = Depends(get_db)
):
    student = get_demo_student(db)
    new_record = AcademicRecord(**record.model_dump(), student_id=student.id)
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


@router.put("/{record_id}", response_model=AcademicRecordResponse)
def update_record(
    record_id: int,
    record: AcademicRecordCreate,
    db: Session = Depends(get_db)
):
    student = get_demo_student(db)
    existing = db.query(AcademicRecord).filter(
        AcademicRecord.id == record_id,
        AcademicRecord.student_id == student.id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Record not found")
    for field, value in record.model_dump().items():
        setattr(existing, field, value)
    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/{record_id}")
def delete_record(
    record_id: int,
    db: Session = Depends(get_db)
):
    student = get_demo_student(db)
    record = db.query(AcademicRecord).filter(
        AcademicRecord.id == record_id,
        AcademicRecord.student_id == student.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted"}