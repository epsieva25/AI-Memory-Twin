from database.connection import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime


class StressLog(Base):
    __tablename__ = "stress_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    stress_level = Column(Float, nullable=False)  # 0-100
    mood = Column(String(50), nullable=False)  # happy, okay, stressed, anxious, burnout
    sleep_hours = Column(Float, nullable=False)
    energy_level = Column(Float, default=50.0)  # 0-100
    notes = Column(String(1000), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    student = relationship("Student", back_populates="stress_logs")
