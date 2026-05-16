#!/usr/bin/env python3
"""
Backend verification script for AI Memory Twin for Students.
Tests API endpoints, database connectivity, and Neo4j connectivity.
"""
import sys
import json
import time
import requests
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

def test_api_endpoint(url, method='GET', json_data=None, headers=None, timeout=10):
    """Test an API endpoint and return the response."""
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=timeout)
        elif method == 'POST':
            response = requests.post(url, json=json_data, headers=headers, timeout=timeout)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json(), None
    except requests.exceptions.RequestException as e:
        return None, str(e)
    except json.JSONDecodeError as e:
        return None, f"Invalid JSON response: {e}"

def test_database():
    """Test PostgreSQL database connectivity."""
    try:
        conn = pg_connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            user=settings.postgres_user,
            password=settings.postgres_password,
            database=settings.postgres_db
        )
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        if result and result[0] == 1:
            return True, "Database connection successful"
        else:
            return False, "Database query returned unexpected result"
    except Exception as e:
        return False, f"Database connection failed: {e}"

def test_neo4j():
    """Test Neo4j connectivity."""
    try:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        with driver.session() as session:
            result = session.run("RETURN 1 AS num")
            record = result.single()
            if record and record["num"] == 1:
                driver.close()
                return True, "Neo4j connection successful"
            else:
                driver.close()
                return False, "Neo4j query returned unexpected result"
    except Exception as e:
        return False, f"Neo4j connection failed: {e}"

def test_api_endpoints():
    """Test key API endpoints."""
    base_url = "http://localhost:8000"
    # Tutor endpoint may need more time if Ollama is loading the model
    endpoints = [
        ("GET", "/", None, 10),
        ("GET", "/health", None, 10),
        ("GET", "/api/graph/student-map", None, 10),
        ("POST", "/api/tutor/chat", {"message": "test"}, 60),  # longer timeout for tutor
    ]
    
    results = []
    for method, endpoint, data, timeout in endpoints:
        url = f"{base_url}{endpoint}"
        json_data = data if method == 'POST' else None
        response, error = test_api_endpoint(url, method, json_data, timeout=timeout)
        if error:
            results.append((endpoint, False, error))
        else:
            results.append((endpoint, True, "OK"))
    
    return results

def main():
    """Run all verification tests."""
    print("Starting backend verification...\n")
    
    # Test database
    db_success, db_message = test_database()
    print_status("Database connectivity", db_success)
    print(f"   {db_message}\n")
    
    # Test Neo4j
    neo4j_success, neo4j_message = test_neo4j()
    print_status("Neo4j connectivity", neo4j_success)
    print(f"   {neo4j_message}\n")
    
    # Test API endpoints
    print("Testing API endpoints:")
    api_results = test_api_endpoints()
    for endpoint, success, message in api_results:
        print_status(f"  {endpoint}", success)
        if not success:
            print(f"     {message}")
    print()
    
    # Overall result
    all_success = db_success and neo4j_success and all(success for _, success, _ in api_results)
    if all_success:
        print("All backend verification tests passed!")
        return 0
    else:
        print("Some backend verification tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())