from database.connection import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime


class ChatbotHistory(Base):
    __tablename__ = "chatbot_history"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    session_id = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    student = relationship("Student", back_populates="chatbot_history")
