from database.connection import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime


class StressLog(Base):
    __tablename__ = "stress_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    stress_level = Column(Integer, nullable=False)  # 0-100
    sleep_hours = Column(Float, nullable=False)
    mood = Column(String(100), nullable=False)
    energy_level = Column(Integer, nullable=False)  # 0-100
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    student = relationship("Student", back_populates="stress_logs")

