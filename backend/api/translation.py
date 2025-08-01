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

MAX_CHAR_LIMIT = 20000  # Azure limit: 50000 characters/request

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
    """
    Uploads a file to a specified container in Azure Blob Storage.
    """
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
            # print("\nSource Chunk", count, ":", body)
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

    # Count detected language occurrences and return the most common one
    lang_counter = Counter(detected_langs)
    detected_language = lang_counter.most_common(1)[0][0] if detected_langs else None
    detected_language = LANGUAGE_CODES.get(detected_language, "Unknown")
    return translated, detected_language


# List of Languages present for translation
LANGUAGE_CODES = fetch_language_codes()

# Endpoint to get the supported languages
@router.get("/languages")
def get_languages() -> Dict[str, str]:
    return LANGUAGE_CODES

# Updated upload-file endpoint with proper user_id handling
@router.post("/upload-file")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    target_language: str = Form(...),
    censor_profanity: bool = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # Retrieve user from session FIRST
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Set paths and file names
        input_path = os.path.join(temp_dir, file.filename)
        base, ext = os.path.splitext(file.filename)
        tag = " and Censored" if censor_profanity else ""
        target_language_name = LANGUAGE_CODES.get(target_language, "Unknown")
        output_filename = f"{base} (Translated to {target_language_name}{tag}).{target_language}{ext}"
        output_path = os.path.join(temp_dir, output_filename)

        # Save the original file temporarily
        with open(input_path, "wb") as f:
            f.write(await file.read())

        # Process subtitles based on file type
        if ext.lower() == ".srt":
            with open(input_path, "r", encoding="utf-8") as f:
                subtitles = list(srt.parse(f.read()))
            texts = [s.content for s in subtitles]
            translated, source_language = detect_and_translate(texts, target_language, censor_profanity)
            # translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, s in enumerate(subtitles):
                s.content = translated[i]
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt.compose(subtitles))

        elif ext.lower() == ".vtt":
            vtt = webvtt.read(input_path)
            texts = [c.text for c in vtt.captions]
            translated, source_language = detect_and_translate(texts, target_language, censor_profanity)
            # translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, c in enumerate(vtt.captions):
                c.text = translated[i]
            vtt.save(output_path)

        else:
            raise ValueError("Unsupported file format. Please upload .srt or .vtt")

        # Upload the original and translated files to Azure Blob Storage
        blob_client = get_blob_client()
        container_client = blob_client.get_container_client(AZURE_STORAGE_CONTAINER_NAME)

        # Upload original file
        original_blob_name = f"subtitles/original/{file.filename}"
        with open(input_path, "rb") as data:
            container_client.upload_blob(original_blob_name, data, overwrite=True)

        # Upload translated file
        translated_blob_name = f"subtitles/translated/{output_filename}"
        with open(output_path, "rb") as data:
            container_client.upload_blob(translated_blob_name, data, overwrite=True)

        # Get Blob URLs
        original_url = f"https://{os.getenv('AZURE_STORAGE_ACCOUNT_NAME')}.blob.core.windows.net/{os.getenv('AZURE_STORAGE_CONTAINER_NAME')}/{original_blob_name}"
        translated_url = f"https://{os.getenv('AZURE_STORAGE_ACCOUNT_NAME')}.blob.core.windows.net/{os.getenv('AZURE_STORAGE_CONTAINER_NAME')}/{translated_blob_name}"

        # Save metadata for translated subtitle file in the database
        translated_subtitle = SubtitleFile(
            file_id=uuid4(),
            project_id=None,
            original_file_name=output_filename,
            file_format=ext.lower().replace(".", ""),
            file_size_bytes=os.path.getsize(output_path),
            is_original=False,
            source_language=source_language,
            blob_url=original_url  # Save Blob URL in the database
        )
        db.add(translated_subtitle)
        db.commit()

        # Save translation metadata in the translations table
        translation = Translation(
            translation_id=uuid4(),
            file_id=translated_subtitle.file_id,
            translated_file_id=translated_subtitle.file_id,
            target_language=target_language,
            translation_status="completed",
            requested_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            censor_profanity=censor_profanity,
            translation_cost=None,
            manual_edits_count=0,
            last_updated=user.user_id,
            last_edited_at=None,
            project_id=None,
            blob_url=translated_url
        )
        db.add(translation)
        db.commit()

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
            "target_language": target_language,
            "target_language_name": target_language_name,
            "original_file_url": original_url,
            "translated_file_url": translated_url,
            "message": "File uploaded, translated, and saved successfully."
        }

    except Exception as e:
        db.rollback()  # Rollback on error
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

# Initialize Azure Blob client
def get_blob_client():
    if not AZURE_STORAGE_CONNECTION_STRING:
        raise EnvironmentError("AZURE_STORAGE_CONNECTION_STRING not configured")
    return BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)

@router.post("/save-project")
async def save_project(
    request: Request,
    project_data: ProjectSaveRequest,
    db: Session = Depends(get_db)
):
    is_public = project_data.is_public

    try:
        # Get user from session
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Check for duplicate project names for this user (prevent duplicates)
        existing_project = db.query(TranslationProject).filter(
            and_(
                TranslationProject.user_id == user.user_id,
                TranslationProject.project_name == project_data.project_name
            )
        ).first()

        if existing_project:
            # If project exists and was created very recently (within 30 seconds),
            # consider it a duplicate request
            current_time = datetime.now(timezone.utc)

            # Ensure both datetimes are timezone-aware for comparison
            if existing_project.created_at.tzinfo is None:
                # If stored datetime is naive, assume it's UTC
                existing_created_at = existing_project.created_at.replace(tzinfo=timezone.utc)
            else:
                existing_created_at = existing_project.created_at

            time_diff = current_time - existing_created_at
            if time_diff.total_seconds() < 30:
                return JSONResponse(
                    status_code=409,
                    content={
                        "error": "Project with this name was recently saved. Please wait or use a different name.",
                        "existing_project_id": str(existing_project.project_id)
                    }
                )
            else:
                # Add timestamp to make name unique
                timestamp = current_time.strftime("%Y%m%d_%H%M%S")
                project_data.project_name = f"{project_data.project_name}_{timestamp}"

        # Validate that all files exist before proceeding
        missing_files = []
        for filename in project_data.filenames:
            if filename not in project_data.edited_files:
                # Check if original file exists
                local_file_path = os.path.join(temp_dir, filename)
                if not os.path.exists(local_file_path):
                    missing_files.append(filename)

        if missing_files:
            return JSONResponse(
                status_code=400,
                content={
                    "error": f"Files not found: {', '.join(missing_files)}. Please ensure translation is complete before saving."
                }
            )

        # Generate project ID
        project_id = uuid4()

        print(f"Starting project save: {project_data.project_name} with ID: {project_id}")
        print(f"Files to save: {len(project_data.filenames)}")
        print(f"Edited files: {len(project_data.edited_files)}")

        # Initialize Azure Blob client
        blob_client = get_blob_client()
        container_client = blob_client.get_container_client(AZURE_STORAGE_CONTAINER_NAME)

        # Create container if it doesn't exist
        try:
            container_client.create_container()
        except Exception:
            pass  # Container might already exist

        # Upload files to Azure Blob Storage
        uploaded_files = []
        for filename in project_data.filenames:
            try:
                # Check if this file has edited content
                if filename in project_data.edited_files:
                    # Use edited content instead of the original file
                    edited_content = project_data.edited_files[filename]

                    if not edited_content.strip():
                        print(f"Warning: Edited content for {filename} is empty")
                        continue

                    # Create blob path: projects/{project_id}/{filename}
                    blob_name = f"projects/{project_id}/{filename}"

                    # Upload edited content directly to blob storage
                    blob_client.get_blob_client(
                        container=AZURE_STORAGE_CONTAINER_NAME,
                        blob=blob_name
                    ).upload_blob(edited_content.encode('utf-8'), overwrite=True)

                    uploaded_files.append({
                        "filename": filename,
                        "blob_path": blob_name,
                        "size": len(edited_content.encode('utf-8')),
                        "is_edited": True
                    })
                    print(f"Uploaded edited file: {filename} ({len(edited_content)} chars)")
                else:
                    # Use original file from temp directory
                    local_file_path = os.path.join(temp_dir, filename)

                    if not os.path.exists(local_file_path):
                        print(f"Skipping missing file: {filename}")
                        continue

                    # Check if file is empty
                    if os.path.getsize(local_file_path) == 0:
                        print(f"Warning: File {filename} is empty")
                        continue

                    # Create blob path: projects/{project_id}/{filename}
                    blob_name = f"projects/{project_id}/{filename}"

                    # Upload file to blob storage
                    with open(local_file_path, "rb") as file_data:
                        blob_client.get_blob_client(
                            container=AZURE_STORAGE_CONTAINER_NAME,
                            blob=blob_name
                        ).upload_blob(file_data, overwrite=True)

                    uploaded_files.append({
                        "filename": filename,
                        "blob_path": blob_name,
                        "size": os.path.getsize(local_file_path),
                        "is_edited": False
                    })
                    print(f"Uploaded original file: {filename} ({os.path.getsize(local_file_path)} bytes)")
            except Exception as file_error:
                print(f"Error uploading file {filename}: {file_error}")
                # Continue with other files instead of failing completely
                continue

        # Verify we have files to save
        if not uploaded_files:
            return JSONResponse(
                status_code=400,
                content={"error": "No valid files were found to save. Please ensure translation is complete."}
            )

        # Handle original file upload (optional)
        if project_data.original_filename:
            try:
                # Look for original file in temp directory
                original_file_path = os.path.join(temp_dir, project_data.original_filename)

                if os.path.exists(original_file_path) and os.path.getsize(original_file_path) > 0:
                    # Upload original file to blob storage
                    original_blob_name = f"projects/{project_id}/original_{project_data.original_filename}"

                    with open(original_file_path, "rb") as file_data:
                        blob_client.get_blob_client(
                            container=AZURE_STORAGE_CONTAINER_NAME,
                            blob=original_blob_name
                        ).upload_blob(file_data, overwrite=True)

                    # Add original file to uploaded_files list
                    uploaded_files.append({
                        "filename": f"original_{project_data.original_filename}",
                        "blob_path": original_blob_name,
                        "size": os.path.getsize(original_file_path),
                        "is_original": True
                    })
                    print(f"Uploaded original file: {project_data.original_filename}")
            except Exception as orig_error:
                print(f"Warning: Could not upload original file: {orig_error}")
                # Don't fail the entire operation for original file issues

        # Get language names from the target_language codes
        target_language_names = []
        for lang_code in project_data.target_languages:
            lang_name = LANGUAGE_CODES.get(lang_code, lang_code)
            target_language_names.append(lang_name)

        # Create project metadata
        project_metadata = {
            "project_id": str(project_id),
            "project_name": project_data.project_name,
            "description": project_data.description,
            "original_filename": project_data.original_filename,
            "target_languages": project_data.target_languages,
            "target_language_names": target_language_names,
            "files": uploaded_files,
            "edited_files": list(project_data.edited_files.keys()) if project_data.edited_files else [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_id": str(user.user_id)
        }

        # Save metadata to blob storage
        metadata_blob_name = f"projects/{project_id}/metadata.json"
        metadata_json = json.dumps(project_metadata, indent=2)
        blob_client.get_blob_client(
            container=AZURE_STORAGE_CONTAINER_NAME,
            blob=metadata_blob_name
        ).upload_blob(metadata_json.encode('utf-8'), overwrite=True)

        # Use a database transaction to ensure atomicity
        try:
            # Save project to database FIRST
            project = TranslationProject(
                project_id=project_id,
                user_id=user.user_id,
                project_name=project_data.project_name,
                description=project_data.description,
                is_public=is_public,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(project)
            db.flush()  # This ensures the project is inserted before we reference it

            # Update the SubtitleFile records to link them to this project
            updated_files_count = 0
            for filename in project_data.filenames:
                subtitle_file = db.query(SubtitleFile).filter(
                    and_(
                        SubtitleFile.original_file_name == filename,
                        #SubtitleFile.user_id == user.user_id,
                        SubtitleFile.project_id.is_(None)  # Only update files not already assigned to a project
                    )
                ).first()

                if subtitle_file:
                    subtitle_file.project_id = project_id
                    updated_files_count += 1

                    # Also update the translation record
                    translation = db.query(Translation).filter(
                        and_(
                            Translation.translated_file_id == subtitle_file.file_id,
                            Translation.project_id.is_(None)  # Only update translations not already assigned
                        )
                    ).first()

                    if translation:
                        translation.project_id = project_id

            db.commit()  # Commit everything at once
            print(f"Database transaction completed. Updated {updated_files_count} files.")

            # 🔄 Save TranscriptionProject and Notification
            transcription_project = TranscriptionProject(
                project_id=project_id,
                user_id=user.user_id,
                status="Pending",
                created_at=datetime.now(timezone.utc),
                subtitle_file_url=uploaded_files[0]["blob_path"] if uploaded_files else None,
                media_url=None
            )
            db.add(transcription_project)
            db.flush()

            notification = Notification(
                user_id=user.user_id,
                project_id=project_id,
                project_status="Pending",
                creation_time=datetime.now(timezone.utc),
                message=f"Your project '{project_data.project_name}' has been created and is pending transcription.",
                is_read=False
            )
            db.add(notification)
            db.commit()
            print("TranscriptionProject and Notification saved successfully.")

        except Exception as db_error:
            db.rollback()
            print(f"Database error: {db_error}")
            # Try to clean up uploaded blobs if database save failed
            try:
                blob_list = container_client.list_blobs(name_starts_with=f"projects/{project_id}/")
                for blob in blob_list:
                    blob_client.get_blob_client(
                        container=AZURE_STORAGE_CONTAINER_NAME,
                        blob=blob.name
                    ).delete_blob()
            except Exception as cleanup_error:
                print(f"Blob cleanup error: {cleanup_error}")

            raise db_error

        print(f"Project save completed successfully: {project_data.project_name}")

        return {
            "success": True,
            "project_id": str(project_id),
            "project_name": project_data.project_name,
            "message": f"Project '{project_data.project_name}' saved successfully to Azure Blob Storage",
            "files_saved": len(uploaded_files),
            "blob_path": f"projects/{project_id}"
        }

    except Exception as e:
        db.rollback()
        print(f"Error saving project: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to save project: {str(e)}"}
        )

@router.get("/user-projects")
async def get_user_projects(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all projects for the authenticated user"""
    try:
        # Get user from session
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Get all projects for this user with related translation info
        projects = db.query(TranslationProject).filter(
            TranslationProject.user_id == user.user_id
        ).order_by(TranslationProject.created_at.desc()).all()

        project_list = []
        for project in projects:
            # Get translations count for this project
            translations_count = db.query(Translation).filter(
                Translation.project_id == project.project_id
            ).count()

            # Get subtitle files count for this project
            files_count = db.query(SubtitleFile).filter(
                SubtitleFile.project_id == project.project_id
            ).count()

            # Get languages used in this project
            languages_used = db.query(Translation.target_language).filter(
                Translation.project_id == project.project_id
            ).distinct().all()

            project_data = {
                "project_id": str(project.project_id),
                "project_name": project.project_name,
                "description": project.description,

                'is_public': project.is_public,

                "created_at": project.created_at.isoformat() if project.created_at else None,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
                "translations_count": translations_count,
                "files_count": files_count,
                # Convert language codes to names
                "languages": [
                    LANGUAGE_CODES.get(lang[0], lang[0])  # Get name from code, fallback to code
                    for lang in languages_used
                ] if languages_used else []
            }
            project_list.append(project_data)

        return {
            "projects": project_list,
            "total_count": len(project_list)
        }

    except Exception as e:
        print(f"Error fetching user projects: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch projects: {str(e)}"}
        )

@router.get("/project/{project_id}/files")
async def get_project_files(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all files for a specific project - accessible by owner or if public"""
    try:
        # Get user from session
        session_user = request.session.get("user")
        current_user = None
        if session_user and session_user.get("email"):
            current_user = db.query(User).filter(User.email == session_user["email"]).first()

        # Find the project - check if user owns it OR if it's public
        project = db.query(TranslationProject).filter(
            TranslationProject.project_id == project_id
        ).first()

        if not project:
            return JSONResponse(status_code=404, content={"error": "Project not found"})

        # Check access permissions
        has_access = False
        if current_user and project.user_id == current_user.user_id:
            has_access = True  # Owner has access
        elif project.is_public:
            has_access = True  # Public projects are accessible to everyone

        if not has_access:
            return JSONResponse(status_code=403, content={"error": "Access denied"})

        # Get all subtitle files for this project
        files = db.query(SubtitleFile).filter(
            SubtitleFile.project_id == project_id
        ).all()

        # Get translation info for each file
        file_list = []
        for file in files:
            translation = db.query(Translation).filter(
                Translation.translated_file_id == file.file_id
            ).first()

            file_data = {
                "file_id": str(file.file_id),
                "filename": file.original_file_name,
                "file_format": file.file_format,
                "file_size_bytes": file.file_size_bytes,
                "is_original": file.is_original,
                "source_language": file.source_language,
                "target_language": translation.target_language if translation else None,
                "translation_status": translation.translation_status if translation else None,
                "censor_profanity": translation.censor_profanity if translation else None
            }
            file_list.append(file_data)

        # Get project owner info
        owner = db.query(User).filter(User.user_id == project.user_id).first()

        return {
            "project": {
                "project_id": str(project.project_id),
                "project_name": project.project_name,
                "description": project.description,
                "is_public": project.is_public,
                "owner_name": owner.display_name if owner else "Unknown User",  # Use display_name
                "is_own_project": current_user.user_id == project.user_id if current_user else False,
                "created_at": project.created_at.isoformat() if project.created_at else None
            },
            "files": file_list,
            "total_files": len(file_list)
        }

    except Exception as e:
        print(f"Error fetching project files: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch project files: {str(e)}"}
        )
@router.delete("/project/{project_id}")
async def delete_project(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a project and all its associated files"""
    try:
        # Get user from session
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Verify project belongs to user
        project = db.query(TranslationProject).filter(
            TranslationProject.project_id == project_id,
            TranslationProject.user_id == user.user_id
        ).first()

        if not project:
            return JSONResponse(status_code=404, content={"error": "Project not found"})

        # Delete files from Azure Blob Storage
        try:
            blob_client = get_blob_client()
            container_client = blob_client.get_container_client(AZURE_STORAGE_CONTAINER_NAME)

            # List and delete all blobs in the project folder
            blob_list = container_client.list_blobs(name_starts_with=f"projects/{project_id}/")
            for blob in blob_list:
                blob_client.get_blob_client(
                    container=AZURE_STORAGE_CONTAINER_NAME,
                    blob=blob.name
                ).delete_blob()

        except Exception as blob_error:
            print(f"Warning: Failed to delete some blob files: {blob_error}")
            # Continue with database cleanup even if blob deletion fails

        # Delete related records from database (in correct order due to foreign keys)
        # 1. Delete translations
        db.query(Translation).filter(Translation.project_id == project_id).delete()

        # 2. Delete subtitle files
        db.query(SubtitleFile).filter(SubtitleFile.project_id == project_id).delete()

        # 3. Delete the project
        db.delete(project)

        db.commit()

        return {
            "success": True,
            "message": f"Project '{project.project_name}' and all associated files have been deleted successfully"
        }

    except Exception as e:
        db.rollback()
        print(f"Error deleting project: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to delete project: {str(e)}"}
        )

@router.get("/project/{project_id}/original")
async def get_project_original_file(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get the original file content for a project - accessible by owner or if public"""
    try:
        # Get user from session
        session_user = request.session.get("user")
        current_user = None
        if session_user and session_user.get("email"):
            current_user = db.query(User).filter(User.email == session_user["email"]).first()

        # Find the project and check access
        project = db.query(TranslationProject).filter(
            TranslationProject.project_id == project_id
        ).first()

        if not project:
            return JSONResponse(status_code=404, content={"error": "Project not found"})

        # Check access permissions
        has_access = False
        if current_user and project.user_id == current_user.user_id:
            has_access = True  # Owner has access
        elif project.is_public:
            has_access = True  # Public projects are accessible to everyone

        if not has_access:
            return JSONResponse(status_code=403, content={"error": "Access denied"})

        # Try to get original file from blob storage
        blob_client = get_blob_client()

        # Look for original file in the project folder
        container_client = blob_client.get_container_client(AZURE_STORAGE_CONTAINER_NAME)
        blobs = container_client.list_blobs(name_starts_with=f"projects/{project_id}/original_")

        original_blob = None
        for blob in blobs:
            original_blob = blob
            break

        if not original_blob:
            return JSONResponse(status_code=404, content={"error": "Original file not found"})

        # Download the original file content
        blob_client_instance = blob_client.get_blob_client(
            container=AZURE_STORAGE_CONTAINER_NAME,
            blob=original_blob.name
        )

        original_content = blob_client_instance.download_blob().readall().decode('utf-8')

        return {
            "original_content": original_content,
            "filename": original_blob.name.split('/')[-1]  # Get just the filename
        }

    except Exception as e:
        print(f"Error fetching original file: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch original file: {str(e)}"}
        )


@router.patch("/project/{project_id}/toggle-public")
async def toggle_project_public(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Toggle project public/private status"""
    try:
        # Get user from session
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Get request body
        body = await request.json()
        is_public = body.get("is_public", False)

        # Verify project belongs to user
        project = db.query(TranslationProject).filter(
            TranslationProject.project_id == project_id,
            TranslationProject.user_id == user.user_id
        ).first()

        if not project:
            return JSONResponse(status_code=404, content={"error": "Project not found"})

        # Update project visibility
        project.is_public = is_public
        project.updated_at = datetime.now(timezone.utc)

        db.commit()

        return {
            "success": True,
            "project_id": str(project.project_id),
            "is_public": project.is_public,
            "message": f"Project visibility updated to {'public' if is_public else 'private'}"
        }

    except Exception as e:
        db.rollback()
        print(f"Error updating project visibility: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to update project visibility: {str(e)}"}
        )

@router.get("/project/{project_id}/file/{filename}")
async def get_project_file(
    project_id: str,
    filename: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a specific file from project blob storage"""
    try:
        # Get user from session and verify project ownership
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Verify project belongs to user or is public
        project = db.query(TranslationProject).filter(
            TranslationProject.project_id == project_id
        ).filter(
            (TranslationProject.user_id == user.user_id) |
            (TranslationProject.is_public == True)
        ).first()

        if not project:
            return JSONResponse(status_code=404, content={"error": "Project not found"})

        # Get file from blob storage
        blob_client = get_blob_client()
        blob_name = f"projects/{project_id}/{filename}"

        try:
            blob_client_instance = blob_client.get_blob_client(
                container=AZURE_STORAGE_CONTAINER_NAME,
                blob=blob_name
            )

            file_content = blob_client_instance.download_blob().readall()

            # Return as streaming response
            return StreamingResponse(
                io.BytesIO(file_content),
                media_type="application/octet-stream",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )

        except Exception as blob_error:
            return JSONResponse(status_code=404, content={"error": "File not found in project storage"})

    except Exception as e:
        print(f"Error fetching project file: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch file: {str(e)}"}
        )


@router.head("/verify-file")
async def verify_file(filename: str = Query(...)):
    """Verify if a file exists in temp directory"""
    try:
        file_path = os.path.join(temp_dir, filename)
        if os.path.exists(file_path):
            return Response(status_code=200)
        else:
            return Response(status_code=404)
    except Exception:
        return Response(status_code=404)


@router.get("/public-projects")
async def get_public_projects(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all public projects from all users"""
    try:
        # Authentication is optional for public projects, but we'll check for current user
        # to potentially exclude their own projects from the public list
        current_user_id = None
        session_user = request.session.get("user")
        if session_user and session_user.get("email"):
            user = db.query(User).filter(User.email == session_user["email"]).first()
            if user:
                current_user_id = user.user_id

        # Get all public projects with user information
        query = db.query(TranslationProject, User.display_name).join(
            User, TranslationProject.user_id == User.user_id
        ).filter(
            TranslationProject.is_public == True
        ).order_by(TranslationProject.created_at.desc())

        projects_with_users = query.all()

        project_list = []
        for project, display_name in projects_with_users:
            # Get translations count for this project
            translations_count = db.query(Translation).filter(
                Translation.project_id == project.project_id
            ).count()

            # Get subtitle files count for this project
            files_count = db.query(SubtitleFile).filter(
                SubtitleFile.project_id == project.project_id
            ).count()

            # Get languages used in this project
            languages_used = db.query(Translation.target_language).filter(
                Translation.project_id == project.project_id
            ).distinct().all()

            project_data = {
                "project_id": str(project.project_id),
                "project_name": project.project_name,
                "description": project.description,
                "is_public": project.is_public,
                "owner_name": display_name or "Unknown User",  # Use display_name from User table
                "owner_id": str(project.user_id),
                "is_own_project": current_user_id == project.user_id if current_user_id else False,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
                "translations_count": translations_count,
                "files_count": files_count,
                "languages": [
                    LANGUAGE_CODES.get(lang[0], lang[0])
                    for lang in languages_used
                ] if languages_used else []
            }
            project_list.append(project_data)

        return {
            "projects": project_list,
            "total_count": len(project_list)
        }

    except Exception as e:
        print(f"Error fetching public projects: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch public projects: {str(e)}"}
        )

@router.get("/all-projects")
async def get_all_accessible_projects(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get user's own projects + all public projects"""
    try:
        # Get user from session
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})

        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})

        # Get all projects the user can access (their own + public ones)
        query = db.query(TranslationProject, User.display_name).join(
            User, TranslationProject.user_id == User.user_id
        ).filter(
            (TranslationProject.user_id == user.user_id) |  # User's own projects
            (TranslationProject.is_public == True)           # All public projects
        ).order_by(TranslationProject.created_at.desc())

        projects_with_users = query.all()

        project_list = []
        for project, display_name in projects_with_users:
            # Get translations count for this project
            translations_count = db.query(Translation).filter(
                Translation.project_id == project.project_id
            ).count()

            # Get subtitle files count for this project
            files_count = db.query(SubtitleFile).filter(
                SubtitleFile.project_id == project.project_id
            ).count()

            # Get languages used in this project
            languages_used = db.query(Translation.target_language).filter(
                Translation.project_id == project.project_id
            ).distinct().all()

            project_data = {
                "project_id": str(project.project_id),
                "project_name": project.project_name,
                "description": project.description,
                "is_public": project.is_public,
                "owner_name": display_name or "Unknown User",  # Use display_name
                "owner_id": str(project.user_id),
                "is_own_project": user.user_id == project.user_id,  # True if user owns this project
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
                "translations_count": translations_count,
                "files_count": files_count,
                "languages": [
                    LANGUAGE_CODES.get(lang[0], lang[0])
                    for lang in languages_used
                ] if languages_used else []
            }
            project_list.append(project_data)

        return {
            "projects": project_list,
            "total_count": len(project_list)
        }

    except Exception as e:
        print(f"Error fetching accessible projects: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch projects: {str(e)}"}
        )
