from database.connection import Base
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship


class AcademicRecord(Base):
    __tablename__ = "academic_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    marks = Column(Float, nullable=False)  # out of 100
    attendance = Column(Float, nullable=False)  # percentage 0-100
    assignments_completed = Column(Integer, nullable=False, default=0)
    semester = Column(Integer, nullable=False)

    student = relationship("Student", back_populates="academic_records")

