import os
import pytest
from fastapi.testclient import TestClient
from backend.main import app  # Make sure this points to your FastAPI app

client = TestClient(app)

@pytest.mark.integration
def test_get_locales():
    response = client.get("/locales")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
    assert "en-US" in response.json()

@pytest.mark.integration
def test_get_languages():
    response = client.get("/languages")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
    assert "hi" in response.json() or "fr" in response.json()
