import pytest
import httpx

BASE_URL = "http://localhost:8000"

def test_health_check():
    r = httpx.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"

def test_db_test():
    r = httpx.get(f"{BASE_URL}/api/db-test")
    assert r.status_code == 200
    assert "message" in r.json()

def test_debug_translator_check():
    r = httpx.get(f"{BASE_URL}/api/debug/translator-check")
    assert r.status_code == 200
    assert "status" in r.json()

def test_get_languages():
    r = httpx.get(f"{BASE_URL}/api/languages")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)

def test_get_locales():
    r = httpx.get(f"{BASE_URL}/api/locales")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)

def test_translate_upload_invalid():
    r = httpx.post(f"{BASE_URL}/api/translate", files={})
    assert r.status_code == 422 or r.status_code == 400

def test_transcribe_invalid_url():
    r = httpx.post(f"{BASE_URL}/api/transcribe", json={
        "audio_url": "https://invalid-url.wav",
        "output_format": "srt"
    })
    assert r.status_code in (400, 422)

def test_register_invalid():
    r = httpx.post(f"{BASE_URL}/register", json={})
    assert r.status_code == 422

def test_login_post_invalid():
    r = httpx.post(f"{BASE_URL}/login", json={})
    assert r.status_code == 422
