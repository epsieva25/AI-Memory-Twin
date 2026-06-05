from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db, get_active_student
from models.notification import Notification
from schemas.schemas import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])



@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db)
):
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        return (
            db.query(Notification)
            .filter(Notification.student_id == student.id)
            .order_by(Notification.timestamp.desc())
            .limit(50)
            .all()
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB offline for notifications get: {e}")
        return []


@router.post("/read")
def mark_read_bulk(
    payload: dict,
    db: Session = Depends(get_db)
):
    """Mark one or all notifications read. Body: { \"id\": 1 } or { \"all\": true }."""
    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if payload.get("all"):
        db.query(Notification).filter(
            Notification.student_id == student.id,
            Notification.is_read == False,  # noqa
        ).update({"is_read": True})
        db.commit()
        return {"message": "All notifications marked as read"}
    nid = payload.get("id")
    if nid:
        notif = db.query(Notification).filter(
            Notification.id == nid,
            Notification.student_id == student.id,
        ).first()
        if notif:
            notif.is_read = True
            db.commit()
    return {"message": "Marked as read"}


@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
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
    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
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
    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.student_id == student.id
    ).first()
    if notif:
        db.delete(notif)
        db.commit()
    return {"message": "Notification deleted"}