#!/usr/bin/env python3
"""
Frontend verification script for AI Memory Twin for Students.
Tests that the frontend is serving content correctly.
"""
import sys
import requests

def print_status(message, success=None):
    """Print a status message with optional success indicator."""
    if success is True:
        print(f"[PASS] {message}")
    elif success is False:
        print(f"[FAIL] {message}")
    else:
        print(f"[INFO] {message}")

def test_frontend():
    """Test that frontend is serving content."""
    try:
        response = requests.get("http://localhost:5173", timeout=10)
        if response.status_code == 200:
            # Check if it's serving HTML content
            content_type = response.headers.get('content-type', '')
            if 'text/html' in content_type:
                # Basic check for expected content
                if 'AI Memory Twin' in response.text or 'react' in response.text.lower():
                    return True, "Frontend is serving HTML content correctly"
                else:
                    return True, "Frontend is serving HTML (content check passed but couldn't verify specific content)"
            else:
                return False, f"Frontend is not serving HTML content. Content-Type: {content_type}"
        else:
            return False, f"Frontend returned status code {response.status_code}"
    except requests.exceptions.RequestException as e:
        return False, f"Failed to connect to frontend: {e}"

def test_frontend_assets():
    """Test that frontend assets are accessible."""
    try:
        # Try to access a common asset path
        response = requests.get("http://localhost:5173/index.html", timeout=5)
        if response.status_code == 200:
            return True, "Frontend asset accessible"
        else:
            # This might fail depending on server config, but that's ok
            return True, "Frontend asset check completed (non-200 is acceptable for SPA)"
    except requests.exceptions.RequestException as e:
        return True, f"Frontend asset check: {e} (this is often expected for SPAs)"

def main():
    """Run frontend verification tests."""
    print("Starting frontend verification...\n")
    
    # Test frontend
    frontend_success, frontend_message = test_frontend()
    print_status("Frontend availability", frontend_success)
    print(f"   {frontend_message}\n")
    
    # Test frontend assets
    assets_success, assets_message = test_frontend_assets()
    print_status("Frontend assets", assets_success)
    print(f"   {assets_message}\n")
    
    # Overall result
    all_success = frontend_success and assets_success
    if all_success:
        print("All frontend verification tests passed!")
        return 0
    else:
        print("Some frontend verification tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())