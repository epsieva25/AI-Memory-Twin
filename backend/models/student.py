from database.connection import Base
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    year = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    goals = Column(String(1000), nullable=True)
    interests = Column(Text, nullable=True)
    target_cgpa = Column(Float, nullable=False, default=0.0)
    current_cgpa = Column(Float, nullable=True)
    preferred_study_time = Column(String(255), nullable=True)
    daily_study_hours = Column(Float, nullable=True, default=2.0)
    weak_subjects = Column(JSON, nullable=True, default=list)   # List[str] stored as JSON
    strong_subjects = Column(JSON, nullable=True, default=list) # List[str] stored as JSON
    learning_style = Column(String(100), nullable=True)         # Visual/Auditory/Reading/Kinesthetic
    career_goal = Column(Text, nullable=True)
    placement_goal = Column(Text, nullable=True)
    higher_studies_goal = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    academic_records = relationship("AcademicRecord", back_populates="student", cascade="all, delete-orphan")
    stress_logs = relationship("StressLog", back_populates="student", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="student", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="student", cascade="all, delete-orphan")
    chatbot_history = relationship("ChatbotHistory", back_populates="student", cascade="all, delete-orphan")
