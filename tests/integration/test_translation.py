import os
import pytest
from backend.api.translation import translate_srt_file

TEST_INPUT_PATH = r"C:\Users\Rishabh_2\Downloads\Low.Life.2025.S01E06.720p.HEVC.x265-MeGusta.srt"
EXPECTED_LANG = "hindi"  
OUTPUT_PATH = r"C:\Users\Rishabh_2\Downloads\Low.Life.2025.S01E06.720p.HEVC.x265-MeGusta (Translated to Hindi).hi.srt"

def test_translation_integration():
    if not os.path.exists(TEST_INPUT_PATH):
        pytest.skip("Test input file not found.")

    translated_path = translate_srt_file(TEST_INPUT_PATH, EXPECTED_LANG)

    assert os.path.exists(translated_path), "Translation output file not created."
    assert translated_path.endswith(".hi.srt"), "Incorrect output filename format."

    with open(translated_path, "r", encoding="utf-8") as f:
        content = f.read()
        assert len(content.strip()) > 0, "Translated file is empty."
        assert "Hello" not in content, "Text wasn't translated; original still present."  

    if os.path.exists(translated_path):
        os.remove(translated_path)

