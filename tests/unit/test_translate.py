from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_translate_text():
    payload = {"texts": ["Hello, world!"], "to_lang": "es"}
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 200
    assert "Hola" in response.json()[0]

def test_get_supported_languages():
    response = client.get("/api/languages")
    assert response.status_code == 200
    assert "en" in response.json()
