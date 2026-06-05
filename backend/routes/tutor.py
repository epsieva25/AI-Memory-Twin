"""
AI Tutor routes — Ollama/Llama3 powered chat, quiz, and summarization.

Fixes applied:
  - All routes have structured error responses.
  - Swapped get_demo_student with get_active_student.
  - Personalize AI Tutor context: gather student profile, grades, and stress in /chat.
  - Multi-turn conversation history injection for chat.
  - Automate Asked Concept relationship in Neo4j graph updates.
  - Fixed ChatbotHistory saving (uses prompt instead of question, removed session_id).
"""
import uuid
import logging
import traceback
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db, get_active_student
from models.chatbot_history import ChatbotHistory
from schemas.schemas import ChatMessage, ChatResponse, ChatHistoryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tutor", tags=["AI Tutor"])


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

    student = get_active_student(db)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Sync Asked Concept to Neo4j (async/non-blocking trigger)
    try:
        from graphdb.neo4j_service import create_concept_asked_relationship
        create_concept_asked_relationship(student.id, msg.message)
    except Exception as neo_e:
        logger.warning(f"Neo4j asked concept sync failed: {neo_e}")

    try:
        from services.student_context import build_student_context, context_to_system_prompt
        ctx = build_student_context(student, db)
        system_prompt = context_to_system_prompt(ctx)
    except Exception as e:
        logger.warning(f"Failed to compile personalization context: {e}")
        system_prompt = (
            "You are an expert AI tutor for university students. "
            "Explain concepts clearly with examples. Use Markdown formatting."
        )

    # Retrieve multi-turn chat history
    try:
        history_entries = (
            db.query(ChatbotHistory)
            .filter(ChatbotHistory.student_id == student.id)
            .order_by(ChatbotHistory.timestamp.desc())
            .limit(6)
            .all()
        )
        llm_history = []
        for entry in reversed(history_entries):
            llm_history.append({"role": "user", "content": entry.prompt})
            llm_history.append({"role": "assistant", "content": entry.response})
    except Exception as e:
        logger.warning(f"Failed to retrieve chat history: {e}")
        llm_history = []

    try:
        from services.llm_service import chat_with_llm
        response_text = chat_with_llm(msg.message, system_prompt=system_prompt, history=llm_history)
    except Exception as e:
        logger.error(f"LLM call failed in /api/tutor/chat: {e}\n{traceback.format_exc()}")
        from services.llm_service import _fallback_response
        response_text = _fallback_response(msg.message)

    # Save to chat history (non-blocking — failure here doesn't affect the response)
    try:
        history_entry = ChatbotHistory(
            student_id=student.id,
            prompt=msg.message,
            response=response_text,
            timestamp=now
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
    """Return the last N chat messages for the active student."""
    try:
        student = get_active_student(db)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        return (
            db.query(ChatbotHistory)
            .filter(ChatbotHistory.student_id == student.id)
            .order_by(ChatbotHistory.timestamp.desc())
            .limit(limit)
            .all()
        )
    except HTTPException:
        raise
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