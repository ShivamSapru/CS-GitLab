import pytest
import httpx
import time
import os

BASE_URL = "http://localhost:8000"

## Step 1: Test /api/translate
# Provide a valid path to a small subtitle file (SRT/VTT)
SUBTITLE_FILE_PATH = "../../sample-data/MIB2-subtitles-pt-BR.vtt"

@pytest.mark.asyncio
async def test_end_to_end_translation():
    assert os.path.exists(SUBTITLE_FILE_PATH), "Subtitle file path does not exist."

    with open(SUBTITLE_FILE_PATH, "rb") as f:
        files = {
            "file": ("MIB2-subtitles-pt-BR.vtt", f, "text/vtt")
        }
        form_data = {
            "target_language": "en",
            "censor_profanity": "true"
        }

        timeout = httpx.Timeout(timeout=180.0)  # set to 3 minutes

        async with httpx.AsyncClient(timeout=timeout) as client:
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

            print("\nTranslation message:", result["message"])
            print("Translated File Path:", result["translated_file_path"])


## Step 2: Test /api/transcribe and /api/transcription-status-check/{project_id}
# Provide a valid path to a small audio/video file
FILE_PATH = "../../sample-data/MIB2.mp4"

@pytest.mark.asyncio
async def test_transcription_and_status_check():
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

        # Start Transcription Job
        timeout = httpx.Timeout(timeout=180.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(f"{BASE_URL}/api/transcribe", data=form_data, files=files)
            assert response.status_code == 200, f"Transcribe API failed: {response.text}"
            result = response.json()

            assert "message" in result
            assert "project_id" in result
            project_id = result["project_id"]

            print("\nTranscription message:", result["message"])
            print("Project ID:", project_id)

        ## Check Transcription Status
        timeout = httpx.Timeout(timeout=300.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            timeout_sec=300
            status_url = f"{BASE_URL}/api/transcription-status-check/{project_id}"
            for _ in range(timeout_sec // 10):
                status_response = await client.get(status_url)
                assert status_response.status_code == 200, f"Status Check API failed: {status_response.text}"
                status_result = status_response.json()

                if status_result["status"] == "Completed":
                    print("\nTranscription Status:", status_result["status"])
                    if "subtitle_file_url" in status_result:
                        print("Subtitle File URL:", status_result["subtitle_file_url"])
                    else:
                        print("No subtitle_file_url available yet.")
                    break
                elif status_result["status"] == "Failed":
                    raise Exception("Transcription failed.")
                else:
                    print("Transcription Status:", status_result["status"])
                
                time.sleep(10)
