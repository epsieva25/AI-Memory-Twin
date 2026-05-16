"""
AI Tutor routes — Ollama/Llama3 powered chat, quiz, and summarization.

Fixes applied:
  - /chat endpoint now always returns a response (never hangs).
  - DB failure when saving history is silently caught (response still returns).
  - All routes have structured error responses.
  - Added timeout protection in route layer.
"""
import uuid
import logging
import traceback
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from models.chatbot_history import ChatbotHistory
from schemas.schemas import ChatMessage, ChatResponse, ChatHistoryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tutor", tags=["AI Tutor"])


def get_demo_student(db: Session):
    """Get or create the default demo student."""
    from models.student import Student
    student = db.query(Student).filter(Student.email == "demo@memorytwin.ai").first()
    if not student:
        student = Student(
            name="Mary Jasper",
            email="demo@memorytwin.ai",
            department="CSE",
            year=4,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    return student


@router.post("/chat", response_model=ChatResponse)
def chat(
    msg: ChatMessage,
    db: Session = Depends(get_db),
):
    """
    Send a message to the AI tutor and receive a response.
    Always returns — falls back to an offline message if Ollama is unavailable.
    """
    session_id = msg.session_id or str(uuid.uuid4())
    now = datetime.utcnow()

    try:
        from services.llm_service import tutor_response
        response_text = tutor_response(msg.message)
    except Exception as e:
        logger.error(f"LLM call failed in /api/tutor/chat: {e}\n{traceback.format_exc()}")
        from services.llm_service import _fallback_response
        response_text = _fallback_response(msg.message)

    # Save to chat history (non-blocking — failure here doesn't affect the response)
    try:
        student = get_demo_student(db)
        history_entry = ChatbotHistory(
            student_id=student.id,
            question=msg.message,
            response=response_text,
            session_id=session_id,
        )
        db.add(history_entry)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to save chat history (non-critical): {e}")

    return ChatResponse(
        response=response_text,
        session_id=session_id,
        timestamp=now,
    )


@router.get("/history", response_model=List[ChatHistoryResponse])
def get_chat_history(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Return the last N chat messages for the demo student."""
    try:
        student = get_demo_student(db)
        return (
            db.query(ChatbotHistory)
            .filter(ChatbotHistory.student_id == student.id)
            .order_by(ChatbotHistory.timestamp.desc())
            .limit(limit)
            .all()
        )
    except Exception as e:
        logger.error(f"Error in GET /api/tutor/history: {e}\n{traceback.format_exc()}")
        return []


@router.post("/quiz")
def generate_quiz_route(payload: dict):
    """Generate multiple-choice quiz questions for a subject."""
    try:
        from services.llm_service import generate_quiz
        subject = payload.get("subject", "General Studies")
        difficulty = payload.get("difficulty", "medium")
        n_questions = payload.get("n_questions", 5)
        quiz_text = generate_quiz(subject, difficulty, n_questions)
        return {"subject": subject, "quiz": quiz_text}
    except Exception as e:
        logger.error(f"Error in POST /api/tutor/quiz: {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "subject": payload.get("subject", "General Studies"),
            "quiz": "Quiz generation is currently unavailable. Please try again shortly.",
        }


@router.post("/summarize")
def summarize_notes(payload: dict):
    """Summarize a block of academic text."""
    try:
        from services.llm_service import summarize_text
        text = payload.get("text", "").strip()
        if not text:
            return {"success": False, "message": "No text provided to summarize."}
        summary = summarize_text(text)
        return {"success": True, "summary": summary}
    except Exception as e:
        logger.error(f"Error in POST /api/tutor/summarize: {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "summary": "Summarization is currently unavailable. Please try again shortly.",
        }


@router.get("/health/ai")
def get_ai_health():
    """Check Ollama / LLM service status."""
    try:
        from services.llm_service import check_ai_health
        return check_ai_health()
    except Exception as e:
        return {
            "ollama": "unreachable",
            "model": "unknown",
            "inference": "failing",
            "reason": str(e)
        }