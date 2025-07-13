import os
import io
import httpx
import zipfile
import tempfile
import srt
import webvtt
import time
import json

from fastapi import APIRouter, UploadFile, File, Form, Query, Request, Depends
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from typing import Dict, Optional, List
from pydantic import BaseModel
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient

from backend.database.models import SubtitleFile, User
from backend.database.models import Translation
from backend.database.models import TranslationProject
from backend.database.db import SessionLocal
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime, timezone

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
            translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, s in enumerate(subtitles):
                s.content = translated[i]
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt.compose(subtitles))

        elif ext.lower() == ".vtt":
            vtt = webvtt.read(input_path)
            texts = [c.text for c in vtt.captions]
            translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, c in enumerate(vtt.captions):
                c.text = translated[i]
            vtt.save(output_path)

        else:
            raise ValueError("Unsupported file format. Please upload .srt or .vtt")

        # Saving the metadata of translated subtitle files in subtitle_files table
        # NOW WITH user_id included!
        translated_subtitle = SubtitleFile(
            file_id=uuid4(),
            # user_id=user.user_id,  # ADD THIS LINE - This was missing!
            project_id=None,
            original_file_name=output_filename,  # Store the translated filename
            storage_path=output_path,
            file_format=ext.lower().replace(".", ""),
            file_size_bytes=os.path.getsize(output_path),
            is_original=False,  # This is a translated file, not original
            source_language="auto",
            # created_at=datetime.now(timezone.utc),  # Set timestamps
            # updated_at=datetime.now(timezone.utc)   # Set timestamps
        )
        db.add(translated_subtitle)
        db.commit()

        # Saving the translated subtitle files metadata in translations table
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
            project_id=None
        )
        db.add(translation)
        db.commit()

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
            "target_language": target_language,
            "target_language_name": target_language_name,
            "message": "File uploaded, translated, and saved successfully."
        }

    except Exception as e:
        db.rollback()  # Add rollback on error
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

        # Generate project ID
        project_id = uuid4()

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
            local_file_path = os.path.join(temp_dir, filename)

            if not os.path.exists(local_file_path):
                return JSONResponse(
                    status_code=404,
                    content={"error": f"File {filename} not found"}
                )

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
                "size": os.path.getsize(local_file_path)
            })

        if project_data.original_filename:
            # Construct original file path (should be in temp_dir)
            original_file_path = None
            for filename in project_data.filenames:
                # Find the original filename pattern by removing translation markers
                if "Translated to" in filename:
                    # Extract original name from translated filename
                    original_name = filename.split(" (Translated to")[0] + ".srt"  # or .vtt
                    potential_path = os.path.join(temp_dir, original_name)
                    if os.path.exists(potential_path):
                        original_file_path = potential_path
                        break

            if original_file_path and os.path.exists(original_file_path):
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

        # Get language names from the target_language codes
        target_language_names = []
        for lang_code in project_data.target_languages:
            lang_name = LANGUAGE_CODES.get(lang_code, lang_code)  # Fallback to code if name not found
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
        for filename in project_data.filenames:
            subtitle_file = db.query(SubtitleFile).filter(
                SubtitleFile.original_file_name == filename,
                # SubtitleFile.user_id == user.user_id
            ).first()

            if subtitle_file:
                subtitle_file.project_id = project_id

                # Also update the translation record
                translation = db.query(Translation).filter(
                    Translation.translated_file_id == subtitle_file.file_id
                ).first()

                if translation:
                    translation.project_id = project_id

        db.commit()  # Commit everything at once

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
    """Get all files for a specific project"""
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
                # "created_at": file.created_at.isoformat() if file.created_at else None,
                "target_language": translation.target_language if translation else None,
                "translation_status": translation.translation_status if translation else None,
                "censor_profanity": translation.censor_profanity if translation else None
            }
            file_list.append(file_data)

        return {
            "project": {
                "project_id": str(project.project_id),
                "project_name": project.project_name,
                "description": project.description,

                "is_public": project.is_public,

                # "created_at": project.created_at.isoformat() if project.created_at else None
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
    """Get the original file content for a project from Azure Blob Storage"""
    try:
        # Get user from session and verify project ownership
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
