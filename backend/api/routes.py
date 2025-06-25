import os
import httpx
import tempfile
import time

from fastapi import APIRouter, UploadFile, File, Form, Query, Request, Depends
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from typing import Dict, Optional, List
# from dotenv import load_dotenv
from pydantic import BaseModel

from backend.database.models import SubtitleFile, User
from backend.database.db import SessionLocal
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime

import srt
import webvtt
import zipfile
import io


class ZipRequest(BaseModel):
    filenames: List[str]

# load_dotenv()

router = APIRouter()

temp_dir = tempfile.mkdtemp()

# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_SUBSCRIPTION_KEY = os.getenv("AZURE_SUBSCRIPTION_KEY")
AZURE_REGION = os.getenv("AZURE_REGION")
AZURE_LANGUAGES_URL = os.getenv("AZURE_LANGUAGES_URL")

# --- ADD THESE DEBUG PRINTS TO SEE WHAT'S ACTUALLY LOADED ---
print(f"DEBUG: AZURE_TRANSLATOR_ENDPOINT: {AZURE_TRANSLATOR_ENDPOINT}")
print(f"DEBUG: AZURE_SUBSCRIPTION_KEY (first 10 chars): {AZURE_SUBSCRIPTION_KEY[:10] if AZURE_SUBSCRIPTION_KEY else 'None'}")
print(f"DEBUG: AZURE_REGION: {AZURE_REGION}")
print(f"DEBUG: AZURE_LANGUAGES_URL: {AZURE_LANGUAGES_URL}")
# --- END DEBUG PRINTS ---

if not AZURE_SUBSCRIPTION_KEY or not AZURE_REGION:
    raise EnvironmentError("Missing AZURE_SUBSCRIPTION_KEY or AZURE_REGION in environment.")

MAX_CHAR_LIMIT = 20000  # Azure limit is 50000 characters per request


def fetch_language_codes() -> Dict[str, str]:
    try:
        if not AZURE_LANGUAGES_URL:
            raise EnvironmentError("AZURE_LANGUAGES_URL is not set in environment variables.")

        response = httpx.get(AZURE_LANGUAGES_URL)
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


def detect_and_translate(texts, to_lang, no_prof):
    path = "/translate?api-version=3.0"
    params = f"&to={to_lang}"
    if no_prof:
        params += "&profanityAction=Marked"
    url = AZURE_TRANSLATOR_ENDPOINT.rstrip('/') + path + params
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SUBSCRIPTION_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_REGION,
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
        "azure_key_configured": bool(AZURE_SUBSCRIPTION_KEY),
        "azure_endpoint_configured": bool(AZURE_TRANSLATOR_ENDPOINT),
        "azure_region_configured": bool(AZURE_REGION),
    }

# Only invoke manually for debugging
@router.get("/debug/translator-check")
def debug_translator():
    url = f"{os.getenv('AZURE_TRANSLATOR_ENDPOINT').rstrip('/')}/translate?api-version=3.0&to=fr"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SUBSCRIPTION_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_REGION,
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
    request: Request,
    file: UploadFile = File(...),
    target_language: str = Form(...),
    censor_profanity: bool = Form(...),
    db: Session = Depends(get_db)
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

        # ✅ Retrieve user from session
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # ✅ Store subtitle metadata in database
        subtitle = SubtitleFile(
            file_id=uuid4(),
            project_id=None,
            user_id=user.user_id,
            original_file_name=file.filename,
            storage_path=output_path,
            file_format=file_ext.lower().replace(".", ""),
            file_size_bytes=os.path.getsize(output_path),
            is_original=True,
            is_public=False,
            has_profanity=censor_profanity,
            source_language="auto",
            created_at=datetime.utcnow()
        )

        db.add(subtitle)
        db.commit()

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
            "target_language": target_language,
            "target_language_name": LANGUAGE_CODES.get(target_language),
            "message": "File uploaded, translated, and saved successfully."
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

# Download subtitle file by dynamic name
@router.get("/download-subtitle")
def download_subtitle(filename: str = Query(..., description="Name of the subtitle file to download")):
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
