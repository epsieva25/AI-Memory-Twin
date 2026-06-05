from database.connection import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    task = Column(String(500), nullable=False)
    subject = Column(String(255), nullable=False)
    priority = Column(String(50), nullable=False, default="Medium")
    deadline = Column(DateTime, nullable=True)
    completed = Column(Boolean, default=False)
    duration = Column(Float, nullable=True)
    ai_generated = Column(Boolean, default=False)

    student = relationship("Student", back_populates="study_plans")

