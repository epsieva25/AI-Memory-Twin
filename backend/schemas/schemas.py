from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class StudentBase(BaseModel):
    name: str
    email: EmailStr
    department: str
    year: int


class StudentResponse(StudentBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AcademicRecordBase(BaseModel):
    subject: str
    marks: float
    attendance: float
    assignment_completion: float
    semester: int = 1


class AcademicRecordCreate(AcademicRecordBase):
    pass


class AcademicRecordResponse(AcademicRecordBase):
    id: int
    student_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class StressLogBase(BaseModel):
    stress_level: float
    mood: str
    sleep_hours: float
    energy_level: float = 50.0
    notes: Optional[str] = None


class StressLogCreate(StressLogBase):
    pass


class StressLogResponse(StressLogBase):
    id: int
    student_id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class StudyPlanBase(BaseModel):
    task: str
    subject: str
    duration: float
    priority: str = "Medium"
    deadline: Optional[datetime] = None


class StudyPlanCreate(StudyPlanBase):
    pass


class StudyPlanUpdate(BaseModel):
    is_completed: Optional[bool] = None
    priority: Optional[str] = None


class StudyPlanResponse(StudyPlanBase):
    id: int
    student_id: int
    is_completed: bool
    ai_generated: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "info"


class NotificationResponse(NotificationBase):
    id: int
    student_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: Optional[str] = None
    timestamp: datetime


class ChatHistoryResponse(BaseModel):
    id: int
    question: str
    response: str
    timestamp: datetime

    class Config:
        from_attributes = True