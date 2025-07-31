import pytest
import httpx
import os

BASE_URL = "http://localhost:8000"

## Step 1: Test /api/translate
# Provide a valid path to a small subtitle file (SRT/VTT)
SUBTITLE_FILE_PATH = "../sample-data/MIB2-subtitles-pt-BR.vtt"

@pytest.mark.asyncio
async def test_end_to_end_translation_and_transcription():
    assert os.path.exists(SUBTITLE_FILE_PATH), "Subtitle file path does not exist."

    with open(SUBTITLE_FILE_PATH, "rb") as f:
        files = {
            "file": ("MIB2-subtitles-pt-BR.vtt", f, "text/vtt")
        }
        form_data = {
            "target_language": "en",
            "censor_profanity": "true"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{BASE_URL}/api/translate", data=form_data, files=files)

            assert response.status_code == 200, f"Translate API failed: {response.text}"
            result = response.json()

            assert "original_filename" in result
            assert "translated_filename" in result
            assert "source_language" in result
            assert "target_language" in result
            assert "original_file_path" in result
            assert "translated_file_path" in result
            assert "message" in result

            print("\nTranslation success:", result["message"])
            print("Translated File Path:", result["translated_file_path"])

## Step 2: Test /api/transcribe
# Provide a valid path to a small audio/video file (WAV/MP4/etc.)
FILE_PATH = "../sample-data/MIB2.mp4"

@pytest.mark.asyncio
async def test_transcription_endpoint():
    assert os.path.exists(FILE_PATH), "Audio/Video file path does not exist."

    with open(FILE_PATH, "rb") as file_path:
        files = {
            "file": ("MIB2.mp4", file_path, "video/mp4")
        }
        form_data = {
            "locale": "en-US",
            "max_speakers": "2",
            "censor_profanity": "false",
            "output_format": "srt"
        }

        timeout = httpx.Timeout(timeout=180.0)  # set to 3 minutes

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(f"{BASE_URL}/api/transcribe", data=form_data, files=files)

            assert response.status_code == 200, f"Transcribe API failed: {response.text}"
            result = response.json()

            assert "message" in result
            assert "transcribed_filename" in result
            assert "transcribed_file_path" in result

            print("\nTranscription success:", result["message"])
            print("Transcript File Path:", result["transcribed_file_path"])
