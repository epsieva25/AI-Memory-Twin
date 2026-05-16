"""
Graph routes — Neo4j knowledge graph visualization.

Fixes applied:
  - Added top-level Student import (was missing, caused NameError on /student/{id}).
  - All routes now have try/except with fallback empty graph data.
  - Neo4j being offline no longer crashes the backend.
"""
import logging
import traceback
import math
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from models.academic_record import AcademicRecord
from models.stress_log import StressLog
from models.student import Student  # ← was missing, caused NameError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/graph", tags=["Graph Visualization"])

_EMPTY_GRAPH = {"nodes": [], "links": []}


def _try_neo4j_import():
    """Lazily import Neo4j helpers so an offline Neo4j doesn't crash startup."""
    try:
        from graphdb.neo4j_service import (
            get_student_graph,
            create_student_node,
            create_subject_relationship,
            create_stress_performance_link,
        )
        return get_student_graph, create_student_node, create_subject_relationship, create_stress_performance_link
    except Exception as e:
        logger.warning(f"Neo4j helpers unavailable: {e}")
        return None, None, None, None


def _sanitize(val, default):
    """Return default if val is None, NaN, or Inf."""
    if val is None:
        return default
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return default
    return val


def get_demo_student(db: Session):
    """Get or create the default demo student."""
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


@router.get("/student-map")
def get_student_map(db: Session = Depends(get_db)):
    """Build Neo4j graph for the demo student and return node/link data."""
    try:
        get_student_graph, create_student_node, create_subject_relationship, create_stress_performance_link = _try_neo4j_import()

        student = get_demo_student(db)

        if create_student_node:
            try:
                create_student_node(
                    student_id=student.id,
                    name=student.name,
                    department=student.department,
                    year=student.year,
                )
                records = db.query(AcademicRecord).filter(
                    AcademicRecord.student_id == student.id
                ).all()
                for r in records:
                    create_subject_relationship(
                        student_id=student.id,
                        subject=r.subject,
                        marks=r.marks,
                        attendance=r.attendance,
                    )
                stress_log = (
                    db.query(StressLog)
                    .filter(StressLog.student_id == student.id)
                    .order_by(StressLog.timestamp.desc())
                    .first()
                )
                if stress_log and records:
                    avg_marks = sum(r.marks for r in records) / len(records)
                    gpa = (avg_marks / 100) * 4.0
                    create_stress_performance_link(student.id, stress_log.stress_level, gpa)
            except Exception as neo_e:
                logger.warning(f"Neo4j write skipped: {neo_e}")

        if get_student_graph:
            return get_student_graph(student.id)

        return _EMPTY_GRAPH
    except Exception as e:
        logger.error(f"Error in GET /api/graph/student-map: {e}\n{traceback.format_exc()}")
        return _EMPTY_GRAPH


@router.get("/student/{student_id}")
def get_student_specific_graph(student_id: int, db: Session = Depends(get_db)):
    """Fetch and return graph for a specific student ID."""
    try:
        get_student_graph, create_student_node, _, _ = _try_neo4j_import()

        # Optionally sync student data to Neo4j
        if create_student_node:
            try:
                student = db.query(Student).filter(Student.id == student_id).first()
                if student:
                    create_student_node(
                        student_id=student.id,
                        name=student.name,
                        department=student.department,
                        year=student.year,
                    )
            except Exception as e:
                logger.warning(f"Skipping Neo4j sync for student {student_id}: {e}")

        graph_data = get_student_graph(student_id) if get_student_graph else _EMPTY_GRAPH

        # Sanitize node/link values before sending to frontend
        valid_nodes = []
        for node in graph_data.get("nodes", []):
            if not node.get("id"):
                continue
            valid_nodes.append({
                "id": str(node.get("id")),
                "name": str(node.get("name", "Unknown")),
                "group": _sanitize(node.get("group"), 1),
                "val": _sanitize(node.get("val"), 10),
            })

        valid_links = []
        for link in graph_data.get("links", []):
            if not link.get("source") or not link.get("target"):
                continue
            valid_links.append({
                "source": str(link.get("source")),
                "target": str(link.get("target")),
                "value": _sanitize(link.get("value"), 1),
                "type": str(link.get("type", "RELATES_TO")),
            })

        return {"nodes": valid_nodes, "links": valid_links}

    except Exception as e:
        logger.error(
            f"Error in GET /api/graph/student/{student_id}: {e}\n{traceback.format_exc()}"
        )
        return _EMPTY_GRAPH


@router.get("/performance-network")
def get_performance_network(db: Session = Depends(get_db)):
    """Return a subject performance network built from PostgreSQL data (no Neo4j needed)."""
    try:
        student = get_demo_student(db)
        records = db.query(AcademicRecord).filter(
            AcademicRecord.student_id == student.id
        ).all()

        nodes = [{"id": "Student", "group": 1, "val": 20, "name": student.name}]
        links = []

        for r in records:
            node_id = r.subject.replace(" ", "_")
            group = 2 if r.marks >= 75 else 3 if r.marks >= 60 else 4
            nodes.append({
                "id": node_id,
                "group": group,
                "val": 12,
                "name": f"{r.subject} ({r.marks:.0f}%)",
            })
            links.append({"source": "Student", "target": node_id, "value": 2})

        return {"nodes": nodes, "links": links}

    except Exception as e:
        logger.error(
            f"Error in GET /api/graph/performance-network: {e}\n{traceback.format_exc()}"
        )
        return _EMPTY_GRAPH