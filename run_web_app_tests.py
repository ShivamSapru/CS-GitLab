#!/usr/bin/env python3
"""
Local test runner for web-app tests
Usage: python run_web_app_tests.py [test_type]
Where test_type can be: unit, integration, all (default)
"""

import subprocess
import sys
import os
from pathlib import Path

def run_tests(test_type="all"):
    """Run web-app tests locally"""
    
    # Set environment variables for testing
    os.environ.setdefault("TEST_BASE_URL", "http://localhost:8000")
    os.environ.setdefault("PYTHONPATH", str(Path(__file__).parent))
    
    # First, test connection to ensure server is running
    print("Testing connection to FastAPI server...")
    debug_script = Path(__file__).parent / "debug_test_connection.py"
    if debug_script.exists():
        debug_result = subprocess.run([sys.executable, str(debug_script)], 
                                    capture_output=True, text=True)
        if debug_result.returncode != 0:
            print("❌ Connection test failed!")
            print("STDOUT:", debug_result.stdout)
            print("STDERR:", debug_result.stderr)
            print("\n💡 Make sure the FastAPI server is running:")
            print("   cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000")
            return 1
        else:
            print("✅ Connection test passed!")
    
    # Test commands based on type
    if test_type == "unit":
        cmd = ["python", "-m", "pytest", "tests/web-app/unit-tests/", "-v", "-m", "unit"]
    elif test_type == "integration":
        cmd = ["python", "-m", "pytest", "tests/web-app/integration-tests/", "-v", "-m", "integration"]
    elif test_type == "all":
        cmd = ["python", "-m", "pytest", "tests/web-app/", "-v"]
    else:
        print(f"Unknown test type: {test_type}")
        print("Available types: unit, integration, all")
        return 1
    
    print(f"Running web-app tests: {test_type}")
    print(f"Command: {' '.join(cmd)}")
    print("-" * 50)
    
    # Run the tests
    try:
        result = subprocess.run(cmd, cwd=Path(__file__).parent)
        return result.returncode
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
        return 1
    except Exception as e:
        print(f"Error running tests: {e}")
        return 1

if __name__ == "__main__":
    test_type = sys.argv[1] if len(sys.argv) > 1 else "all"
    exit_code = run_tests(test_type)
    sys.exit(exit_code)
