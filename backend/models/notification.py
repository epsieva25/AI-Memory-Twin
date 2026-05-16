from database.connection import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    message = Column(String(1000), nullable=False)
    title = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False, default="info")  # alert, warning, ai, success, info
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    student = relationship("Student", back_populates="notifications")
