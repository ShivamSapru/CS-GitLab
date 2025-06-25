import os
import httpx
import tempfile
import time

import srt
import webvtt
import zipfile
import io

import ffmpeg
import re
import uuid

from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from typing import Dict, List
from dotenv import load_dotenv
from pydantic import BaseModel

# import azure.cognitiveservices.speech as speechsdk
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta


class ZipRequest(BaseModel):
    filenames: List[str]

load_dotenv()

router = APIRouter()

# temp_dir = "./temp"
# os.makedirs(temp_dir, exist_ok=True)
temp_dir = tempfile.mkdtemp()


# ENV variables
AZURE_TRANSLATOR_LANGUAGES = os.getenv("AZURE_TRANSLATOR_LANGUAGES")
AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_TRANSLATOR_KEY = os.getenv("AZURE_TRANSLATOR_KEY")
AZURE_TRANSLATOR_REGION = os.getenv("AZURE_TRANSLATOR_REGION")

# AZURE_SPEECH_ENDPOINT = os.getenv("AZURE_SPEECH_ENDPOINT")
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_BLOB_CONTAINER = os.getenv("AZURE_BLOB_CONTAINER")
AZURE_BLOB_BASE_URL = os.getenv("AZURE_BLOB_BASE_URL")

BATCH_ENDPOINT = f"https://{AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:submit?api-version=2024-11-15"

if not AZURE_TRANSLATOR_KEY or not AZURE_TRANSLATOR_REGION or not AZURE_SPEECH_KEY or not AZURE_SPEECH_REGION:
    raise EnvironmentError("Missing Azure Credentials in environment.")


## TRANSLATOR SECTION ##

MAX_CHAR_LIMIT = 20000  # Azure Translator limit is 50000 characters per request


def fetch_language_codes() -> Dict[str, str]:
    try:
        if not AZURE_TRANSLATOR_LANGUAGES:
            raise EnvironmentError("AZURE_TRANSLATOR_LANGUAGES is not set in environment variables.")

        response = httpx.get(AZURE_TRANSLATOR_LANGUAGES)
        response.raise_for_status()
        data = response.json()

        translation_langs = data.get("translation", {})
        formatted_languages = {
            code: lang_data["name"]
            for code, lang_data in translation_langs.items()
        }

        return formatted_languages

    except Exception as e:
        print(f"Failed to fetch Azure language codes: {e}")
        return {}


def post_with_retries(url, headers, json_body, retries=14):
    for i in range(retries):
        response = httpx.post(url, headers=headers, json=json_body)
        if response.status_code == 429:
            wait = 5
            print(f"Rate limited. Retrying in {wait} seconds...")
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response
    raise Exception("Exceeded retry limit for translation request.")


def chunk_texts(texts, max_chars):
    chunks = []
    current_chunk = []
    current_length = 0

    for text in texts:
        length = len(text)
        if current_length + length > max_chars:
            chunks.append(current_chunk)
            current_chunk = [text]
            current_length = length
        else:
            current_chunk.append(text)
            current_length += length

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def detect_and_translate(texts, to_lang, no_prof=False):
    path = "/translate?api-version=3.0"
    params = f"&to={to_lang}"
    if no_prof:
        params += "&profanityAction=Marked"
    url = AZURE_TRANSLATOR_ENDPOINT.rstrip('/') + path + params
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
        "Content-Type": "application/json; charset=UTF-8",
    }

    translated = []
    count = 1
    total_chunks = chunk_texts(texts, MAX_CHAR_LIMIT)
    for chunk in total_chunks:
        body = [{"Text": t} for t in chunk]
        try:
            # print("\nSource Chunk", count, ":", body)
            print("Translating Chunk", count, "of", len(total_chunks))
            response = post_with_retries(url, headers, body)
            data = response.json()
            translated.extend([item["translations"][0]["text"] for item in data])
            count += 1
        except httpx.HTTPStatusError as e:
            print("Status Code:", e.response.status_code)
            print("Response Text:", e.response.text)
            raise e
        except Exception as ex:
            print("Translation Error:", ex)
            raise ex

    # print("\nTranslated Output:", translated)
    return translated


# List of Languages present for translation
LANGUAGE_CODES = fetch_language_codes()

# Endpoint to get the supported languages
@router.get("/languages")
def get_languages() -> Dict[str, str]:
    return LANGUAGE_CODES

# Check internal environment setup, not make external calls
@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is up. Azure Translator assumed reachable.",
        "azure_translator_key_configured": bool(AZURE_TRANSLATOR_KEY),
        "azure_translator_endpoint_configured": bool(AZURE_TRANSLATOR_ENDPOINT),
        "azure_translator_region_configured": bool(AZURE_TRANSLATOR_REGION),
    }

# Only invoke manually for debugging
@router.get("/debug/translator-check")
def debug_translator():
    url = f"{os.getenv('AZURE_TRANSLATOR_ENDPOINT').rstrip('/')}/translate?api-version=3.0&to=fr"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
        "Content-Type": "application/json; charset=UTF-8",
    }
    json_body = [{"Text": "Hello, world!!"}]
    # print(url, headers, json_body)

    try:
        resp = httpx.post(url, headers=headers, json=json_body)
        # print(resp.status_code, resp.json())

        if resp.status_code == 200:
            return {
                "status": f"{resp.status_code} healthy",
                "message": "Backend server is running and Azure Translator is reachable."
            }

        elif resp.status_code == 401:
            return JSONResponse(
                content={
                    "status": f"{resp.status_code} unauthorized",
                    "message": "Invalid or missing Azure credentials. Check API key and region."
                }
            )

        elif resp.status_code == 403:
            return JSONResponse(
                content={
                    "status": f"{resp.status_code} forbidden",
                    "message": "Access to Azure Translator is forbidden. Verify subscription and permissions."
                }
            )

        elif resp.status_code == 429:
            return JSONResponse(
                content={
                    "status": f"{resp.status_code} rate_limited",
                    "message": "Azure Translator rate limit exceeded. Try again later or optimize request volume."
                }
            )

        elif resp.status_code == 503:
            return JSONResponse(
                content={
                    "status": f"{resp.status_code} service_unavailable",
                    "message": "Azure Translator service temporarily unavailable."
                }
            )

        else:
            return JSONResponse(
                status_code=resp.status_code,
                content={
                    "status": "error",
                    "message": f"Unexpected error occurred. Azure response code: {resp.status_code}"
                }
            )

    except Exception as e:
        return JSONResponse(
            content={
                "status": "internal_error",
                "message": f"Health check failed due to: {str(e)}"
            }
        )


# Uploading the .srt or .vtt file and selecting target language(s)
@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    target_language: str = Form(...),
    censor_profanity: bool = Form(...)
):
    try:
        input_path = os.path.join(temp_dir, file.filename)
        base_name, file_ext = os.path.splitext(file.filename)
        tag = " and Censored" if censor_profanity else ""
        output_filename = f"{base_name} (Translated to {target_language.upper()}{tag}){file_ext}"
        output_path = os.path.join(temp_dir, output_filename)

        with open(input_path, "wb") as f:
            f.write(await file.read())

        if file_ext.lower() == ".srt":
            with open(input_path, "r", encoding="utf-8") as f:
                subtitles = list(srt.parse(f.read()))
            texts = [s.content for s in subtitles]
            translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, s in enumerate(subtitles):
                s.content = translated[i]
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt.compose(subtitles))

        elif file_ext.lower() == ".vtt":
            vtt = webvtt.read(input_path)
            texts = [caption.text for caption in vtt.captions]
            translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, caption in enumerate(vtt.captions):
                caption.text = translated[i]
            vtt.save(output_path)
        else:
            raise ValueError("Unsupported file format. Please upload .srt or .vtt")

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
            "target_language": target_language,
            "target_language_name": LANGUAGE_CODES[target_language],
            "message": "File uploaded, translated, and saved successfully."
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

# Download subtitle file by dynamic name
@router.get("/download-subtitle")
def download_subtitle(
    filename: str = Query(..., description="Name of the subtitle file to download")
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

# Create and return a ZIP file containing multiple translated subtitle files
@router.post("/download-zip")
async def download_zip(request: ZipRequest):
    try:
        # Create a BytesIO object to store the ZIP file in memory
        zip_buffer = io.BytesIO()

        # Create a ZIP file
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for filename in request.filenames:
                # Use the same temp_dir that your other endpoints use
                file_path = os.path.join(temp_dir, filename)

                # Check if file exists
                if not os.path.exists(file_path):
                    return JSONResponse(
                        status_code=404,
                        content={"error": f"File {filename} not found"}
                    )

                # Add file to ZIP
                zip_file.write(file_path, filename)

        # Reset buffer position to beginning
        zip_buffer.seek(0)

        # Return the ZIP file as a streaming response
        return StreamingResponse(
            io.BytesIO(zip_buffer.read()),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=translated_subtitles.zip"}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error creating ZIP file: {str(e)}"}
        )


## TRANSCRIPTION SECTION ##

# Utility: Convert audio/video to 16kHz WAV mono
def convert_to_wav(input_path, output_path):
    (
        ffmpeg
        .input(input_path)
        .output(output_path, format='wav', acodec='pcm_s16le', ac=1, ar='16000')
        .overwrite_output()
        .run(quiet=True)
    )
    return output_path

# Utility: Convert recognized text to SRT
def convert_to_srt(segments):
    srt_output = ""
    for i, seg in enumerate(segments, 1):
        start = str(timedelta(seconds=seg['offset'] / 10000000)).replace('.', ',')[:12]
        end = str(timedelta(seconds=(seg['offset'] + seg['duration']) / 10000000)).replace('.', ',')[:12]
        srt_output += f"{i}\n{start} --> {end}\n{seg['text']}\n\n"
    return srt_output

# Azure Speech Batch Transcription functions
def create_transcription_job(audio_url: str, locale="en-US") -> str:
    payload = {
        "displayName": f"Transcription_{uuid.uuid4()}",
        "locale": locale,
        "contentUrls": [audio_url],
        "properties": {
            "wordLevelTimestampsEnabled": True,
            "diarizationEnabled": False
        }
    }
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "application/json"
    }
    print(payload)
    response = httpx.post(BATCH_ENDPOINT, headers=headers, json=payload)
    response.raise_for_status()
    # print(response.status_code, response.text)
    return response.headers["Location"]

def poll_transcription_result(status_url: str, timeout_sec=300):
    headers = {"Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY}
    for _ in range(timeout_sec // 10):
        response = httpx.get(status_url, headers=headers)
        data = response.json()
        if data["status"] == "Succeeded":
            return data["links"]["files"]
        elif data["status"] == "Failed":
            raise Exception("Transcription failed.")
        time.sleep(10)
    raise TimeoutError("Polling timed out.")

def get_transcription_file(files_url: str):
    headers = {"Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY}
    response = httpx.get(files_url, headers=headers).json()
    transcript_url = next((f["links"]["contentUrl"] for f in response["values"] if f["kind"] == "Detailed"), None)
    if not transcript_url:
        raise Exception("No transcript found.")
    transcript_json = httpx.get(transcript_url).json()
    return transcript_json.get("recognizedPhrases", [])

# FastAPI route
@router.post("/transcribe")
async def transcribe_audio_video(
    file: UploadFile = File(...),
    output_format: str = Form("srt")
):
    try:
        # Step 1: Save uploaded file
        base_name, _ = os.path.splitext(file.filename)
        safe_name = re.sub(r'[^\w\-_.]', '_', base_name)
        input_path = os.path.join(temp_dir, f"{safe_name}_input.{file.filename.split('.')[-1]}")
        with open(input_path, "wb") as f:
            f.write(await file.read())

        # Step 2: Convert to WAV
        wav_path = os.path.join(temp_dir, f"{safe_name}_converted.wav")
        convert_to_wav(input_path, wav_path)

        # Step 3: Upload to Azure Blob
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

        # Step 4: Start Transcription Job
        status_url = create_transcription_job(audio_url)

        # Step 5: Poll for Results
        files_url = poll_transcription_result(status_url)

        # Step 6: Get Transcribed Text
        phrases = get_transcription_file(files_url)

        # Step 7: Write to Output File
        out_name = f"{safe_name}_transcribed.{output_format}"
        out_path = os.path.join(temp_dir, out_name)

        if output_format == "srt":
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(convert_to_srt(phrases))
        elif output_format == "vtt":
            with open(out_path, "w", encoding="utf-8") as f:
                f.write("WEBVTT\n\n" + convert_to_srt(phrases))
        else:
            return JSONResponse(status_code=400, content={"error": "Invalid output format."})

        return {
            "message": "Transcription completed.",
            "transcribed_filename": out_name
        }

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
