import os
import httpx
 
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from typing import Dict
 
from backend.database.models import SubtitleFile, User
from backend.database.models import Translation
from backend.database.models import TranslationProject
from backend.database.db import SessionLocal
from sqlalchemy.orm import Session
from datetime import datetime, timezone
 
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
 
router = APIRouter()
 
# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
 
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
 
@router.get("/me")
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Get current user profile information"""
    try:
        # Get user from session
        session_user = request.session.get("user")
        if not session_user or not session_user.get("email"):
            return JSONResponse(status_code=401, content={"error": "User not authenticated"})
 
        user_email = session_user["email"]
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})
 
        return {
            "user_id": str(user.user_id),
            "email": user.email,
            "display_name": user.display_name,  # Make sure this is display_name, not name
            "role": user.role,
            "credits": user.credits,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "is_2fa_enabled": user.is_2fa_enabled
        }
 
    except Exception as e:
        print(f"Error fetching user profile: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch user profile: {str(e)}"}
        )
 
@router.put("/profile")
async def update_user_profile(
    request: Request,
    db: Session = Depends(get_db)
):
    """Update user profile information"""
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
 
        # Update fields if provided
        if "display_name" in body:
            user.display_name = body["display_name"]
 
        if "email" in body:
            # Check if email is already taken by another user
            existing_user = db.query(User).filter(
                User.email == body["email"],
                User.user_id != user.user_id
            ).first()
            if existing_user:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Email already in use"}
                )
            user.email = body["email"]
 
        user.updated_at = datetime.now(timezone.utc)
 
        db.commit()
 
        # Return updated user data
        return {
            "user_id": str(user.user_id),
            "email": user.email,
            "display_name": user.display_name,
            "role": user.role,
            "credits": user.credits,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "is_2fa_enabled": user.is_2fa_enabled
        }
 
    except Exception as e:
        db.rollback()
        print(f"Error updating user profile: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to update profile: {str(e)}"}
        )