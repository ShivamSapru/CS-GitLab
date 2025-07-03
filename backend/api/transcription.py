import os
import re
import time
import json
import uuid
import httpx
import tempfile
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict

import ffmpeg
from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, JSONResponse

from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
temp_dir = tempfile.mkdtemp()

# Environment variables
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_BLOB_CONTAINER = os.getenv("AZURE_BLOB_CONTAINER")
BATCH_ENDPOINT = os.getenv("BATCH_ENDPOINT").replace("AZURE_SPEECH_REGION", AZURE_SPEECH_REGION)
GET_ENDPOINT_TEMPLATE = os.getenv("GET_ENDPOINT_TEMPLATE").replace("AZURE_SPEECH_REGION", AZURE_SPEECH_REGION)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Locale mappings
df = pd.read_csv(DATA_DIR / "locale_language_table.csv")
LOCALE_LANGUAGES = dict(zip(df['Locale (BCP-47)'], df['Language']))

with open(DATA_DIR / "candidate_locales.json", "r", encoding="utf-8") as f:
    candidate_locales = json.load(f)

CANDIDATE_LOCALES = list(candidate_locales.keys())

# Endpoint to get the supported locales
@router.get("/locales")
def get_locales() -> Dict[str, str]:
    return LOCALE_LANGUAGES

# Convert mono audio, 16kHz WAV
def convert_to_wav(input_path, output_path):
    ffmpeg.input(input_path).output(
        output_path, format='wav', acodec='pcm_s16le', ac=1, ar='16000'
    ).overwrite_output().run(quiet=True)
    return output_path

# Format output to SRT/VTT
def convert_to_srt(segments, output_format):
    srt_output = "WEBVTT\n\n" if output_format == "vtt" else ""

    for i, seg in enumerate(segments, 1):
        start_sec = seg.get('offsetInTicks', 0) / 1e7
        end_sec = (seg.get('offsetInTicks', 0) + seg.get('durationInTicks', 0)) / 1e7

        start = str(timedelta(seconds=start_sec))[:11]
        end = str(timedelta(seconds=end_sec))[:11]

        if output_format == "srt":
            start = start.replace('.', ',')
            end = end.replace('.', ',')

        text = seg.get("nBest", [{}])[0].get("display", "")
        srt_output += f"{i}\n{start} --> {end}\n{text}\n\n"

    return srt_output

# Create transcription job
def create_transcription_job(audio_url: str, censor_profanity="False", max_speakers=2, locale="en-US"):
    payload = {
        "displayName": f"Transcription_{uuid.uuid4()}",
        "locale": locale,
        "contentUrls": [audio_url],
        "properties": {
            "wordLevelTimestampsEnabled": True,
            "punctuationMode": "DictatedAndAutomatic",
            "timeToLiveHours": 6,
            "languageIdentification": {
                "candidateLocales": CANDIDATE_LOCALES,
                "mode": "Continuous"
            },
            "diarization": {
                "enabled": True,
                "maxSpeakers": max_speakers
            }
        }
    }
    if censor_profanity:
        payload["properties"]["profanityFilterMode"] = "Masked"

    headers = {"Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY}
    response = httpx.post(BATCH_ENDPOINT, headers=headers, json=payload)
    response.raise_for_status()
    job_url = response.json()["self"]
    return job_url.split("/")[-1].split("?")[0]

# Poll for status
def poll_transcription_result(job_id: str, timeout_sec=300):
    headers = {"Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY}
    for _ in range(timeout_sec // 10):
        response = httpx.get(GET_ENDPOINT_TEMPLATE + job_id, headers=headers)
        data = response.json()
        print("Transcription Status:", data["status"])
        if data["status"] == "Succeeded":
            return data["links"]["files"]
        elif data["status"] == "Failed":
            raise Exception("Transcription failed.")
        time.sleep(10)
    raise TimeoutError("Polling timed out.")

# Fetch transcription JSON
def get_transcription_file(files_url: str):
    headers = {"Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY}
    response = httpx.get(files_url, headers=headers)
    data = response.json()
    transcript_url = next((f["links"]["contentUrl"] for f in data["values"] if f["kind"] == "Transcription"), None)
    if not transcript_url:
        raise Exception("No transcript found.")
    transcript_json = httpx.get(transcript_url).json()
    return transcript_json.get("recognizedPhrases", [])

# Endpoint to transcribe audio/video
@router.post("/transcribe")
async def transcribe_audio_video(
    file: UploadFile = File(...),
    locale: str = Form(...),
    max_speakers: int = Form(...),
    censor_profanity: bool = Form(...),
    output_format: str = Form("srt"),
):
    try:
        base_name, _ = os.path.splitext(file.filename)
        safe_name = re.sub(r'[^\w\-_.]', '_', base_name)
        input_path = os.path.join(temp_dir, f"{safe_name}_input.{file.filename.split('.')[-1]}")
        with open(input_path, "wb") as f:
            f.write(await file.read())

        wav_path = os.path.join(temp_dir, f"{safe_name}_converted.wav")
        convert_to_wav(input_path, wav_path)

        blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        blob_name = os.path.basename(wav_path)
        blob_client = blob_service.get_blob_client(container=AZURE_BLOB_CONTAINER, blob=blob_name)
        with open(wav_path, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)

        sas_token = generate_blob_sas(
            account_name=blob_service.account_name,
            container_name=AZURE_BLOB_CONTAINER,
            blob_name=blob_name,
            account_key=blob_service.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1)
        )
        audio_url = f"https://{blob_service.account_name}.blob.core.windows.net/{AZURE_BLOB_CONTAINER}/{blob_name}?{sas_token}"

        job_id = create_transcription_job(audio_url, censor_profanity, max_speakers, locale)
        files_url = poll_transcription_result(job_id)
        phrases = get_transcription_file(files_url)

        tag = " and Censored" if censor_profanity else ""
        out_name = f"{base_name} (Transcribed{tag}).{locale}.{output_format}"
        out_path = os.path.join(temp_dir, out_name)
        with open(out_path, "w", encoding="utf-8") as f:
            if output_format in ["srt", "vtt"]:
                f.write(convert_to_srt(phrases, output_format))
            else:
                return JSONResponse(status_code=400, content={"error": "Invalid output format."})

        return {"message": "Transcription completed.", "transcribed_filename": out_name}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Transcription failed: {str(e)}"})

# Endpoint to download transcribed subtitle file
@router.get("/download-transcription")
def download_transcribed_file(
    filename: str = Query(..., description="Name of the transcribed subtitle file to download")
):
    try:
        file_path = os.path.join(temp_dir, filename)

        if not os.path.exists(file_path):
            return JSONResponse(
                status_code=404,
                content={"error": "Requested file not found."}
            )

        return FileResponse(
            path=file_path,
            media_type="application/octet-stream",
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Download failed: {str(e)}"}
        )
