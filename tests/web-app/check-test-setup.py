#!/usr/bin/env python3
"""
Test setup verification script
Checks if all test components are properly configured
"""

import subprocess
import sys
import os
from pathlib import Path

class TestSetupChecker:
    def __init__(self):
        self.test_dir = Path(__file__).parent
        self.project_root = self.test_dir.parent.parent
        self.issues = []
        self.successes = []

    def log_success(self, message):
        self.successes.append(f"✅ {message}")
        print(f"✅ {message}")

    def log_issue(self, message):
        self.issues.append(f"❌ {message}")
        print(f"❌ {message}")

    def check_directory_structure(self):
        """Check if all test directories are present"""
        print("\n🔍 Checking directory structure...")
        
        required_dirs = [
            self.test_dir / 'frontend-tests',
            self.test_dir / 'integration-tests', 
            self.test_dir / 'e2e-tests',
            self.test_dir / 'unit-tests'
        ]
        
        for dir_path in required_dirs:
            if dir_path.exists():
                self.log_success(f"Directory exists: {dir_path.name}")
            else:
                self.log_issue(f"Missing directory: {dir_path.name}")

    def check_test_files(self):
        """Check if test files are present"""
        print("\n📋 Checking test files...")
        
        test_files = {
            'Frontend Tests': [
                'frontend-tests/components/Dashboard.test.jsx',
                'frontend-tests/components/LoginModal.test.jsx',
                'frontend-tests/components/SignupModal.test.jsx',
                'frontend-tests/components/StaticSubtitleUpload.test.jsx',
                'frontend-tests/components/Profile.test.jsx',
                'frontend-tests/components/Library.test.jsx',
                'frontend-tests/package.json',
                'frontend-tests/setup.js'
            ],
            'Backend Tests': [
                'integration-tests/test_authentication_flow.py',
                'integration-tests/test_file_operations.py',
                'integration-tests/test_api_enhancement.py',
                'unit-tests/test_api_routes.py'
            ],
            'E2E Tests': [
                'e2e-tests/tests/dashboard.spec.js',
                'e2e-tests/tests/authentication.spec.js', 
                'e2e-tests/tests/file-upload.spec.js',
                'e2e-tests/tests/library.spec.js',
                'e2e-tests/playwright.config.js',
                'e2e-tests/package.json'
            ]
        }
        
        for category, files in test_files.items():
            print(f"\n  {category}:")
            for file_path in files:
                full_path = self.test_dir / file_path
                if full_path.exists():
                    self.log_success(f"  {file_path}")
                else:
                    self.log_issue(f"  Missing: {file_path}")

    def check_dependencies(self):
        """Check if dependencies are installed"""
        print("\n📦 Checking dependencies...")
        
        # Check Python dependencies
        try:
            import pytest
            import httpx
            self.log_success("Python test dependencies available")
        except ImportError as e:
            self.log_issue(f"Missing Python dependency: {e}")
        
        # Check Node.js/Yarn
        try:
            result = subprocess.run(['yarn', '--version'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.log_success(f"Yarn available: {result.stdout.strip()}")
            else:
                self.log_issue("Yarn not available")
        except FileNotFoundError:
            self.log_issue("Yarn not found")
        
        # Check frontend test dependencies
        frontend_node_modules = self.test_dir / 'frontend-tests' / 'node_modules'
        if frontend_node_modules.exists():
            self.log_success("Frontend test dependencies installed")
        else:
            self.log_issue("Frontend test dependencies not installed")
        
        # Check E2E test dependencies
        e2e_node_modules = self.test_dir / 'e2e-tests' / 'node_modules'
        if e2e_node_modules.exists():
            self.log_success("E2E test dependencies installed")
        else:
            self.log_issue("E2E test dependencies not installed")

    def check_github_actions(self):
        """Check GitHub Actions configuration"""
        print("\n🔄 Checking GitHub Actions...")
        
        workflows_dir = self.project_root / '.github' / 'workflows'
        if not workflows_dir.exists():
            self.log_issue("GitHub workflows directory not found")
            return
        
        workflow_files = [
            'web-app-tests-enhanced.yml',
            'web-app-tests.yml',
            'chrome-extension-tests.yml'
        ]
        
        for workflow in workflow_files:
            workflow_path = workflows_dir / workflow
            if workflow_path.exists():
                self.log_success(f"Workflow exists: {workflow}")
            else:
                self.log_issue(f"Missing workflow: {workflow}")

    def check_test_configuration(self):
        """Check test configuration files"""
        print("\n⚙️  Checking configuration files...")
        
        config_files = [
            ('frontend-tests/package.json', 'Frontend test config'),
            ('frontend-tests/babel.config.js', 'Babel config'),
            ('e2e-tests/playwright.config.js', 'Playwright config'),
            ('run-all-tests.py', 'Test runner script'),
            ('README.md', 'Test documentation')
        ]
        
        for file_path, description in config_files:
            full_path = self.test_dir / file_path
            if full_path.exists():
                self.log_success(f"{description}")
            else:
                self.log_issue(f"Missing {description}: {file_path}")

    def check_server_availability(self):
        """Check if servers are running"""
        print("\n🌐 Checking server availability...")
        
        servers = [
            ('http://localhost:8000/api/health', 'Backend API'),
            ('http://localhost:3000', 'Frontend')
        ]
        
        for url, name in servers:
            try:
                result = subprocess.run(['curl', '-s', url], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    self.log_success(f"{name} server running")
                else:
                    self.log_issue(f"{name} server not accessible")
            except (subprocess.TimeoutExpired, FileNotFoundError):
                self.log_issue(f"Cannot check {name} server")

    def generate_summary(self):
        """Generate final summary"""
        print("\n" + "="*60)
        print("TEST SETUP SUMMARY")
        print("="*60)
        
        total_checks = len(self.successes) + len(self.issues)
        success_rate = len(self.successes) / total_checks * 100 if total_checks > 0 else 0
        
        print(f"Total Checks: {total_checks}")
        print(f"Successful: {len(self.successes)}")
        print(f"Issues: {len(self.issues)}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.issues:
            print(f"\n❌ Issues Found:")
            for issue in self.issues:
                print(f"  {issue}")
            
            print(f"\n💡 Recommendations:")
            if any("dependencies" in issue for issue in self.issues):
                print("  • Run: cd frontend-tests && yarn install")
                print("  • Run: cd e2e-tests && yarn install")
                print("  • Run: pip install -r backend/requirements.txt")
            
            if any("server" in issue for issue in self.issues):
                print("  • Start backend: python -m uvicorn backend.main:app --reload")
                print("  • Start frontend: cd frontend && yarn dev")
            
            if any("Missing" in issue for issue in self.issues):
                print("  • Some test files may need to be created")
        else:
            print("\n🎉 All checks passed! Test setup is complete.")
            print("\nYou can now run tests:")
            print("  • All tests: python run-all-tests.py")
            print("  • Frontend only: cd frontend-tests && yarn test")
            print("  • Backend only: python -m pytest integration-tests/")
            print("  • E2E only: cd e2e-tests && npx playwright test")
        
        return len(self.issues) == 0

    def run_all_checks(self):
        """Run all setup checks"""
        print("🧪 SubLingo Web App Test Setup Checker")
        print("="*60)
        
        self.check_directory_structure()
        self.check_test_files()
        self.check_dependencies()
        self.check_github_actions()
        self.check_test_configuration()
        self.check_server_availability()
        
        return self.generate_summary()

def main():
    checker = TestSetupChecker()
    success = checker.run_all_checks()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
