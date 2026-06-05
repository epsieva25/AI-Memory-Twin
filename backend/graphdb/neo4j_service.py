"""
Neo4j graph database service for student relationship mapping.
Supports relationships: STUDIES, WEAK_IN, COMPLETED, ASKED, HAS_STRESS, INTERESTED_IN.
"""
import logging
from typing import Optional, List
from neo4j import GraphDatabase
from config import settings

logger = logging.getLogger(__name__)

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password)
            )
            _driver.verify_connectivity()
            logger.info("Neo4j connected successfully")
        except Exception as e:
            logger.warning(f"Neo4j connection failed: {e}. Graph features will use fallback data.")
            _driver = None
    return _driver


def close_driver():
    global _driver
    if _driver:
        _driver.close()
        _driver = None


def create_student_node(student_id: int, name: str, department: str, year: int):
    """Create or update a student node in Neo4j."""
    driver = get_driver()
    if not driver:
        return

    with driver.session() as session:
        session.run(
            """
            MERGE (s:Student {id: $id})
            SET s.name = $name, s.department = $department, s.year = $year
            """,
            id=student_id, name=name, department=department, year=year
        )


def mark_weak_subject(student_id: int, subject: str):
    """Mark a subject as weak without requiring marks."""
    driver = get_driver()
    if not driver:
        return
    with driver.session() as session:
        session.run(
            """
            MERGE (s:Student {id: $student_id})
            MERGE (sub:Subject {name: $subject})
            MERGE (s)-[:WEAK_IN]->(sub)
            """,
            student_id=student_id, subject=subject,
        )


def create_subject_relationship(student_id: int, subject: str, marks: float, attendance: float):
    """Create student-subject relationship with performance data."""
    driver = get_driver()
    if not driver:
        return

    is_weak = (marks > 0 and marks < 60) or (attendance > 0 and attendance < 75)
    with driver.session() as session:
        session.run(
            """
            MERGE (s:Student {id: $student_id})
            MERGE (sub:Subject {name: $subject})
            MERGE (s)-[r:STUDIES]->(sub)
            SET r.marks = $marks, r.attendance = $attendance, r.is_weak = $is_weak
            """,
            student_id=student_id, subject=subject,
            marks=marks, attendance=attendance, is_weak=is_weak
        )
        if is_weak:
            session.run(
                """
                MERGE (s:Student {id: $student_id})
                MERGE (sub:Subject {name: $subject})
                MERGE (s)-[:WEAK_IN]->(sub)
                """,
                student_id=student_id, subject=subject
            )
        else:
            session.run(
                """
                MATCH (s:Student {id: $student_id})-[r:WEAK_IN]->(sub:Subject {name: $subject})
                DELETE r
                """,
                student_id=student_id, subject=subject
            )


def create_stress_performance_link(student_id: int, stress_level: float, gpa: float):
    """Link stress level to performance in Neo4j."""
    driver = get_driver()
    if not driver:
        return

    stress_category = "high" if stress_level > 70 else "medium" if stress_level > 40 else "low"
    with driver.session() as session:
        session.run(
            """
            MERGE (s:Student {id: $student_id})
            MERGE (st:StressLevel {category: $category})
            MERGE (s)-[r:HAS_STRESS]->(st)
            SET r.value = $stress, r.gpa = $gpa
            """,
            student_id=student_id, category=stress_category,
            stress=stress_level, gpa=gpa
        )


def sync_task(student_id: int, task_name: str, completed: bool):
    """Sync study plan task completion status to Neo4j."""
    driver = get_driver()
    if not driver:
        return

    with driver.session() as session:
        # Create Task node
        session.run(
            """
            MERGE (t:Task {name: $task_name})
            """,
            task_name=task_name
        )
        
        if completed:
            # Add COMPLETED relationship and delete TODO
            session.run(
                """
                MERGE (s:Student {id: $student_id})
                MERGE (t:Task {name: $task_name})
                MERGE (s)-[:COMPLETED]->(t)
                WITH s, t
                MATCH (s)-[r:TODO]->(t)
                DELETE r
                """,
                student_id=student_id, task_name=task_name
            )
        else:
            # Add TODO relationship and delete COMPLETED
            session.run(
                """
                MERGE (s:Student {id: $student_id})
                MERGE (t:Task {name: $task_name})
                MERGE (s)-[:TODO]->(t)
                WITH s, t
                MATCH (s)-[r:COMPLETED]->(t)
                DELETE r
                """,
                student_id=student_id, task_name=task_name
            )


def create_concept_asked_relationship(student_id: int, concept: str):
    """Link student to concepts they asked about in the tutor chat."""
    driver = get_driver()
    if not driver:
        return
    concept_name = concept.strip()
    if len(concept_name) > 35:
        concept_name = concept_name[:35] + "..."
    with driver.session() as session:
        session.run(
            """
            MERGE (s:Student {id: $student_id})
            MERGE (c:Concept {name: $concept})
            MERGE (s)-[:ASKED]->(c)
            """,
            student_id=student_id, concept=concept_name
        )


def create_interest_relationship(student_id: int, goals_text: str):
    """Create INTERESTED_IN relationships parsed from student profile goals."""
    driver = get_driver()
    if not driver:
        return
    if not goals_text:
        return
    
    # Simple semantic splitting by commas or periods
    goals = [g.strip() for g in goals_text.replace(".", ",").split(",") if g.strip()]
    with driver.session() as session:
        # Detach previous goals
        session.run(
            """
            MATCH (s:Student {id: $student_id})-[r:INTERESTED_IN]->(i:Interest)
            DETACH DELETE i
            """,
            student_id=student_id
        )
        for goal in goals[:3]:  # Limit to 3 nodes to avoid clutter
            session.run(
                """
                MERGE (s:Student {id: $student_id})
                MERGE (i:Interest {name: $goal})
                MERGE (s)-[:INTERESTED_IN]->(i)
                """,
                student_id=student_id, goal=goal
            )


def get_student_graph(student_id: int) -> dict:
    """Get the complete graph data for a student."""
    driver = get_driver()
    if not driver:
        return _get_fallback_graph(student_id)

    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (s:Student {id: $id})-[r]->(n)
                RETURN s, r, n, type(r) as rel_type, labels(n) as node_labels
                """,
                id=student_id
            )
            nodes = []
            links = []
            seen_nodes = set()

            student_node_id = f"Student_{student_id}"
            
            # Retrieve student name from postgres for fallback if not in graph node yet
            student_name = "Student"
            try:
                from database.connection import SessionLocal
                from models.student import Student as StudentModel
                db = SessionLocal()
                st = db.query(StudentModel).filter(StudentModel.id == student_id).first()
                if st:
                    student_name = st.full_name
                db.close()
            except Exception:
                pass

            nodes.append({
                "id": student_node_id,
                "name": student_name,
                "group": 1,
                "val": 20
            })
            seen_nodes.add(student_node_id)
            has_data = False

            for record in result:
                has_data = True
                source = record["s"]
                target = record["n"]
                node_labels = record["node_labels"]
                rel_type = record["rel_type"]
                
                # Fetch student name from node if available
                if source and source.get("name"):
                    nodes[0]["name"] = str(source.get("name"))

                # Robust node identification
                target_name = target.get("name") or target.get("subject") or target.get("category") or "Unknown"
                target_id = f"{node_labels[0] if node_labels else 'Node'}_{target_name}".replace(" ", "_")
                
                if target_id not in seen_nodes:
                    # Assign groups based on node labels for force-directed layout coloring
                    group = (
                        1 if "Student" in node_labels else
                        2 if "Subject" in node_labels else
                        3 if "Task" in node_labels else
                        4 if "Concept" in node_labels else
                        6 if "StressLevel" in node_labels else
                        7 if "Interest" in node_labels else 5
                    )
                    nodes.append({
                        "id": str(target_id),
                        "name": str(target_name),
                        "group": group,
                        "val": 12
                    })
                    seen_nodes.add(target_id)

                links.append({
                    "source": str(student_node_id),
                    "target": str(target_id),
                    "value": 2,
                    "type": str(rel_type)
                })

            if not has_data:
                return _build_graph_from_postgres(student_id)

            return {"nodes": nodes, "links": links}
    except Exception as e:
        logger.error(f"Neo4j query error: {e}")
        return _get_fallback_graph(student_id)


def _build_graph_from_postgres(student_id: int) -> dict:
    """Build a minimal graph from PostgreSQL when Neo4j has no relationships yet."""
    student_node_id = f"Student_{student_id}"
    nodes = [{"id": student_node_id, "group": 1, "val": 20, "name": "Student"}]
    links = []
    seen = {student_node_id}

    try:
        from database.connection import SessionLocal
        from models.student import Student as StudentModel
        from models.academic_record import AcademicRecord
        from models.study_plan import StudyPlan
        from models.chatbot_history import ChatbotHistory

        db = SessionLocal()
        st = db.query(StudentModel).filter(StudentModel.id == student_id).first()
        if st:
            nodes[0]["name"] = st.full_name
            if st.goals:
                gid = f"Interest_Goals"
                nodes.append({"id": gid, "group": 7, "val": 12, "name": (st.goals[:40] + "…") if len(st.goals) > 40 else st.goals})
                links.append({"source": student_node_id, "target": gid, "value": 1, "type": "INTERESTED_IN"})
                seen.add(gid)

        for r in db.query(AcademicRecord).filter(AcademicRecord.student_id == student_id).all():
            nid = f"Subject_{r.subject.replace(' ', '_')}"
            if nid not in seen:
                group = 3 if r.marks > 0 and r.marks < 60 else 2
                nodes.append({"id": nid, "group": group, "val": 14, "name": r.subject})
                seen.add(nid)
            rel = "WEAK_IN" if r.marks > 0 and r.marks < 60 else "STUDIES"
            links.append({"source": student_node_id, "target": nid, "value": 2, "type": rel})

        for p in db.query(StudyPlan).filter(StudyPlan.student_id == student_id).limit(8).all():
            tid = f"Task_{p.id}"
            nodes.append({"id": tid, "group": 3, "val": 10, "name": p.task[:30]})
            links.append({
                "source": student_node_id,
                "target": tid,
                "value": 1,
                "type": "COMPLETED" if p.completed else "TODO",
            })

        for c in db.query(ChatbotHistory).filter(ChatbotHistory.student_id == student_id).limit(3).all():
            cid = f"Concept_{c.id}"
            label = (c.prompt[:28] + "…") if len(c.prompt) > 28 else c.prompt
            nodes.append({"id": cid, "group": 4, "val": 10, "name": label})
            links.append({"source": student_node_id, "target": cid, "value": 1, "type": "ASKED"})

        db.close()
    except Exception as e:
        logger.warning(f"Postgres graph fallback failed: {e}")

    return {"nodes": nodes, "links": links}


def _get_fallback_graph(student_id: int) -> dict:
    """Profile-driven graph from PostgreSQL — never demo subjects."""
    return _build_graph_from_postgres(student_id)
