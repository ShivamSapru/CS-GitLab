from datetime import datetime
import os
import httpx
import tempfile
import time

from sqlalchemy.orm import Session
from fastapi import Depends
from database.db import SessionLocal
from database import models

from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse
from typing import Dict, Optional
from dotenv import load_dotenv

import srt
import webvtt

load_dotenv()

router = APIRouter(prefix="/translate")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

temp_dir = tempfile.mkdtemp()

# List of Languages present for translation
LANGUAGE_CODES = {
    "en": "English",
    "hi": "Hindi",
    "fr": "French",
    "de": "German"
}

AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_SUBSCRIPTION_KEY = os.getenv("AZURE_SUBSCRIPTION_KEY")
AZURE_REGION = os.getenv("AZURE_REGION")


if not AZURE_SUBSCRIPTION_KEY or not AZURE_REGION:
    raise EnvironmentError("Missing AZURE_SUBSCRIPTION_KEY or AZURE_REGION in environment.")


MAX_CHAR_LIMIT = 20000  # Azure limit is 50000 characters/request


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


def detect_and_translate(texts, to_lang):
    path = "/translate?api-version=3.0"
    params = f"&to={to_lang}"
    url = AZURE_TRANSLATOR_ENDPOINT + path + params
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SUBSCRIPTION_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_REGION,
        "Content-type": "application/json",
    }

    translated = []
    count = 1
    total_chunks = chunk_texts(texts, MAX_CHAR_LIMIT)
    for chunk in total_chunks:
        body = [{"Text": t} for t in chunk]
        try:
            # print("\nSource Chunk", count, ":", body)
            print("\nTranslating Chunk", count, "of", len(total_chunks))
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


# Endpoint to get the supported languages
@router.get("/languages")
def get_languages() -> Dict[str, str]:
    return LANGUAGE_CODES

# Health check endpoint
@router.get("/health")
def health_check():
    return {"status": "healthy", "message": "Backend server is running"}

# Uploading the .srt or .vtt file and selecting the source and target language
@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    source_language: str = Form(...),
    target_language: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        input_path = os.path.join(temp_dir, file.filename)
        base_name, file_ext = os.path.splitext(file.filename)
        output_filename = f"{base_name} (Translated to {target_language.upper()}){file_ext}"
        output_path = os.path.join(temp_dir, output_filename)

        with open(input_path, "wb") as f:
            f.write(await file.read())

        if file_ext.lower() == ".srt":
            with open(input_path, "r", encoding="utf-8") as f:
                subtitles = list(srt.parse(f.read()))
            texts = [s.content for s in subtitles]
            translated = detect_and_translate(texts, target_language)
            for i, s in enumerate(subtitles):
                s.content = translated[i]
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt.compose(subtitles))
                
            subtitle_record = models.SubtitleFile(
                user_id=None,
                original_filename=file.name,
                storage_path=output_path,
                file_format="srt",
                file_size_bytes=os.path.getsize(output_path),
                is_original=False,
                is_public=False,
                has_profanity=False,
                source_language=source_language,
                created_at=datetime.utcnow()
            )
            db.add(subtitle_record)
            db.commit()
            db.refresh(subtitle_record)

        elif file_ext.lower() == ".vtt":
            vtt = webvtt.read(input_path)
            texts = [caption.text for caption in vtt.captions]
            translated = detect_and_translate(texts, target_language)
            for i, caption in enumerate(vtt.captions):
                caption.text = translated[i]
            vtt.save(output_path)

            subtitle_record = models.SubtitleFile(
                user_id=None,
                original_filename=file.filename,
                storage_path=output_path,
                file_format="vtt",
                file_size_bytes=os.path.getsize(output_path),
                is_original=False,
                is_public=False,
                has_profanity=False,
                source_language=source_language,
                created_at=datetime.utcnow()
            )
            db.add(subtitle_record)
            db.commit()
            db.refresh(subtitle_record)

        
        else:
            raise ValueError("Unsupported file format. Please upload .srt or .vtt")

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
            "source_language": source_language,
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
