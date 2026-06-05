from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class StudentBase(BaseModel):
    full_name: str
    department: str
    year: int
    semester: int
    goals: Optional[str] = None
    interests: Optional[str] = None
    current_cgpa: Optional[float] = None
    target_cgpa: float
    preferred_study_time: Optional[str] = None
    daily_study_hours: Optional[float] = 2.0
    weak_subjects: Optional[List[str]] = []
    strong_subjects: Optional[List[str]] = []
    learning_style: Optional[str] = None
    career_goal: Optional[str] = None
    placement_goal: Optional[str] = None
    higher_studies_goal: Optional[str] = None


class StudentResponse(StudentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class AcademicRecordBase(BaseModel):
    subject: str
    marks: float
    attendance: float
    assignments_completed: int
    semester: int


class AcademicRecordCreate(AcademicRecordBase):
    pass


class AcademicRecordResponse(AcademicRecordBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True


class StressLogBase(BaseModel):
    stress_level: int
    mood: str
    sleep_hours: float
    energy_level: int


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
    priority: str = "Medium"
    deadline: Optional[datetime] = None
    duration: Optional[float] = None
    ai_generated: Optional[bool] = False


class StudyPlanCreate(StudyPlanBase):
    pass


class StudyPlanUpdate(BaseModel):
    task: Optional[str] = None
    subject: Optional[str] = None
    completed: Optional[bool] = None
    is_completed: Optional[bool] = None  # Frontend compat alias
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    duration: Optional[float] = None


class StudyPlanResponse(StudyPlanBase):
    id: int
    student_id: int
    completed: bool
    is_completed: bool  # Frontend compat alias

    class Config:
        from_attributes = True


class NotificationBase(BaseModel):
    message: str
    type: str = "info"


class NotificationResponse(NotificationBase):
    id: int
    student_id: int
    is_read: bool
    timestamp: Optional[datetime] = None

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
    prompt: str
    response: str
    timestamp: datetime

    class Config:
        from_attributes = True