from database.connection import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    task = Column(String(500), nullable=False)
    subject = Column(String(255), nullable=False)
    duration = Column(Float, nullable=False)  # hours
    priority = Column(String(20), nullable=False, default="Medium")  # High, Medium, Low
    deadline = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    ai_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="study_plans")
