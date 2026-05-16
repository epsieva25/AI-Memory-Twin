#!/usr/bin/env python3
"""
Phase 4: Docker + Deployment Verification for AI Memory Twin for Students.
Verifies that all Docker services are running correctly and healthy.
"""
import sys
import subprocess
import re
import json
import requests

def run_command(cmd):
    """Run a shell command and return stdout, stderr, and return code."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Timeout", 1
    except Exception as e:
        return "", str(e), 1

def print_status(message, success=None):
    """Print a status message with optional success indicator."""
    if success is True:
        print(f"[PASS] {message}")
    elif success is False:
        print(f"[FAIL] {message}")
    else:
        print(f"[INFO] {message}")

def get_container_status(service_name):
    """Get the status of a service from docker compose ps."""
    stdout, stderr, rc = run_command(f"docker compose -f docker-compose.yml ps {service_name}")
    if rc != 0:
        return None, f"Failed to get status for {service_name}: {stderr}"
    
    # Parse the output. Example line:
    # memorytwin_postgres   postgres:16-alpine   "docker-entrypoint.s…"   postgres   2 hours ago   Up 2 hours (healthy)   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
    lines = stdout.strip().split('\n')
    # Skip header if present
    for line in lines:
        if line.strip() == "" or line.startswith("NAME"):
            continue
        # The service name is the first column, but the container name might be different.
        # We'll just check if the service_name appears in the line and then look for the status.
        if service_name in line:
            # Extract the status part: look for "Up ..." or "Exit ..."
            # We'll look for the pattern: Up .* (healthy) or Up .* or Exit
            match = re.search(r'(Up\s+[^)]+\(healthy\)|Up\s+[^)]+|Exited\s+[^)]+)', line)
            if match:
                status = match.group(1)
                return status, None
            else:
                # If we can't find the pattern, return the whole line for debugging
                return line.strip(), None
    return None, f"Container for service '{service_name}' not found in ps output"

def check_service_health(service_name):
    """Check if a service is running and healthy if applicable."""
    status, error = get_container_status(service_name)
    if error:
        print_status(f"Service {service_name} check failed", False)
        print(f"   {error}")
        return False
    if status is None:
        print_status(f"Service {service_name} not found", False)
        return False
    
    # Check if it's running
    if "Up" in status:
        # If it has a healthcheck in the compose file, we expect to see "(healthy)"
        # We know that postgres, backend, frontend have healthchecks.
        # Neo4j also has a healthcheck.
        if service_name in ["postgres", "backend", "frontend", "neo4j"]:
            if "(healthy)" in status:
                print_status(f"Service {service_name} is healthy", True)
                return True
            else:
                print_status(f"Service {service_name} is running but not healthy: {status}", False)
                return False
        else:
            # For services without healthcheck (like neo4j in some cases, but we have one)
            # or if we don't require healthy, just running is enough.
            print_status(f"Service {service_name} is running: {status}", True)
            return True
    else:
        print_status(f"Service {service_name} is not running: {status}", False)
        return False

def test_backend_health_endpoint():
    """Test the backend health endpoint."""
    try:
        response = requests.get("http://localhost:8000/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy" and data.get("database") == "connected":
                print_status("Backend health endpoint returns healthy", True)
                return True
            else:
                print_status(f"Backend health endpoint returned unexpected data: {data}", False)
                return False
        else:
            print_status(f"Backend health endpoint returned status {response.status_code}", False)
            return False
    except Exception as e:
        print_status(f"Failed to connect to backend health endpoint: {e}", False)
        return False

def test_frontend_endpoint():
    """Test the frontend endpoint."""
    try:
        response = requests.get("http://localhost:5173", timeout=10)
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            if 'text/html' in content_type:
                print_status("Frontend is serving HTML content", True)
                return True
            else:
                print_status(f"Frontend is not serving HTML (Content-Type: {content_type})", False)
                return False
        else:
            print_status(f"Frontend returned status {response.status_code}", False)
            return False
    except Exception as e:
        print_status(f"Failed to connect to frontend: {e}", False)
        return False

def main():
    """Run Phase 4 verification tests."""
    print("Starting Phase 4: Docker + Deployment Verification...\n")
    
    # Services to check (ollama is allowed to be unhealthy, so we skip it for health)
    services = ["postgres", "neo4j", "backend", "frontend"]
    all_healthy = True
    
    for service in services:
        if not check_service_health(service):
            all_healthy = False
        # Add a small space between checks for readability
        print()
    
    # Test backend health endpoint
    print("Testing backend health endpoint:")
    backend_endpoint_ok = test_backend_health_endpoint()
    print()
    
    # Test frontend endpoint
    print("Testing frontend endpoint:")
    frontend_endpoint_ok = test_frontend_endpoint()
    print()
    
    # Overall result
    if all_healthy and backend_endpoint_ok and frontend_endpoint_ok:
        print("*** All Phase 4 (Docker + Deployment) verification tests passed! ***")
        return 0
    else:
        print("!!! Some Phase 4 verification tests failed. !!!")
        return 1

if __name__ == "__main__":
    sys.exit(main())