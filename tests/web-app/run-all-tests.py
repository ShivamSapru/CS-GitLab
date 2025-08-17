#!/usr/bin/env python3
"""
Comprehensive test runner for web application
Runs all test suites: frontend units, backend integration, and E2E tests
"""

import subprocess
import sys
import os
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse

class WebAppTestRunner:
    def __init__(self):
        self.test_dir = Path(__file__).parent
        self.project_root = self.test_dir.parent.parent
        self.results = {}
        self.start_time = time.time()

    def log(self, message, level="INFO"):
        """Log with timestamp"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_command(self, command, cwd=None, env=None):
        """Run command and return result"""
        try:
            cwd = cwd or self.test_dir
            env = env or os.environ.copy()
            
            self.log(f"Running: {' '.join(command)}")
            result = subprocess.run(
                command,
                cwd=cwd,
                env=env,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            return {
                'success': result.returncode == 0,
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'command': ' '.join(command)
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'returncode': -1,
                'stdout': '',
                'stderr': 'Command timed out after 5 minutes',
                'command': ' '.join(command)
            }
        except Exception as e:
            return {
                'success': False,
                'returncode': -1,
                'stdout': '',
                'stderr': str(e),
                'command': ' '.join(command)
            }

    def check_prerequisites(self):
        """Check if all prerequisites are installed"""
        self.log("Checking prerequisites...")
        
        # Check Python
        python_result = self.run_command(['python', '--version'])
        if not python_result['success']:
            self.log("Python not found", "ERROR")
            return False
        
        # Check Node.js/Yarn
        yarn_result = self.run_command(['yarn', '--version'])
        if not yarn_result['success']:
            self.log("Yarn not found", "ERROR")
            return False
            
        # Check if backend dependencies are installed
        backend_deps = self.project_root / 'backend' / 'requirements.txt'
        if not backend_deps.exists():
            self.log("Backend requirements.txt not found", "ERROR")
            return False
            
        self.log("Prerequisites check passed")
        return True

    def setup_test_environment(self):
        """Set up test environment variables"""
        self.log("Setting up test environment...")
        
        test_env = {
            'TEST_BASE_URL': 'http://localhost:8000',
            'TEST_FRONTEND_URL': 'http://localhost:3000',
            'POSTGRES_DB': 'testdb',
            'POSTGRES_USER': 'testuser',
            'POSTGRES_PASSWORD': 'testpass',
            'POSTGRES_HOSTNAME': 'localhost',
            'POSTGRES_PORT': '5432',
            'POSTGRES_REQUIRE_SSL': 'false',
            'SESSION_SECRET_KEY': 'test-secret-key-for-testing-only',
            'FRONTEND_URL': 'http://localhost:3000',
            # Mock Azure services
            'AZURE_TRANSLATOR_KEY': 'mock-translator-key-for-testing',
            'AZURE_TRANSLATOR_ENDPOINT': 'https://api.cognitive.microsofttranslator.com',
            'AZURE_TRANSLATOR_REGION': 'mock-region',
            'AZURE_SPEECH_KEY': 'mock-speech-key-for-testing',
            'AZURE_SPEECH_REGION': 'mock-region',
            'AZURE_STORAGE_CONNECTION_STRING': 'DefaultEndpointsProtocol=https;AccountName=mockaccount;AccountKey=bW9ja2tleWZvcnRlc3RpbmcxMjM0NTY3ODkwYWJjZGVmZ2hpams=;EndpointSuffix=core.windows.net',
        }
        
        os.environ.update(test_env)
        return test_env

    def install_dependencies(self):
        """Install all test dependencies"""
        self.log("Installing dependencies...")
        
        tasks = []
        
        # Install frontend test dependencies
        frontend_test_dir = self.test_dir / 'frontend-tests'
        if frontend_test_dir.exists():
            tasks.append(('Frontend Unit Tests', 
                         ['yarn', 'install'], 
                         frontend_test_dir))
        
        # Install E2E test dependencies  
        e2e_test_dir = self.test_dir / 'e2e-tests'
        if e2e_test_dir.exists():
            tasks.append(('E2E Tests',
                         ['yarn', 'install'],
                         e2e_test_dir))
            
        # Install backend dependencies
        backend_dir = self.project_root / 'backend'
        if backend_dir.exists():
            tasks.append(('Backend',
                         ['pip', 'install', '-r', 'requirements.txt'],
                         backend_dir))
        
        for name, command, cwd in tasks:
            self.log(f"Installing {name} dependencies...")
            result = self.run_command(command, cwd=cwd)
            if not result['success']:
                self.log(f"Failed to install {name} dependencies: {result['stderr']}", "ERROR")
                return False
                
        self.log("All dependencies installed successfully")
        return True

    def run_frontend_unit_tests(self):
        """Run frontend unit tests"""
        self.log("Running frontend unit tests...")
        
        frontend_test_dir = self.test_dir / 'frontend-tests'
        if not frontend_test_dir.exists():
            return {'success': False, 'error': 'Frontend test directory not found'}
        
        # Run Jest tests
        result = self.run_command(
            ['yarn', 'test:ci'],
            cwd=frontend_test_dir
        )
        
        return result

    def run_backend_integration_tests(self):
        """Run backend integration tests"""
        self.log("Running backend integration tests...")
        
        # Check if server is running
        health_check = self.run_command(['curl', '-s', 'http://localhost:8000/api/health'])
        if not health_check['success']:
            self.log("Backend server not running. Please start it first.", "ERROR")
            return {'success': False, 'error': 'Backend server not available'}
        
        test_commands = [
            (['python', '-m', 'pytest', 'unit-tests/', '-v'], 'API Tests'),
            (['python', '-m', 'pytest', 'integration-tests/test_authentication_flow.py', '-v'], 'Auth Tests'),
            (['python', '-m', 'pytest', 'integration-tests/test_file_operations.py', '-v'], 'File Tests'),
        ]
        
        results = {}
        for command, name in test_commands:
            self.log(f"Running {name}...")
            result = self.run_command(command, cwd=self.test_dir)
            results[name] = result
            
            if not result['success']:
                self.log(f"{name} failed: {result['stderr']}", "ERROR")
            else:
                self.log(f"{name} passed")
                
        # Overall success if all tests passed
        overall_success = all(r['success'] for r in results.values())
        return {
            'success': overall_success,
            'results': results,
            'stdout': '\n'.join(r['stdout'] for r in results.values()),
            'stderr': '\n'.join(r['stderr'] for r in results.values() if r['stderr'])
        }

    def run_e2e_tests(self):
        """Run E2E tests"""
        self.log("Running E2E tests...")
        
        e2e_test_dir = self.test_dir / 'e2e-tests'
        if not e2e_test_dir.exists():
            return {'success': False, 'error': 'E2E test directory not found'}
        
        # Check if frontend is running
        frontend_check = self.run_command(['curl', '-s', 'http://localhost:3000'])
        if not frontend_check['success']:
            self.log("Frontend server not running. Please start it first.", "ERROR")
            return {'success': False, 'error': 'Frontend server not available'}
        
        # Install browsers if needed
        self.log("Installing Playwright browsers...")
        browser_install = self.run_command(['npx', 'playwright', 'install'], cwd=e2e_test_dir)
        if not browser_install['success']:
            self.log("Warning: Could not install browsers", "WARN")
        
        # Run Playwright tests
        result = self.run_command(
            ['npx', 'playwright', 'test', '--reporter=json'],
            cwd=e2e_test_dir
        )
        
        return result

    def generate_report(self):
        """Generate test report"""
        self.log("Generating test report...")
        
        end_time = time.time()
        duration = end_time - self.start_time
        
        report = {
            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
            'duration': f"{duration:.2f}s",
            'results': self.results,
            'summary': {
                'total_suites': len(self.results),
                'passed_suites': len([r for r in self.results.values() if r.get('success', False)]),
                'failed_suites': len([r for r in self.results.values() if not r.get('success', True)])
            }
        }
        
        # Write JSON report
        report_file = self.test_dir / 'test-report.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("TEST REPORT SUMMARY")
        print("="*60)
        print(f"Duration: {report['duration']}")
        print(f"Test Suites: {report['summary']['total_suites']}")
        print(f"Passed: {report['summary']['passed_suites']}")
        print(f"Failed: {report['summary']['failed_suites']}")
        print()
        
        for suite_name, result in self.results.items():
            status = "✅ PASS" if result.get('success', False) else "❌ FAIL"
            print(f"{status} {suite_name}")
            
            if not result.get('success', False) and result.get('error'):
                print(f"     Error: {result['error']}")
        
        print(f"\nDetailed report saved to: {report_file}")
        
        return report['summary']['failed_suites'] == 0

    def run_all_tests(self, suites=None):
        """Run all test suites"""
        self.log("Starting comprehensive web app tests...")
        
        # Setup
        if not self.check_prerequisites():
            self.log("Prerequisites check failed", "ERROR")
            return False
            
        self.setup_test_environment()
        
        if not self.install_dependencies():
            self.log("Dependency installation failed", "ERROR")
            return False
        
        # Define test suites
        available_suites = {
            'frontend': self.run_frontend_unit_tests,
            'backend': self.run_backend_integration_tests,
            'e2e': self.run_e2e_tests
        }
        
        # Run specified suites or all
        suites_to_run = suites or available_suites.keys()
        
        for suite_name in suites_to_run:
            if suite_name not in available_suites:
                self.log(f"Unknown test suite: {suite_name}", "ERROR")
                continue
                
            self.log(f"Running {suite_name} test suite...")
            result = available_suites[suite_name]()
            self.results[suite_name] = result
            
            if result.get('success', False):
                self.log(f"{suite_name} tests completed successfully", "SUCCESS")
            else:
                self.log(f"{suite_name} tests failed", "ERROR")
        
        # Generate report
        return self.generate_report()

def main():
    parser = argparse.ArgumentParser(description='Run web app tests')
    parser.add_argument('--suites', nargs='+', 
                       choices=['frontend', 'backend', 'e2e'],
                       help='Test suites to run (default: all)')
    parser.add_argument('--skip-deps', action='store_true',
                       help='Skip dependency installation')
    
    args = parser.parse_args()
    
    runner = WebAppTestRunner()
    
    try:
        success = runner.run_all_tests(args.suites)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        runner.log("Tests interrupted by user", "ERROR")
        sys.exit(1)
    except Exception as e:
        runner.log(f"Unexpected error: {e}", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()
