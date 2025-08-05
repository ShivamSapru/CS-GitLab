import os
import io
import httpx
import zipfile
import tempfile
import srt
import webvtt
import time
import json

from fastapi import APIRouter, UploadFile, File, Form, Query, Request, Depends, Response
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from typing import Dict, Optional, List
from pydantic import BaseModel
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient

from backend.database.models import SubtitleFile, User
from backend.database.models import Translation
from backend.database.models import TranslationProject
from backend.database.models import TranscriptionProject, Notification
from backend.database.db import SessionLocal
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import uuid4
from datetime import datetime, timezone
from collections import Counter

load_dotenv()

router = APIRouter()
temp_dir = tempfile.mkdtemp()

class ProjectSaveRequest(BaseModel):
    project_name: str
    description: Optional[str] = ""
    filenames: List[str]
    original_filename: str
    target_languages: List[str]
    is_public: Optional[bool] = False
    edited_files: Optional[Dict[str, str]] = {}
    # language_map: Optional[Dict[str, str]] = {}
    source_language: str
    original_file_path: str
    translated_file_path: List[str]

class ZipRequest(BaseModel):
    filenames: List[str]

# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Environment variables
AZURE_TRANSLATOR_LANGUAGES = os.getenv("AZURE_TRANSLATOR_LANGUAGES")
AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_TRANSLATOR_KEY = os.getenv("AZURE_TRANSLATOR_KEY")
AZURE_TRANSLATOR_REGION = os.getenv("AZURE_TRANSLATOR_REGION")

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER_NAME = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "subtitle-projects")

MAX_CHAR_LIMIT = 20000

if not AZURE_TRANSLATOR_KEY or not AZURE_TRANSLATOR_REGION:
    raise EnvironmentError("Missing Azure Translator credentials.")

def fetch_language_codes() -> Dict[str, str]:
    try:
        if not AZURE_TRANSLATOR_LANGUAGES:
            raise EnvironmentError("AZURE_TRANSLATOR_LANGUAGES is not set.")
        response = httpx.get(AZURE_TRANSLATOR_LANGUAGES)
        response.raise_for_status()
        data = response.json()
        return {code: lang["name"] for code, lang in data.get("translation", {}).items()}
    except Exception as e:
        print(f"Error fetching language codes: {e}")
        return {}

def post_with_retries(url, headers, json_body, retries=14):
    for _ in range(retries):
        response = httpx.post(url, headers=headers, json=json_body)
        if response.status_code == 429:
            wait = 5
            print(f"Rate limited. Retrying in {wait} seconds...")
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response
    raise Exception("Exceeded retry limit for translation.")

def chunk_texts(texts: List[str], max_chars: int) -> List[List[str]]:
    chunks, current_chunk, current_len = [], [], 0
    for text in texts:
        if current_len + len(text) > max_chars:
            chunks.append(current_chunk)
            current_chunk = [text]
            current_len = len(text)
        else:
            current_chunk.append(text)
            current_len += len(text)
    if current_chunk:
        chunks.append(current_chunk)
    return chunks

def get_blob_client():
    connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string:
        raise EnvironmentError("AZURE_STORAGE_CONNECTION_STRING not configured")
    return BlobServiceClient.from_connection_string(connection_string)

def upload_to_blob(file_path, blob_name, container_name):
    blob_client = get_blob_client()
    container_client = blob_client.get_container_client(container_name)
    try:
        with open(file_path, "rb") as data:
            container_client.upload_blob(blob_name, data, overwrite=True)
        return f"https://{os.getenv('AZURE_STORAGE_ACCOUNT_NAME')}.blob.core.windows.net/{container_name}/{blob_name}"
    except Exception as e:
        print(f"Error uploading file {file_path} to {container_name}: {e}")
        raise

def detect_and_translate(texts, to_lang, no_prof=False):
    url = f"{AZURE_TRANSLATOR_ENDPOINT.rstrip('/')}/translate?api-version=3.0&to={to_lang}"
    if no_prof:
        url += "&profanityAction=Marked"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
        "Content-Type": "application/json; charset=UTF-8",
    }
    translated = []
    detected_langs = []
    count = 1
    total_chunks = chunk_texts(texts, MAX_CHAR_LIMIT)
    for chunk in total_chunks:
        body = [{"Text": t} for t in chunk]
        try:
            print("Translating Chunk", count, "of", len(total_chunks))
            response = post_with_retries(url, headers, body)
            data = response.json()
            translated.extend([item["translations"][0]["text"] for item in data])
            detected_langs.extend([item["detectedLanguage"]["language"] for item in data])
            count += 1
        except httpx.HTTPStatusError as e:
            print("Status Code:", e.response.status_code)
            print("Response Text:", e.response.text)
            raise e
        except Exception as ex:
            print("Translation Error:", ex)
            raise ex

    lang_counter = Counter(detected_langs)
    detected_language = lang_counter.most_common(1)[0][0] if detected_langs else None
    detected_language = LANGUAGE_CODES.get(detected_language, "Unknown")
    return translated, detected_language

LANGUAGE_CODES = fetch_language_codes()

@router.get("/languages")
def get_languages() -> Dict[str, str]:
    return LANGUAGE_CODES

# Updated upload-file endpoint with proper user_id handling
@router.post("/translate")
async def translate_file(
    request: Request,
    file: UploadFile = File(...),
    target_language: str = Form(...),
    censor_profanity: bool = Form(False),
    db: Session = Depends(get_db)
):
    try:
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user = db.query(User).filter(User.email == session_user["email"]).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        input_path = os.path.join(temp_dir, file.filename)
        base, ext = os.path.splitext(file.filename)
        tag = " and Censored" if censor_profanity else ""
        target_language_name = LANGUAGE_CODES.get(target_language, "Unknown")
        output_filename = f"{base} (Translated to {target_language_name}{tag}).{target_language}{ext}"
        output_path = os.path.join(temp_dir, output_filename)

        with open(input_path, "wb") as f:
            f.write(await file.read())

        if ext.lower() == ".srt":
            with open(input_path, "r", encoding="utf-8") as f:
                subtitles = list(srt.parse(f.read()))
            texts = [s.content for s in subtitles]
            translated, source_language = detect_and_translate(texts, target_language, censor_profanity)
            for i, s in enumerate(subtitles):
                s.content = translated[i]
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt.compose(subtitles))

        elif ext.lower() == ".vtt":
            vtt = webvtt.read(input_path)
            texts = [c.text for c in vtt.captions]
            translated, source_language = detect_and_translate(texts, target_language, censor_profanity)
            for i, c in enumerate(vtt.captions):
                c.text = translated[i]
            vtt.save(output_path)
        else:
            return JSONResponse(status_code=400, content={"error": "Unsupported file format"})

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
            "target_language": target_language,
            "target_language_name": target_language_name,
            "source_language": source_language,
            "original_file_path": input_path,
            "translated_file_path": output_path,
            "message": "File translated successfully. Ready to save project."
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Translation failed: {str(e)}"})

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

@router.post("/save-project")
async def save_project(
    request: Request,
    project_data: ProjectSaveRequest,
    db: Session = Depends(get_db)
):
    is_public = project_data.is_public
    try:
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        project_id = uuid4()
        current_time = datetime.now(timezone.utc)

        existing_project = db.query(TranslationProject).filter(
            and_(
                TranslationProject.user_id == user.user_id,
                TranslationProject.project_name == project_data.project_name
            )
        ).first()
        if existing_project:
            existing_created_at = existing_project.created_at.replace(tzinfo=timezone.utc)
            if (current_time - existing_created_at).total_seconds() < 30:
                return JSONResponse(status_code=409, content={"error": "Duplicate project name recently created"})
            else:
                project_data.project_name += f"_{current_time.strftime('%Y%m%d_%H%M%S')}"

        project = TranslationProject(
            project_id=project_id,
            user_id=user.user_id,
            project_name=project_data.project_name,
            description=project_data.description,
            is_public=project_data.is_public,
            created_at=current_time,
            updated_at=current_time
        )
        db.add(project)
        db.flush()

        blob_client = get_blob_client()
        container_client = blob_client.get_container_client(AZURE_STORAGE_CONTAINER_NAME)
        try:
            container_client.create_container()
        except Exception:
            pass

        uploaded_files = []

        # 1. FIRST: Store the original subtitle file (if it exists)
        original_file_stored = False
        original_subtitle_file = None
        original_filename = project_data.original_filename
        local_path = project_data.original_file_path

        # If original_file_path is empty or just a filename, construct the full path
        if not local_path or not os.path.isabs(local_path):
            local_path = os.path.join(temp_dir, original_filename)

        print(f"Looking for original file at: {local_path}")

        if os.path.exists(local_path):
            # Original file exists, store it
            file_size = 0
            blob_name = f"projects/{project_id}/{original_filename}"
            blob_url = f"https://{os.getenv('AZURE_STORAGE_ACCOUNT_NAME')}.blob.core.windows.net/{AZURE_STORAGE_CONTAINER_NAME}/{blob_name}"

            with open(local_path, "rb") as f:
                file_bytes = f.read()
            file_size = len(file_bytes)
            blob_client.get_blob_client(container=AZURE_STORAGE_CONTAINER_NAME, blob=blob_name).upload_blob(file_bytes, overwrite=True)

            # Create the ORIGINAL subtitle file record
            original_subtitle_file = SubtitleFile(
                file_id=uuid4(),
                project_id=project_id,
                original_file_name=original_filename,
                file_format=original_filename.split(".")[-1] if original_filename else "srt",
                file_size_bytes=file_size,
                is_original=True,  # This is the original file
                source_language=project_data.source_language,
                blob_url=blob_url
            )
            db.add(original_subtitle_file)
            db.flush()

            uploaded_files.append({
                "filename": original_filename,
                "blob_path": blob_name,
                "size": file_size,
                "is_original": True
            })
            original_file_stored = True
            print(f"✅ Original file uploaded to blob: {blob_name}")
        else:
            print(f"⚠️ Warning: Original file not found at {local_path}")

        # 2. SECOND: Store each translated subtitle file as separate SubtitleFile records
        for idx, filename in enumerate(project_data.filenames):
            translated_file_id = uuid4()

            if filename in project_data.edited_files:
                # Handle edited files
                content = project_data.edited_files[filename]
                if not content.strip():
                    continue
                blob_name = f"projects/{project_id}/{filename}"
                file_bytes = content.encode("utf-8")
                file_size = len(file_bytes)
                blob_client.get_blob_client(container=AZURE_STORAGE_CONTAINER_NAME, blob=blob_name).upload_blob(file_bytes, overwrite=True)
            else:
                # Handle translated file from temp storage
                if idx < len(project_data.translated_file_path):
                    local_path = project_data.translated_file_path[idx]
                    if not os.path.isabs(local_path):
                        local_path = os.path.join(temp_dir, local_path)
                else:
                    local_path = os.path.join(temp_dir, filename)

                if not os.path.exists(local_path):
                    print(f"Warning: Translated file not found: {local_path}")
                    continue

                with open(local_path, "rb") as f:
                    file_bytes = f.read()
                file_size = len(file_bytes)
                blob_name = f"projects/{project_id}/{filename}"
                blob_client.get_blob_client(container=AZURE_STORAGE_CONTAINER_NAME, blob=blob_name).upload_blob(file_bytes, overwrite=True)

            # Create a SEPARATE SubtitleFile record for each translated file
            translated_subtitle_file = SubtitleFile(
                file_id=translated_file_id,
                project_id=project_id,
                original_file_name=filename,  # This is the translated filename
                file_format=filename.split(".")[-1] if filename else "srt",
                file_size_bytes=file_size,
                is_original=False,  # This is a translated file, NOT original
                source_language=project_data.source_language,
                blob_url=f"https://{os.getenv('AZURE_STORAGE_ACCOUNT_NAME')}.blob.core.windows.net/{AZURE_STORAGE_CONTAINER_NAME}/{blob_name}"
            )
            db.add(translated_subtitle_file)
            db.flush()

            uploaded_files.append({
                "filename": filename,
                "blob_path": blob_name,
                "size": file_size,
                "is_edited": filename in project_data.edited_files
            })

            # Create translation record linking original to translated
            translation = Translation(
                translation_id=uuid4(),
                file_id=original_subtitle_file.file_id if original_subtitle_file else translated_file_id,  # Reference original if it exists
                translated_file_id=translated_file_id,  # Reference the translated file
                target_language=project_data.target_languages[idx] if idx < len(project_data.target_languages) else project_data.target_languages[0],
                translation_status="completed",
                requested_at=current_time,
                completed_at=current_time,
                censor_profanity=False,
                translation_cost=None,
                manual_edits_count=0,
                last_updated=user.user_id,
                last_edited_at=None,
                project_id=project_id,
                blob_url=f"https://{os.getenv('AZURE_STORAGE_ACCOUNT_NAME')}.blob.core.windows.net/{AZURE_STORAGE_CONTAINER_NAME}/{blob_name}"
            )
            db.add(translation)

        if not uploaded_files:
            return JSONResponse(status_code=400, content={"error": "No valid files uploaded"})


        transcription_project = TranscriptionProject(
            project_id=project_id,
            user_id=user.user_id,
            status="Pending",
            created_at=current_time,
            subtitle_file_url=uploaded_files[0]["blob_path"],
            media_url=None
        )
        db.add(transcription_project)
        db.flush()

        notification = Notification(
            user_id=user.user_id,
            project_id=project_id,
            project_status="Pending",
            creation_time=current_time,
            message=f"Your project '{project_data.project_name}' has been created and is pending transcription.",
            is_read=False
        )
        db.add(notification)
        db.commit()

        return {
            "success": True,
            "project_id": str(project_id),
            "message": "Project saved successfully",
            "files_saved": len(uploaded_files)
        }
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": f"Failed to save project: {str(e)}"})

# Add this endpoint to your router.py file

@router.get("/project/{project_id}/original")
async def get_original_file_content(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get the original file content for a project for comparison viewing
    """
    try:
        # Check authentication
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user = db.query(User).filter(User.email == session_user["email"]).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Get the project
        project = db.query(TranslationProject).filter(
            TranslationProject.project_id == project_id
        ).first()

        if not project:
            return JSONResponse(status_code=404, content={"error": "Project not found"})

        # Check if user has access to this project
        if not project.is_public and project.user_id != user.user_id:
            return JSONResponse(status_code=403, content={"error": "Access denied"})

        # Get the original subtitle file
        original_file = db.query(SubtitleFile).filter(
            and_(
                SubtitleFile.project_id == project_id,
                SubtitleFile.is_original == True
            )
        ).first()

        if not original_file:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Original file not found",
                    "message": "This project was created before original file storage was implemented.",
                    "project_details": {
                        "project_name": project.project_name,
                        "created_at": project.created_at.isoformat(),
                    }
                }
            )

        # Try to get the file content from blob storage
        try:
            blob_client = get_blob_client()

            # Try multiple possible blob locations for the original file
            possible_blob_names = []

            # First try: the blob_url from the database record
            if original_file.blob_url:
                try:
                    # Extract blob name from URL - handle both formats
                    url_parts = original_file.blob_url.split('/')
                    if len(url_parts) >= 2:
                        possible_blob_names.append('/'.join(url_parts[-2:]))
                except:
                    pass

            # Second try: standard project structure
            possible_blob_names.append(f"projects/{project_id}/{original_file.original_file_name}")

            # Third try: the "original_" prefixed version (your backend creates this too)
            possible_blob_names.append(f"projects/{project_id}/original_{original_file.original_file_name}")

            # Fourth try: just the filename in the project folder
            if original_file.original_file_name:
                possible_blob_names.append(f"projects/{project_id}/{original_file.original_file_name}")

            content = None
            successful_blob_name = None

            # Try each possible location
            for blob_name in possible_blob_names:
                try:
                    print(f"Trying to fetch blob: {blob_name}")
                    blob_client_instance = blob_client.get_blob_client(
                        container=AZURE_STORAGE_CONTAINER_NAME,
                        blob=blob_name
                    )

                    blob_data = blob_client_instance.download_blob()
                    content = blob_data.readall().decode('utf-8')
                    successful_blob_name = blob_name
                    print(f"✅ Successfully found original file at: {blob_name}")
                    break
                except Exception as e:
                    print(f"❌ Failed to fetch from {blob_name}: {str(e)}")
                    continue

            if content:
                return {
                    "success": True,
                    "content": content,
                    "filename": original_file.original_file_name,
                    "source_language": original_file.source_language,
                    "file_format": original_file.file_format,
                    "size": len(content),
                    "blob_location": successful_blob_name
                }
            else:
                # No content found in any location
                return JSONResponse(
                    status_code=404,
                    content={
                        "error": "Original file content not found",
                        "message": "The original file exists in the database but cannot be found in blob storage.",
                        "attempted_locations": possible_blob_names,
                        "project_details": {
                            "project_name": project.project_name,
                            "original_filename": original_file.original_file_name,
                            "created_at": project.created_at.isoformat(),
                        }
                    }
                )

        except Exception as blob_error:
            print(f"Error retrieving blob content: {blob_error}")
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Original file content not accessible",
                    "message": "The original file exists in the database but cannot be retrieved from storage.",
                    "details": str(blob_error)
                }
            )

    except Exception as e:
        print(f"Error in get_original_file_content: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to retrieve original file: {str(e)}"}
        )
