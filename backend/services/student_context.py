"""
Build a unified context dict for AI tutoring and agents from PostgreSQL (+ optional Neo4j).
"""
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from models.academic_record import AcademicRecord
from models.stress_log import StressLog
from models.study_plan import StudyPlan
from models.chatbot_history import ChatbotHistory


def build_student_context(student, db: Session) -> Dict[str, Any]:
    records = db.query(AcademicRecord).filter(AcademicRecord.student_id == student.id).all()
    stress_logs = (
        db.query(StressLog)
        .filter(StressLog.student_id == student.id)
        .order_by(StressLog.timestamp.desc())
        .limit(7)
        .all()
    )
    pending = (
        db.query(StudyPlan)
        .filter(StudyPlan.student_id == student.id, StudyPlan.completed == False)
        .order_by(StudyPlan.deadline.asc())
        .limit(8)
        .all()
    )
    chats = (
        db.query(ChatbotHistory)
        .filter(ChatbotHistory.student_id == student.id)
        .order_by(ChatbotHistory.timestamp.desc())
        .limit(5)
        .all()
    )

    weak = [r.subject for r in records if r.marks < 60 or r.attendance < 75]
    strong = [r.subject for r in records if r.marks >= 80 and r.attendance >= 85]

    graph_snippet = ""
    try:
        from graphdb.neo4j_service import get_student_graph
        g = get_student_graph(student.id)
        concepts = [n["name"] for n in g.get("nodes", []) if "Concept" in str(n.get("id", ""))][:5]
        if concepts:
            graph_snippet = "Recent topics discussed: " + ", ".join(concepts)
    except Exception:
        pass

    latest_stress = stress_logs[0].stress_level if stress_logs else None

    return {
        "profile": student,
        "records": records,
        "stress_logs": stress_logs,
        "pending_plans": pending,
        "recent_chats": chats,
        "weak_subjects": weak,
        "strong_subjects": strong,
        "latest_stress": latest_stress,
        "graph_snippet": graph_snippet,
    }


def context_to_system_prompt(ctx: Dict[str, Any]) -> str:
    student = ctx["profile"]
    records = ctx["records"]
    stress_logs = ctx["stress_logs"]
    pending = ctx["pending_plans"]

    academics = (
        ", ".join(f"{r.subject}: {r.marks}% ({r.attendance}% att.)" for r in records)
        if records
        else "No grades recorded yet."
    )
    stress_summary = (
        ", ".join(f"{s.mood} ({s.stress_level}%)" for s in stress_logs)
        if stress_logs
        else "No wellness check-ins yet."
    )
    plans_summary = ", ".join(p.task for p in pending) if pending else "No pending study tasks."
    weak = ", ".join(ctx["weak_subjects"]) or "None identified yet"
    strong = ", ".join(ctx["strong_subjects"]) or "None identified yet"

    latest_stress = ctx.get("latest_stress") or 40
    high_stress = latest_stress > 70

    tone = (
        "Keep answers concise, gentle, and wellness-focused. Suggest a short breathing break."
        if high_stress
        else "Provide clear, in-depth explanations with examples when helpful."
    )

    return (
        "You are an expert AI tutor and personalized academic companion.\n"
        f"Student: {student.full_name} | {student.department} | Year {student.year}, Sem {student.semester}\n"
        f"Goals: {student.goals or 'Not set'}\n"
        f"Interests: {student.interests or 'Not set'}\n"
        f"Current CGPA: {student.current_cgpa or 'Not set'} | Target: {student.target_cgpa:.2f}\n"
        f"Preferred study: {student.preferred_study_time or 'Flexible'} | Daily hours: {student.daily_study_hours or 2}\n"
        f"Weak subjects: {weak}\n"
        f"Strong subjects: {strong}\n"
        f"Academic records: {academics}\n"
        f"Recent stress: {stress_summary}\n"
        f"Pending tasks: {plans_summary}\n"
        f"{ctx.get('graph_snippet', '')}\n\n"
        f"Response style: {tone}\n"
        "Use Markdown: **bold** for key terms, bullet lists for steps, code blocks for code."
    )
