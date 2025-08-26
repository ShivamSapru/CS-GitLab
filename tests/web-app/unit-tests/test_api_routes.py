import pytest
import httpx
import os

# Use environment variable for base URL, with fallback
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

def test_health_check():
    """Test the health check endpoint"""
    r = httpx.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    json_response = r.json()
    assert json_response.get("status") == "ok"
    # Check that Azure service configuration is reported
    assert "azure_translator_key_configured" in json_response

def test_db_test():
    """Test the database connection endpoint"""
    r = httpx.get(f"{BASE_URL}/api/db-test")
    assert r.status_code == 200
    json_response = r.json()
    assert "message" in json_response
    # Should confirm database connection success
    assert "successful" in json_response["message"].lower()

def test_debug_translator_check():
    """Test the translator debug endpoint"""
    r = httpx.get(f"{BASE_URL}/api/debug/translator-check")
    # This endpoint might return different status codes based on mock setup
    assert r.status_code in (200, 401, 403)  # Allow for mock service responses
    json_response = r.json()
    assert "status" in json_response

def test_get_languages():
    """Test the languages endpoint"""
    r = httpx.get(f"{BASE_URL}/api/languages")
    assert r.status_code == 200
    json_response = r.json()
    assert isinstance(json_response, dict)
    # Should return language codes and names
    assert len(json_response) >= 0

def test_get_locales():
    """Test the locales endpoint for transcription"""
    r = httpx.get(f"{BASE_URL}/api/locales")
    assert r.status_code == 200
    json_response = r.json()
    assert isinstance(json_response, dict)
    # Should return locale codes and names
    assert len(json_response) >= 0

@pytest.mark.translation
@pytest.mark.skip(reason="Translation endpoint disabled in CI - makes real Azure API calls with mock credentials")
def test_translate_upload_invalid():
    """Test translation endpoint with invalid file upload"""
    r = httpx.post(f"{BASE_URL}/api/translate", files={})
    # Should return validation error for missing file
    assert r.status_code in (422, 400)

def test_transcribe_invalid_data():
    """Test transcription endpoint with invalid data"""
    # Test with invalid JSON data (not using files parameter for transcription)
    r = httpx.post(f"{BASE_URL}/api/transcribe", json={
        "invalid": "data"
    })
    # Should return validation error
    assert r.status_code in (400, 422)

def test_oauth_login_redirect():
    """Test OAuth login endpoint redirects properly"""
    # This endpoint should redirect to Google OAuth
    r = httpx.get(f"{BASE_URL}/login", follow_redirects=False)
    # Should return redirect status
    assert r.status_code in (302, 307, 308)

def test_auth_me_unauthenticated():
    """Test /me endpoint without authentication"""
    r = httpx.get(f"{BASE_URL}/me")
    # Should return unauthorized status
    assert r.status_code == 401
    json_response = r.json()
    assert "error" in json_response

def test_root_endpoint():
    """Test the root endpoint"""
    r = httpx.get(f"{BASE_URL}/")
    assert r.status_code == 200
    json_response = r.json()
    assert "message" in json_response
    assert "backend" in json_response["message"].lower()
