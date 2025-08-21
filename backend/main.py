# backend/main.py
import os
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.database.db import SessionLocal
from backend.database.models import User, TranscriptionProject, Notification
from azure.storage.blob import BlobServiceClient

# CRITICAL: Load environment variables FIRST, before any other imports
load_dotenv()

# Verify required environment variables
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOSTNAME = os.getenv("POSTGRES_HOSTNAME")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
FRONTEND_URL = os.getenv("FRONTEND_URL")
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")

if not POSTGRES_DB or not POSTGRES_USER or not POSTGRES_PASSWORD or not POSTGRES_HOSTNAME or not POSTGRES_PORT:
    raise ValueError("One or more required PostgreSQL environment variables are missing. Please check your .env file or system environment.")

if not SESSION_SECRET_KEY:
    raise ValueError("SESSION_SECRET_KEY is required but not found in environment variables")

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_BLOB_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
TRANSCRIPTION_PROJECTS_FOLDER = os.getenv("TRANSCRIPTION_PROJECTS_FOLDER")

def delete_blob(self, blob_service_client: BlobServiceClient, container_name: str, blob_name: str):
    blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
    blob_client.delete_blob()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# Import your modules AFTER environment is loaded
from backend.api.health import router as health_router
from backend.api.translation import router as translation_router
from backend.api.transcription import router as transcription_router
from backend.api.auth import router as auth_router
from backend.api.auth_email import router as email_auth_router
from backend.database.db import create_db_tables
from backend.database import models
from backend.api.twoFA import router as two_fa_router
from backend.api.profile import router as profile_router
from backend.api.library import router as  library_router

app = FastAPI(
    title="Subtitle Translator API",
    description="Translate .srt and .vtt subtitle files using Azure AI Translator.",
    version="1.0.0"
)

# Scheduler
scheduler = BackgroundScheduler()

def reset_user_credits():
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            user.credits = 5  # Reset credits to 5
            db.commit()
        print("User credits reset.")
    except Exception as e:
        print(f"Error resetting user credits: {e}")
    finally:
        db.close()

# --- Azure helpers ---
def delete_blob_prefix(blob_service: BlobServiceClient, container: str, prefix: str) -> int:
    """
    Delete all blobs whose names start with `prefix`. Returns count deleted.
    """
    container_client = blob_service.get_container_client(container)
    to_delete = [b.name for b in container_client.list_blobs(name_starts_with=prefix)]
    if not to_delete:
        return 0
    # Delete sequentially; you can also batch if desired
    for name in to_delete:
        container_client.delete_blob(name)
    return len(to_delete)

def delete_transcription_project():
    """
    Delete transcription_projects rows whose created_at is older than 54 hours,
    cascade-delete related notifications, and remove blobs under the project prefix.
    """
    db: Session = SessionLocal()
    try:
        # Use UTC to compare against TIMESTAMP
        cutoff = datetime.now(timezone.utc) - timedelta(hours=54)

        # Load all projects to be deleted
        projects = (
            db.query(TranscriptionProject)
              .filter(TranscriptionProject.created_at < cutoff)
              .all()
        )
        if not projects:
            print("Transcription projects cleanup: nothing to delete.")
            return

        project_ids = [p.project_id for p in projects]

        # Prepare Azure client once
        try:
            blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        except Exception as azure_init_err:
            blob_service = None
            print(f"Azure init failed (will skip blob deletes): {azure_init_err}")

        total_blob_deletes = 0
        for p in projects:
            # Delete all blobs under this project's prefix (e.g., 'transcriptions/<project_id>/...')
            if blob_service:
                try:
                    prefix = f"{TRANSCRIPTION_PROJECTS_FOLDER}/{p.project_id}"
                    total_blob_deletes += delete_blob_prefix(blob_service, AZURE_BLOB_CONTAINER, prefix)
                except Exception as azure_error:
                    print(f"Azure delete failed for project {p.project_id}: {azure_error}")

        # Delete dependent rows first (Notifications), then the projects
        db.query(Notification).filter(Notification.project_id.in_(project_ids)).delete(synchronize_session=False)
        deleted_count = (
            db.query(TranscriptionProject)
              .filter(TranscriptionProject.project_id.in_(project_ids))
              .delete(synchronize_session=False)
        )

        db.commit()
        print(f"Transcription projects cleanup: deleted {deleted_count} DB rows; removed {total_blob_deletes} blobs.")
    except Exception as e:
        db.rollback()
        print(f"Error deleting old transcription projects: {e}")
    finally:
        db.close()

scheduler.add_job(reset_user_credits, CronTrigger(hour=0, minute=0))  # daily at 00:00
scheduler.add_job(delete_transcription_project, CronTrigger(minute=0))  # hourly at HH:00
scheduler.start()

@app.on_event("startup")
async def startup_event():
    create_db_tables()
    print("FastAPI application startup complete and database tables ensured.")

# CRITICAL: Session middleware MUST come BEFORE CORS middleware
# Determine session settings based on environment
is_production = FRONTEND_URL and "https" in FRONTEND_URL
same_site_setting = "none" if is_production else "lax"
https_only_setting = is_production

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    max_age=86400,  # 24 hours
    same_site=same_site_setting,
    https_only=https_only_setting
)

# CORS Configuration - Allow multiple origins for development
allowed_origins = []

# Add production frontend URL if it exists
if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)

# Add development origins
development_origins = [
    "http://localhost:3000",  # React dev server
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:3000",  # Alternative localhost
    "http://127.0.0.1:5173",  # Alternative localhost
]

# Add development origins if not in production
if not is_production:
    allowed_origins.extend(development_origins)

print(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # CRITICAL for session cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]  # Allow frontend to access response headers
)

# Include routers
app.include_router(health_router, prefix="/api")
app.include_router(translation_router, prefix="/api")
app.include_router(transcription_router, prefix="/api")
app.include_router(email_auth_router)
app.include_router(auth_router)
app.include_router(two_fa_router)
app.include_router(profile_router, prefix="/api")
app.include_router(library_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Subtitle Translator backend running."}

# Add a debug endpoint to check session status
@app.get("/debug/session")
def debug_session(request):
    return {
        "session_data": dict(request.session),
        "has_session": bool(request.session),
        "frontend_url": FRONTEND_URL,
        "is_production": is_production
    }
