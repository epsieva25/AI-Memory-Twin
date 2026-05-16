from database.connection import Base
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    department = Column(String(255), nullable=False)
    year = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    academic_records = relationship("AcademicRecord", back_populates="student", cascade="all, delete-orphan")
    stress_logs = relationship("StressLog", back_populates="student", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="student", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="student", cascade="all, delete-orphan")
    chatbot_history = relationship("ChatbotHistory", back_populates="student", cascade="all, delete-orphan")
