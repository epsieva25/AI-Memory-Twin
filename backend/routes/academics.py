from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db, get_active_student
from models.academic_record import AcademicRecord
from schemas.schemas import AcademicRecordCreate, AcademicRecordResponse

router = APIRouter(prefix="/api/academics", tags=["Academic Records"])


@router.get("", response_model=List[AcademicRecordResponse])
def get_all_records(db: Session = Depends(get_db)):
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        return db.query(AcademicRecord).filter(AcademicRecord.student_id == student.id).all()
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for academics get: {e}")
        return []


@router.post("", response_model=AcademicRecordResponse, status_code=201)
def create_record(
    record: AcademicRecordCreate,
    db: Session = Depends(get_db)
):
    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    new_record = AcademicRecord(**record.model_dump(), student_id=student.id)
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    
    # Sync with Neo4j
    try:
        from graphdb.neo4j_service import create_subject_relationship
        create_subject_relationship(student.id, new_record.subject, new_record.marks, new_record.attendance)
    except Exception as neo_e:
        import logging
        logging.getLogger(__name__).warning(f"Neo4j sync failed: {neo_e}")

    return new_record


@router.put("/{record_id}", response_model=AcademicRecordResponse)
def update_record(
    record_id: int,
    record: AcademicRecordCreate,
    db: Session = Depends(get_db)
):
    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
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

    # Sync with Neo4j
    try:
        from graphdb.neo4j_service import create_subject_relationship
        create_subject_relationship(student.id, existing.subject, existing.marks, existing.attendance)
    except Exception as neo_e:
        import logging
        logging.getLogger(__name__).warning(f"Neo4j sync failed: {neo_e}")

    return existing


@router.delete("/{record_id}")
def delete_record(
    record_id: int,
    db: Session = Depends(get_db)
):
    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    record = db.query(AcademicRecord).filter(
        AcademicRecord.id == record_id,
        AcademicRecord.student_id == student.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted"}