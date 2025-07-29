from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_transcription_endpoint_invalid_format():
    response = client.post("/api/transcribe", json={
        "audio_url": "https://example.com/audio.mp3",
        "output_format": "invalid"
    })
    assert response.status_code == 400
