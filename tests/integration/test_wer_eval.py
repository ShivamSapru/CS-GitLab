import os
import pytest
from jiwer import wer  # type: ignore

REFERENCE_FILE = r"C:\Users\Rishabh_2\Downloads\Low.Life.2025.S01E06.720p.HEVC.x265-MeGusta.srt"
TRANSLATED_FILE = r"C:\Users\Rishabh_2\Downloads\Low.Life.2025.S01E06.720p.HEVC.x265-MeGusta (Translated to Hindi).hi.srt"

def extract_text_from_srt(path):
    lines = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if "-->" not in line and line.strip().isdigit() is False:
                lines.append(line.strip())
    return lines


def test_wer_evaluation_only():
    if not (os.path.exists(REFERENCE_FILE) and os.path.exists(TRANSLATED_FILE)):
        pytest.skip("Missing test files for WER evaluation")

    ref_lines = extract_text_from_srt(REFERENCE_FILE)
    hyp_lines = extract_text_from_srt(TRANSLATED_FILE)

    assert len(ref_lines) > 0 and len(hyp_lines) > 0, "Empty reference or hypothesis file"

    ref_text = " ".join(ref_lines)
    hyp_text = " ".join(hyp_lines)

    word_error_rate = wer(ref_text, hyp_text)
    print(f"\nWER: {word_error_rate:.2f}")

    assert word_error_rate < 2.0, f"WER too high: {word_error_rate:.2f}"
