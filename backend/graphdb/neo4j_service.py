"""
Neo4j graph database service for student relationship mapping.
"""
import logging
from typing import Optional
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


def create_subject_relationship(student_id: int, subject: str, marks: float, attendance: float):
    """Create student-subject relationship with performance data."""
    driver = get_driver()
    if not driver:
        return

    is_weak = marks < 60 or attendance < 75
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
                MERGE (w:Weakness {subject: $subject})
                MERGE (s)-[:HAS_WEAKNESS]->(w)
                SET w.marks = $marks
                """,
                student_id=student_id, subject=subject, marks=marks
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
            MERGE (s)-[r:EXPERIENCES]->(st)
            SET r.value = $stress, r.gpa = $gpa
            """,
            student_id=student_id, category=stress_category,
            stress=stress_level, gpa=gpa
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
            nodes.append({
                "id": student_node_id,
                "name": "Mary Jasper", # Or fetch from node
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
                
                # Fetch student name if available
                if source and source.get("name"):
                    nodes[0]["name"] = str(source.get("name"))

                # robust node id
                target_neo_id = getattr(target, "element_id", getattr(target, "id", None))
                target_name = target.get("name") or target.get("subject") or target.get("category") or str(target_neo_id)
                target_id = f"{node_labels[0] if node_labels else 'Node'}_{target_name}".replace(" ", "_")
                
                if target_id not in seen_nodes:
                    group = 2 if "Subject" in node_labels else 3 if "Weakness" in node_labels else 4
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
                return _get_fallback_graph(student_id)
                
            return {"nodes": nodes, "links": links}
    except Exception as e:
        logger.error(f"Neo4j query error: {e}")
        return _get_fallback_graph(student_id)


def _get_fallback_graph(student_id: int) -> dict:
    """Return mock graph data when Neo4j is unavailable."""
    student_node_id = f"Student_{student_id}"
    return {
        "nodes": [
            {"id": student_node_id, "group": 1, "val": 20, "name": "Mary Jasper"},
            {"id": "AI", "group": 2, "val": 15, "name": "Artificial Intelligence"},
            {"id": "OS", "group": 2, "val": 15, "name": "Operating Systems"},
            {"id": "DB", "group": 2, "val": 15, "name": "Database Systems"},
            {"id": "Neural Networks", "group": 3, "val": 10, "name": "Neural Networks (Weak)"},
            {"id": "Stress", "group": 4, "val": 12, "name": "High Stress"},
            {"id": "Productivity", "group": 4, "val": 12, "name": "Productivity"},
        ],
        "links": [
            {"source": student_node_id, "target": "AI", "value": 2, "type": "STUDIES"},
            {"source": student_node_id, "target": "OS", "value": 2, "type": "STUDIES"},
            {"source": student_node_id, "target": "DB", "value": 2, "type": "STUDIES"},
            {"source": "AI", "target": "Neural Networks", "value": 1, "type": "HAS_WEAKNESS"},
            {"source": student_node_id, "target": "Stress", "value": 1, "type": "EXPERIENCES"},
            {"source": student_node_id, "target": "Productivity", "value": 1, "type": "EXPERIENCES"},
        ]
    }
