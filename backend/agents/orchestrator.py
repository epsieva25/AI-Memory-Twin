"""
Multi-Agent AI Architecture for AI Memory Twin.
Agents communicate via service layers.
"""
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class PlannerAgent:
    """Responsible for generating and optimizing study plans."""

    def __init__(self):
        self.name = "PlannerAgent"

    def run(self, student_id: int, db: Session) -> Dict[str, Any]:
        from services.planner_service import generate_study_plan
        logger.info(f"[{self.name}] Generating plan for student {student_id}")
        tasks = generate_study_plan(student_id, db)
        return {"agent": self.name, "tasks_created": len(tasks), "status": "completed"}


class TutorAgent:
    """Handles AI tutoring interactions."""

    def __init__(self):
        self.name = "TutorAgent"

    def run(self, question: str, subject_context: str = "") -> Dict[str, Any]:
        from services.llm_service import tutor_response
        logger.info(f"[{self.name}] Processing tutoring request")
        response = tutor_response(question, subject_context)
        return {"agent": self.name, "response": response, "status": "completed"}


class AnalyticsAgent:
    """Analyzes student performance data and generates insights."""

    def __init__(self):
        self.name = "AnalyticsAgent"

    def run(self, student_id: int, db: Session) -> Dict[str, Any]:
        from models.academic_record import AcademicRecord
        from models.stress_log import StressLog
        logger.info(f"[{self.name}] Analyzing data for student {student_id}")

        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student_id
        ).all()
        avg_marks = sum(r.marks for r in records) / len(records) if records else 0
        weak_subjects = [r.subject for r in records if r.marks < 60]

        return {
            "agent": self.name,
            "avg_marks": round(avg_marks, 1),
            "weak_subjects": weak_subjects,
            "gpa": round((avg_marks / 100) * 4.0, 2),
            "status": "completed"
        }


class MotivationAgent:
    """Generates personalized motivational content."""

    def __init__(self):
        self.name = "MotivationAgent"

    def run(self, student_data: Dict) -> Dict[str, Any]:
        from services.llm_service import generate_motivation
        logger.info(f"[{self.name}] Generating motivational content")
        message = generate_motivation(student_data)
        return {"agent": self.name, "message": message, "status": "completed"}


class MemoryAgent:
    """Manages Neo4j graph memory relationships."""

    def __init__(self):
        self.name = "MemoryAgent"

    def run(self, student_id: int, db: Session) -> Dict[str, Any]:
        from graphdb.neo4j_service import (
            create_student_node, create_subject_relationship, create_stress_performance_link
        )
        from models.student import Student
        from models.academic_record import AcademicRecord
        from models.stress_log import StressLog
        logger.info(f"[{self.name}] Syncing graph memory for student {student_id}")

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {"agent": self.name, "status": "failed", "error": "Student not found"}

        create_student_node(student_id, student.name, student.department, student.year)

        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student_id
        ).all()
        for r in records:
            create_subject_relationship(student_id, r.subject, r.marks, r.attendance)

        stress_log = db.query(StressLog).filter(
            StressLog.student_id == student_id
        ).order_by(StressLog.timestamp.desc()).first()

        if stress_log and records:
            avg_marks = sum(r.marks for r in records) / len(records)
            gpa = (avg_marks / 100) * 4.0
            create_stress_performance_link(student_id, stress_log.stress_level, gpa)

        return {"agent": self.name, "relationships_synced": len(records), "status": "completed"}


class AgentOrchestrator:
    """Orchestrates all agents for a full student analysis cycle."""

    def __init__(self):
        self.planner = PlannerAgent()
        self.tutor = TutorAgent()
        self.analytics = AnalyticsAgent()
        self.motivation = MotivationAgent()
        self.memory = MemoryAgent()

    def run_full_cycle(self, student_id: int, db: Session) -> Dict[str, Any]:
        """Run all agents for comprehensive student analysis."""
        logger.info(f"[Orchestrator] Starting full cycle for student {student_id}")
        results = {}

        # Analytics first
        analytics_result = self.analytics.run(student_id, db)
        results["analytics"] = analytics_result

        # Memory sync
        results["memory"] = self.memory.run(student_id, db)

        # Motivation based on analytics
        results["motivation"] = self.motivation.run({
            "gpa": analytics_result.get("gpa", 3.0),
            "weak_subjects": analytics_result.get("weak_subjects", [])
        })

        # Planner
        results["planner"] = self.planner.run(student_id, db)

        logger.info(f"[Orchestrator] Full cycle completed for student {student_id}")
        return results
