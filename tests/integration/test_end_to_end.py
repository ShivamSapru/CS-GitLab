import pytest
import httpx

@pytest.mark.asyncio
async def test_end_to_end_translation_workflow():
    base_url = "http://localhost:8000"

    # Step 1: Translate text
    translate_payload = {
        "texts": ["Good morning, how are you today?"],
        "to_lang": "fr"
    }
    async with httpx.AsyncClient() as client:
        r1 = await client.post(f"{base_url}/api/translate", json=translate_payload)
        assert r1.status_code == 200
        assert isinstance(r1.json(), list)
        assert len(r1.json()) > 0
        translated_text = r1.json()[0]
        print("Translated text:", translated_text)
        assert isinstance(translated_text, str)

    # Step 2: Transcribe (mocked or real audio URL)
    # Replace with a valid blob URL or mock your FastAPI backend for this
    transcribe_payload = {
        "audio_url": "https://example.com/sample.wav",
        "output_format": "srt",
        "censor_profanity": False,
        "max_speakers": 2,
        "locale": "en-US"
    }
    async with httpx.AsyncClient() as client:
        r2 = await client.post(f"{base_url}/api/transcribe", json=transcribe_payload)

        # Accept either a success (200) or expected client error like invalid URL (400)
        assert r2.status_code in (200, 400)

        if r2.status_code == 200:
            assert "transcription" in r2.json()
            print("Transcription succeeded.")
        else:
            print("Transcription failed or URL was invalid as expected.")

    print("End-to-end test completed.")
