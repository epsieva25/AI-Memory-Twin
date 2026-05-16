#!/usr/bin/env python3
"""
Phase 3: Database + Neo4j Verification for AI Memory Twin for Students.
Verifies PostgreSQL and Neo4j integrations in detail.
"""
import sys
from psycopg2 import connect as pg_connect
from neo4j import GraphDatabase
from config import settings

def print_status(message, success=None):
    """Print a status message with optional success indicator."""
    if success is True:
        print(f"[PASS] {message}")
    elif success is False:
        print(f"[FAIL] {message}")
    else:
        print(f"[INFO] {message}")

def test_postgresql_details():
    """PostgreSQL detailed verification."""
    try:
        conn = pg_connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            user=settings.postgres_user,
            password=settings.postgres_password,
            database=settings.postgres_db
        )
        cursor = conn.cursor()
        
        # 1. List tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cursor.fetchall()]
        expected_tables = {
            'students', 'academic_records', 'stress_logs', 
            'study_plans', 'notifications', 'chatbot_history'
        }
        if set(tables) >= expected_tables:
            print_status(f"Tables found: {', '.join(tables)}", True)
        else:
            missing = expected_tables - set(tables)
            print_status(f"Missing tables: {', '.join(missing)}", False)
            conn.close()
            return False
        
        # 2. Check demo student
        cursor.execute("SELECT id, name, email, department, year FROM students WHERE email = %s", 
                       ('demo@memorytwin.ai',))
        student = cursor.fetchone()
        if student:
            print_status(f"Demo student found: ID={student[0]}, Name={student[1]}, Email={student[2]}", True)
            student_id = student[0]
        else:
            print_status("Demo student not found", False)
            conn.close()
            return False
        
        # 3. Check academic records
        cursor.execute("SELECT COUNT(*) FROM academic_records WHERE student_id = %s", (student_id,))
        record_count = cursor.fetchone()[0]
        if record_count > 0:
            print_status(f"Academic records found: {record_count}", True)
            # Show a sample
            cursor.execute("SELECT subject, marks, attendance FROM academic_records WHERE student_id = %s LIMIT 3", (student_id,))
            samples = cursor.fetchall()
            for sample in samples:
                print_status(f"  Sample: {sample[0]} - Marks: {sample[1]}, Attendance: {sample[2]}", None)
        else:
            print_status("No academic records found for demo student", False)
            # Not a failure, just a warning
        
        # 4. Check stress logs
        cursor.execute("SELECT COUNT(*) FROM stress_logs WHERE student_id = %s", (student_id,))
        stress_count = cursor.fetchone()[0]
        if stress_count > 0:
            print_status(f"Stress logs found: {stress_count}", True)
        else:
            print_status("No stress logs found for demo student", False)
            # Not a failure
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print_status(f"PostgreSQL detailed verification failed: {e}", False)
        return False

def test_neo4j_details():
    """Neo4j detailed verification."""
    try:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        
        with driver.session() as session:
            # 1. Check if we can run a basic query
            result = session.run("RETURN 1 AS num")
            if result.single()["num"] == 1:
                print_status("Neo4j basic query successful", True)
            else:
                print_status("Neo4j basic query returned unexpected result", False)
                driver.close()
                return False
            
            # 2. Check for the demo student node (ID=1)
            result = session.run(
                "MATCH (s:Student {id: $id}) RETURN s.id AS id, s.name AS name, s.department AS department, s.year AS year",
                id=1
            )
            record = result.single()
            if record:
                print_status(f"Demo student node in Neo4j: ID={record['id']}, Name={record['name']}, Dept={record['department']}, Year={record['year']}", True)
            else:
                print_status("Demo student node not found in Neo4j (may be created on demand)", None)
                # This is okay because the node is created when we call the graph endpoint
            
            # 3. Check for any relationships from the demo student
            result = session.run(
                """
                MATCH (s:Student {id: $id})-[r]->(n)
                RETURN type(r) AS relationship_type, count(*) AS count
                """,
                id=1
            )
            relationships = list(result)
            if relationships:
                print_status(f"Found {len(relationships)} types of relationships from demo student:", None)
                for rel in relationships:
                    print_status(f"  {rel['relationship_type']}: {rel['count']}", None)
            else:
                print_status("No relationships found for demo student in Neo4j (may be empty)", None)
            
            # 4. Test creating a temporary node and relationship (clean up after)
            test_id = 99999  # Use a high ID unlikely to conflict
            try:
                # Create a test node
                session.run(
                    """
                    MERGE (s:TestNode {id: $id})
                    SET s.name = $name
                    """,
                    id=test_id, name="Test Node"
                )
                # Create a test relationship
                session.run(
                    """
                    MATCH (s:TestNode {id: $id})
                    CREATE (s)-[:TEST_REL]->(t:TestTarget {name: 'Target'})
                    """,
                    id=test_id
                )
                # Verify
                result = session.run(
                    """
                    MATCH (s:TestNode {id: $id})-[:TEST_REL]->(t:TestTarget)
                    RETURN s.name AS source, t.name AS target
                    """,
                    id=test_id
                )
                if result.single():
                    print_status("Neo4j node and relationship creation/test successful", True)
                else:
                    print_status("Neo4j test relationship not found", False)
                
                # Clean up
                session.run(
                    """
                    MATCH (s:TestNode {id: $id})
                    OPTIONAL MATCH (s)-[r]-()
                    DELETE r, s
                    """,
                    id=test_id
                )
                session.run(
                    """
                    MATCH (t:TestTarget {name: 'Target'})
                    DETACH DELETE t
                    """
                )
            except Exception as e:
                print_status(f"Neo4j test node/relationship operation failed: {e}", False)
                # Try to clean up anyway
                try:
                    session.run(
                        """
                        MATCH (s:TestNode {id: $id})
                        OPTIONAL MATCH (s)-[r]-()
                        DELETE r, s
                        """,
                        id=test_id
                    )
                    session.run(
                        """
                        MATCH (t:TestTarget {name: 'Target'})
                        DETACH DELETE t
                        """
                    )
                except:
                    pass
                driver.close()
                return False
        
        driver.close()
        return True
        
    except Exception as e:
        print_status(f"Neo4j detailed verification failed: {e}", False)
        return False

def main():
    """Run Phase 3 verification tests."""
    print("Starting Phase 3: Database + Neo4j Verification...\n")
    
    # Test PostgreSQL details
    pg_success = test_postgresql_details()
    print()
    
    # Test Neo4j details
    neo4j_success = test_neo4j_details()
    print()
    
    # Overall result
    if pg_success and neo4j_success:
        print("🎉 All Phase 3 (Database + Neo4j) verification tests passed!")
        return 0
    else:
        print("💥 Some Phase 3 verification tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())