import os
import io
import httpx
import zipfile
import tempfile
import srt
import webvtt
import time
import json
 
from fastapi import APIRouter, Query, Request, Depends, Response
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Dict
 
from backend.database.models import SubtitleFile, User
from backend.database.models import Translation
from backend.database.models import TranslationProject
from backend.database.db import SessionLocal
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient
 
# Environment variables
AZURE_TRANSLATOR_LANGUAGES = os.getenv("AZURE_TRANSLATOR_LANGUAGES")
AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_TRANSLATOR_KEY = os.getenv("AZURE_TRANSLATOR_KEY")
AZURE_TRANSLATOR_REGION = os.getenv("AZURE_TRANSLATOR_REGION")
 
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER_NAME = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "subtitle-projects")
TRANSLATION_PROJECTS_FOLDER = os.getenv("TRANSLATION_PROJECTS_FOLDER")
 
MAX_CHAR_LIMIT = 20000
 
if not AZURE_TRANSLATOR_KEY or not AZURE_TRANSLATOR_REGION:
    raise EnvironmentError("Missing Azure Translator credentials.")
 
router = APIRouter()
temp_dir = tempfile.mkdtemp()
 
# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
 
def get_blob_client():
    connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string:
        raise EnvironmentError("AZURE_STORAGE_CONNECTION_STRING not configured")
    return BlobServiceClient.from_connection_string(connection_string)
 
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
   
LANGUAGE_CODES = fetch_language_codes()
 
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
            blob_list = container_client.list_blobs(name_starts_with=f"{TRANSLATION_PROJECTS_FOLDER}/{project_id}/")
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