from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from models.notification import Notification
from schemas.schemas import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


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


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db)
):
    try:
        student = get_demo_student(db)
        return (
            db.query(Notification)
            .filter(Notification.student_id == student.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
            .all()
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for notifications get: {e}")
        return []


@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    student = get_demo_student(db)
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.student_id == student.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Marked as read"}


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db)
):
    student = get_demo_student(db)
    db.query(Notification).filter(
        Notification.student_id == student.id,
        Notification.is_read == False  # noqa
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db)
):
    student = get_demo_student(db)
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.student_id == student.id
    ).first()
    if notif:
        db.delete(notif)
        db.commit()
    return {"message": "Notification deleted"}