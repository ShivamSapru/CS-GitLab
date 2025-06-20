from datetime import datetime
import os
import httpx
import time
import io

from fastapi import APIRouter, UploadFile, File, Form, Query, Request, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Dict, Optional

# from database.models import SubtitleFile, User
from backend.database.models import SubtitleFile, User
from database.db import SessionLocal
from sqlalchemy.orm import Session
from uuid import uuid4, UUID

import srt
import webvtt

# Import Azure Blob Storage functions and container names
from storage.azure_blob_service import (
    upload_subtitle_file,
    download_subtitle_file,
    list_subtitle_files,
    delete_subtitle_file,
    ORIGINAL_SUBTITLES_CONTAINER,
    TRANSLATED_SUBTITLES_CONTAINER
)

router = APIRouter()

# Removed temp_dir usage for file storage
# temp_dir = tempfile.mkdtemp()

# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Environment Variables
AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_SUBSCRIPTION_KEY = os.getenv("AZURE_SUBSCRIPTION_KEY")
AZURE_REGION = os.getenv("AZURE_REGION")
AZURE_LANGUAGES_URL = os.getenv("AZURE_LANGUAGES_URL")

if not AZURE_SUBSCRIPTION_KEY or not AZURE_REGION:
    raise EnvironmentError("Missing AZURE_SUBSCRIPTION_KEY or AZURE_REGION in environment.")

MAX_CHAR_LIMIT = 20000 # Azure limit is 50000 characters per request

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
            print(f"Rate limited. Retrying in 5 seconds...")
            time.sleep(5)
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
            if current_chunk:
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
            print(f"Translating Chunk {count} of {len(total_chunks)}")
            response = post_with_retries(url, headers, body)
            data = response.json()
            translated.extend([item["translations"][0]["text"] for item in data])
            count += 1
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=500, detail=f"Translation API error: {e.response.text}")
        except Exception as ex:
            raise HTTPException(status_code=500, detail=f"Translation failed: {str(ex)}")
    return translated

LANGUAGE_CODES = fetch_language_codes()

@router.get("/languages")
def get_languages() -> Dict[str, str]:
    return LANGUAGE_CODES

@router.get("/health")
def health_check():
    url = f"{os.getenv('AZURE_TRANSLATOR_ENDPOINT').rstrip('/')}/translate?api-version=3.0&to=fr"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SUBSCRIPTION_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_REGION,
        "Content-Type": "application/json; charset=UTF-8",
    }
    json_body = [{"Text": "Hello, world!!"}]

    try:
        resp = httpx.post(url, headers=headers, json=json_body)
        if resp.status_code == 200:
            return {
                "status": f"{resp.status_code} healthy",
                "message": "Backend server is running and Azure Translator is reachable."
            }
        elif resp.status_code == 401:
            raise HTTPException(
                status_code=401,
                detail="Invalid or missing Azure credentials. Check API key and region."
            )
        elif resp.status_code == 403:
            raise HTTPException(
                status_code=403,
                detail="Access to Azure Translator is forbidden. Verify subscription and permissions."
            )
        elif resp.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Azure Translator rate limit exceeded. Try again later or optimize request volume."
            )
        elif resp.status_code == 503:
            raise HTTPException(
                status_code=503,
                detail="Azure Translator service temporarily unavailable."
            )
        else:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Unexpected error occurred. Azure response code: {resp.status_code}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed due to: {str(e)}"
        )


@router.post("/upload-file")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    target_language: str = Form(...),
    censor_profanity: bool = Form(...),
    # project_id from form is optional. If not provided, a new UUID will be generated.
    project_id: Optional[UUID] = Form(None),
    db: Session = Depends(get_db)
):
    if file.filename is None:
        raise HTTPException(status_code=400, detail="No filename provided.")

    base_name, file_ext = os.path.splitext(file.filename)
    if file_ext.lower() not in [".srt", ".vtt"]:
        raise HTTPException(status_code=400, detail="Unsupported file format.")

    # Retrieve user_id from session as per your existing code
    session_user = request.session.get("user")
    if not session_user or not session_user.get("email"):
        raise HTTPException(status_code=401, detail="User not authenticated")

    user_email = session_user["email"]
    user_db_record = db.query(User).filter(User.email == user_email).first()
    if not user_db_record:
        raise HTTPException(status_code=404, detail="User not found in database.")
    
    # Use the UUID from the database record
    user_id_uuid = user_db_record.user_id 

    # Generate a new project_id as UUID if not provided in the form
    if project_id is None:
        project_id_uuid = uuid4()
    else:
        project_id_uuid = project_id # Use the provided UUID

    original_file_content_bytes = await file.read()
    
    try:
        # Upload original file to Azure Blob Storage
        original_blob_name = upload_subtitle_file(
            ORIGINAL_SUBTITLES_CONTAINER,
            str(user_id_uuid), # Convert UUID to string for blob path
            str(project_id_uuid), # Convert UUID to string for blob path
            file.filename,
            original_file_content_bytes
        )
        if not original_blob_name:
            raise HTTPException(status_code=500, detail="Failed to upload original file to Azure Blob Storage.")

        file_content_str = original_file_content_bytes.decode('utf-8')
        translated_subtitles_data = None

        # Translate subtitle content
        if file_ext.lower() == ".srt":
            subtitles = list(srt.parse(file_content_str))
            texts = [s.content for s in subtitles]
            translated_texts = detect_and_translate(texts, target_language, censor_profanity)
            for i, s in enumerate(subtitles):
                s.content = translated_texts[i]
            translated_subtitles_data = srt.compose(subtitles).encode('utf-8')
        elif file_ext.lower() == ".vtt":
            vtt_obj = webvtt.read_buffer(io.StringIO(file_content_str))
            texts = [caption.text for caption in vtt_obj.captions]
            translated_texts = detect_and_translate(texts, target_language, censor_profanity)
            for i, caption in enumerate(vtt_obj.captions):
                caption.text = translated_texts[i]
            translated_subtitles_data = vtt_obj.content.encode('utf-8')
            
        if not translated_subtitles_data:
            raise HTTPException(status_code=500, detail="Subtitle translation processing failed.")

        tag = " and Censored" if censor_profanity else ""
        translated_file_name = f"{base_name} (Translated to {target_language.upper()}{tag}){file_ext}"

        # Upload translated file to Azure Blob Storage
        translated_blob_name = upload_subtitle_file(
            TRANSLATED_SUBTITLES_CONTAINER,
            str(user_id_uuid), # Convert UUID to string for blob path
            str(project_id_uuid), # Convert UUID to string for blob path
            translated_file_name,
            translated_subtitles_data
        )
        if not translated_blob_name:
            raise HTTPException(status_code=500, detail="Failed to upload translated file to Azure Blob Storage.")

        # Save metadata for ORIGINAL file to database
        original_record = SubtitleFile(
            file_id=uuid4(), # Generate new UUID for file_id
            user_id=user_id_uuid, # Use UUID object directly for DB
            project_id=project_id_uuid, # Use UUID object directly for DB
            original_file_name=file.filename,
            storage_path=original_blob_name,
            file_format=file_ext.lower().lstrip("."),
            file_size_bytes=len(original_file_content_bytes),
            is_original=True,
            is_public=False,
            has_profanity=False, # Assuming false until profanity check
            source_language=LANGUAGE_CODES.get(file_ext.lower().lstrip("."), "auto"),
            created_at=datetime.utcnow()
        )
        db.add(original_record)

        # Save metadata for TRANSLATED file to database
        translated_record = SubtitleFile(
            file_id=uuid4(), # Generate new UUID for file_id
            user_id=user_id_uuid, # Use UUID object directly for DB
            project_id=project_id_uuid, # Use UUID object directly for DB
            original_filename=translated_file_name,
            storage_path=translated_blob_name,
            file_format=file_ext.lower().lstrip("."),
            file_size_bytes=len(translated_subtitles_data),
            is_original=False,
            is_public=False,
            has_profanity=censor_profanity,
            source_language=LANGUAGE_CODES.get(file_ext.lower().lstrip("."), "auto"), # Source of translation
            target_language=LANGUAGE_CODES.get(target_language, target_language), # Target of translation
            created_at=datetime.utcnow()
        )
        db.add(translated_record)

        db.commit()
        db.refresh(original_record)
        db.refresh(translated_record)

        return JSONResponse(status_code=200, content={
            "message": "Files uploaded, translated, and stored successfully.",
            "original_filename": file.filename,
            "original_blob_path": original_blob_name,
            "translated_filename": translated_file_name,
            "translated_blob_path": translated_blob_name,
            "user_id": str(user_id_uuid), # Return as string for API response
            "project_id": str(project_id_uuid), # Return as string for API response
            "source_language": LANGUAGE_CODES.get(file_ext.lower().lstrip("."), "auto"),
            "target_language": LANGUAGE_CODES.get(target_language, target_language),
            "target_language_name": LANGUAGE_CODES.get(target_language, "Unknown")
        })

    except HTTPException as http_exc: # Catch FastAPIs HTTPException
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/download-subtitle")
async def download_subtitle(
    # These parameters identify the blob in Azure Storage
    user_id: UUID = Query(..., description="User ID associated with the file"), # Updated type to UUID
    project_id: UUID = Query(..., description="Project ID associated with the file"), # Updated type to UUID
    filename: str = Query(..., description="Name of the subtitle file to download"),
    container: str = Query(..., description="Container: 'original-subtitles' or 'translated-subtitles'") # Added container parameter
):
    if container not in [ORIGINAL_SUBTITLES_CONTAINER, TRANSLATED_SUBTITLES_CONTAINER]:
        raise HTTPException(status_code=400, detail=f"Invalid container. Use '{ORIGINAL_SUBTITLES_CONTAINER}' or '{TRANSLATED_SUBTITLES_CONTAINER}'.")

    file_content_bytes = download_subtitle_file(
        container,
        str(user_id), # Convert UUID to string for blob path
        str(project_id), # Convert UUID to string for blob path
        filename
    )

    if file_content_bytes:
        return StreamingResponse(
            io.BytesIO(file_content_bytes),
            media_type="application/octet-stream", # Use generic for broad compatibility
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
    else:
        raise HTTPException(status_code=404, detail="File not found or download failed.")

# New: Endpoint to list files from Blob Storage
@router.get("/list-blob-files")
async def list_blob_files_endpoint(
    container: str = Query(..., description="Container: 'original-subtitles' or 'translated-subtitles'"),
    user_id: Optional[UUID] = Query(None, description="Optional User ID to filter"), # Updated type to UUID
    project_id: Optional[UUID] = Query(None, description="Optional Project ID to filter (requires User ID)") # Updated type to UUID
):
    if container not in [ORIGINAL_SUBTITLES_CONTAINER, TRANSLATED_SUBTITLES_CONTAINER]:
        raise HTTPException(status_code=400, detail=f"Invalid container. Use '{ORIGINAL_SUBTITLES_CONTAINER}' or '{TRANSLATED_SUBTITLES_CONTAINER}'.")

    if project_id and not user_id:
        raise HTTPException(status_code=400, detail="project_id filter requires user_id.")
    
    files_in_blob = list_subtitle_files(container, str(user_id) if user_id else None, str(project_id) if project_id else None)

    return JSONResponse(status_code=200, content={"container": container, "user_id": str(user_id) if user_id else None, "project_id": str(project_id) if project_id else None, "files": files_in_blob})

# New: Endpoint to delete files from Blob Storage
@router.delete("/delete-blob-file")
async def delete_blob_file_endpoint(
    container: str = Query(..., description="Container: 'original-subtitles' or 'translated-subtitles'"),
    user_id: UUID = Query(...), # Updated type to UUID
    project_id: UUID = Query(...), # Updated type to UUID
    file_name: str = Query(...)
):
    if container not in [ORIGINAL_SUBTITLES_CONTAINER, TRANSLATED_SUBTITLES_CONTAINER]:
        raise HTTPException(status_code=400, detail=f"Invalid container. Use '{ORIGINAL_SUBTITLES_CONTAINER}' or '{TRANSLATED_SUBTITLES_CONTAINER}'.")

    if delete_subtitle_file(container, str(user_id), str(project_id), file_name):
        return JSONResponse(status_code=200, content={"message": f"File '{file_name}' deleted successfully from '{container}'."})
    else:
        raise HTTPException(status_code=500, detail="Failed to delete file from Azure Blob Storage.")

