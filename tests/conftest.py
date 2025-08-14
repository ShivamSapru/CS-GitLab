"""
Test configuration and fixtures for web-app tests
"""
import pytest
import os
import sys
from pathlib import Path

# Add the project root to Python path so imports work correctly
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

@pytest.fixture(scope="session")
def test_base_url():
    """Base URL for API testing"""
    base_url = os.getenv("TEST_BASE_URL", "http://localhost:8000")
    print(f"Using test base URL: {base_url}")
    return base_url

@pytest.fixture(scope="session") 
def sample_data_dir():
    """Path to sample test data directory"""
    return Path(__file__).parent / "sample-data"

@pytest.fixture
def sample_vtt_file(sample_data_dir):
    """Path to sample VTT file for testing"""
    vtt_file = sample_data_dir / "MIB2-subtitles-pt-BR.vtt"
    if not vtt_file.exists():
        pytest.skip(f"Sample VTT file not found: {vtt_file}")
    return str(vtt_file)

@pytest.fixture
def sample_mp4_file(sample_data_dir):
    """Path to sample MP4 file for testing"""
    mp4_file = sample_data_dir / "MIB2.mp4"
    if not mp4_file.exists():
        pytest.skip(f"Sample MP4 file not found: {mp4_file}")
    return str(mp4_file)

# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as an end-to-end test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )

def pytest_collection_modifyitems(config, items):
    """Automatically mark tests based on their location"""
    for item in items:
        # Mark tests based on directory structure
        if "unit-tests" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration-tests" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
            
        # Mark async tests that might be slow
        if "transcription" in item.name or "end_to_end" in item.name:
            item.add_marker(pytest.mark.slow)
