import pytest
import httpx
import time
import os
import shutil
import subprocess

BASE_URL = "http://localhost:8000"
INPUT_DIR = "../../sample-data/input/"
OUTPUT_DIR = "../../sample-data/output/"

SUBTITLE_PATH = os.path.join(INPUT_DIR + "MIB2-subtitles-pt-BR.vtt")
MEDIA_PATH = os.path.join(INPUT_DIR + "MIB2.mp4")

# ---------- helpers ----------
def get_file_size_bytes(path: str) -> int:
    try:
        return os.path.getsize(path)
    except Exception:
        return 0

def get_char_count_from_file(path: str) -> int:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return len(f.read())
    except Exception:
        return 0

def get_media_duration_seconds(path: str):
    """
    Uses ffprobe if available. Returns float seconds or None.
    """
    try:
        # Check ffprobe presence
        subprocess.run(["ffprobe", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        return None

    try:
        cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", path
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().strip()
        dur = float(out)
        return dur if dur > 0 else None
    except Exception:
        return None

def fmt_secs(s):
    return f"{s:.3f}s"

# Clear output folder at the start
@pytest.fixture(scope="session", autouse=True)
def clean_output_folder():
    """Delete all files in the output folder before tests run."""
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n🧹 Cleaned output folder: {os.path.abspath(OUTPUT_DIR)}")

## Step 1: Test /api/translate
@pytest.mark.asyncio
async def test_end_to_end_translation():
    """Test the translation endpoint with a sample VTT subtitle file"""

    print(f"\n🔍 Debug Info:")
    print(f"Current working directory: {os.getcwd()}")
    print(f"SUBTITLE_PATH: {SUBTITLE_PATH}")
    print(f"Absolute path would be: {os.path.abspath(SUBTITLE_PATH)}")

    sample_data_dir = os.path.dirname(os.path.abspath(SUBTITLE_PATH))
    print(f"Sample data directory: {sample_data_dir}")
    print(f"Sample data directory exists: {os.path.exists(sample_data_dir)}")

    if os.path.exists(sample_data_dir):
        print("Contents of sample-data/input directory:")
        for item in os.listdir(sample_data_dir):
            item_path = os.path.join(sample_data_dir, item)
            size = os.path.getsize(item_path) if os.path.isfile(item_path) else "DIR"
            print(f"  - {item} ({size} bytes)")

    # Fallback file if missing
    if not os.path.exists(SUBTITLE_PATH):
        print(f"⚠️  VTT file missing, creating fallback test file...")
        os.makedirs(os.path.dirname(os.path.abspath(SUBTITLE_PATH)), exist_ok=True)
        fallback_content = """WEBVTT

1
00:00:01.000 --> 00:00:04.000
Olá, bem-vindos ao nosso teste de tradução.

2
00:00:05.000 --> 00:00:09.000
Este é um arquivo de legendas em português brasileiro.

3
00:00:10.000 --> 00:00:14.000
Vamos testar se a tradução funciona corretamente.

4
00:00:15.000 --> 00:00:19.000
O sistema deve traduzir estas legendas para o inglês."""
        with open(SUBTITLE_PATH, 'w', encoding='utf-8') as f:
            f.write(fallback_content)
        print(f"✅ Created fallback VTT file: {os.path.abspath(SUBTITLE_PATH)}")

    assert os.path.exists(SUBTITLE_PATH), f"Subtitle file path does not exist: {os.path.abspath(SUBTITLE_PATH)}"

    in_bytes = get_file_size_bytes(SUBTITLE_PATH)
    in_kb = max(in_bytes / 1024.0, 1e-9)
    in_chars = get_char_count_from_file(SUBTITLE_PATH)
    in_kchars = max(in_chars / 1000.0, 1e-9)

    with open(SUBTITLE_PATH, "rb") as f:
        files = {
            "file": ("MIB2-subtitles-pt-BR.vtt", f, "text/vtt")
        }
        form_data = {
            "target_language": "en",
            "censor_profanity": "true"
        }

        timeout = httpx.Timeout(timeout=180.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            t0 = time.perf_counter()
            response = await client.post(f"{BASE_URL}/api/translate", data=form_data, files=files)
            t1 = time.perf_counter()

            wall = t1 - t0
            assert response.status_code == 200, f"Translate API failed: {response.text}"
            result = response.json()

            for key in ["original_filename","translated_filename","source_language","target_language","original_file_path","translated_file_path","message"]:
                assert key in result

            print("\nTranslation message:", result["message"])
            print("Translated File Path:", result["translated_file_path"])
            shutil.copy2(result["translated_file_path"], OUTPUT_DIR)

            # --------- latency metrics (translation) ----------
            print("\n⏱️ Translation Latency Metrics")
            print(f"Input size: {in_bytes} bytes ({in_kb:.2f} KB), chars: {in_chars}")
            print(f"Wall time: {fmt_secs(wall)}")
            print(f"Latency per KB: {(wall*1000)/in_kb:.2f} ms/KB")
            print(f"Latency per 1k chars: {(wall*1000)/in_kchars:.2f} ms/1k chars")
            print(f"Throughput: {in_kb/wall:.2f} KB/s, {in_chars/wall:.2f} chars/s")

            # Clean up local files
            try:
                os.remove(result["translated_file_path"])
                print("✅ Local files cleaned up")
            except Exception as cleanup_error:
                print(f"⚠️ Cleanup warning: {cleanup_error}")

## Step 2: Test /api/transcribe and /api/transcription-status-check/{project_id}
@pytest.mark.asyncio
async def test_transcription_and_status_check():
    """Test the transcription endpoint with a sample MP4 video file"""

    print(f"\n🔍 Debug Info:")
    print(f"Current working directory: {os.getcwd()}")
    print(f"MEDIA_PATH: {MEDIA_PATH}")
    print(f"Absolute path would be: {os.path.abspath(MEDIA_PATH)}")

    sample_data_dir = os.path.dirname(os.path.abspath(MEDIA_PATH))
    print(f"Sample data directory: {sample_data_dir}")
    print(f"Sample data directory exists: {os.path.exists(sample_data_dir)}")

    if os.path.exists(sample_data_dir):
        print("Contents of sample-data/input directory:")
        for item in os.listdir(sample_data_dir):
            item_path = os.path.join(sample_data_dir, item)
            size = os.path.getsize(item_path) if os.path.isfile(item_path) else "DIR"
            print(f"  - {item} ({size} bytes)")

    assert os.path.exists(MEDIA_PATH), f"Audio/Video file path does not exist: {os.path.abspath(MEDIA_PATH)}"

    media_bytes = get_file_size_bytes(MEDIA_PATH)
    media_kb = max(media_bytes / 1024.0, 1e-9)
    duration_sec = get_media_duration_seconds(MEDIA_PATH)  # may be None

    with open(MEDIA_PATH, "rb") as file_path:
        files = { "file": ("MIB2.mp4", file_path, "video/mp4") }
        form_data = { "locale": "en-US", "max_speakers": "2", "censor_profanity": "false", "output_format": "srt" }

        # Start Transcription Job
        timeout = httpx.Timeout(timeout=180.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            t0 = time.perf_counter()
            response = await client.post(f"{BASE_URL}/api/transcribe", data=form_data, files=files)
            assert response.status_code == 200, f"Transcribe API failed: {response.text}"
            result = response.json()
            assert "message" in result and "project_id" in result
            project_id = result["project_id"]
            print("\nTranscription message:", result["message"])
            print("Project ID:", project_id)

        # Poll until completion
        timeout = httpx.Timeout(timeout=300.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            timeout_sec = 300
            status_url = f"{BASE_URL}/api/transcription-status-check/{project_id}"
            for _ in range(timeout_sec // 10):
                status_response = await client.get(status_url)
                assert status_response.status_code == 200, f"Status Check API failed: {status_response.text}"
                status_result = status_response.json()

                if status_result["status"] == "Completed":
                    t1 = time.perf_counter()
                    wall = t1 - t0  # end-to-end job latency
                    print("Transcription Status:", status_result["status"])

                    # --------- latency metrics (transcription) ----------
                    print("\n⏱️ Transcription Latency Metrics")
                    print(f"Input size: {media_bytes} bytes ({media_kb:.2f} KB)")
                    if duration_sec:
                        rtf = wall / duration_sec  # Real-Time Factor
                        spm = wall / (duration_sec / 60.0)  # seconds per minute of audio
                        print(f"Media duration: {fmt_secs(duration_sec)}")
                        print(f"Wall time (end-to-end): {fmt_secs(wall)}")
                        print(f"Real-Time Factor (wall/duration): {rtf:.3f}")
                        print(f"Seconds per minute of audio: {spm:.2f} s/min")
                    else:
                        print("Media duration: N/A (ffprobe not found)")
                        print(f"Wall time (end-to-end): {fmt_secs(wall)}")
                    print(f"Throughput: {media_kb/wall:.2f} KB/s")

                    if "subtitle_file_url" in status_result:
                        subtitle_url = status_result["subtitle_file_url"]
                        print("Subtitle File URL:", subtitle_url)

                        os.makedirs(OUTPUT_DIR, exist_ok=True)
                        async with httpx.AsyncClient() as client2:
                            resp = await client2.get(subtitle_url)
                            resp.raise_for_status()
                            filename = subtitle_url.split("?")[0].split("/")[-1]
                            output_path = os.path.join(OUTPUT_DIR, filename)
                            with open(output_path, "wb") as f:
                                f.write(resp.content)
                        print(f"✅ Downloaded subtitle file to {output_path}")
                    else:
                        print("No subtitle_file_url available yet.")
                    break

                elif status_result["status"] == "Failed":
                    raise Exception("Transcription failed.")
                else:
                    print("Transcription Status:", status_result["status"])
                time.sleep(10)
