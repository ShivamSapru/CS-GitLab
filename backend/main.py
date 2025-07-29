# backend/main.py
import os
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from backend.database.db import SessionLocal
from backend.database.models import User

# CRITICAL: Load environment variables FIRST, before any other imports
# This ensures DATABASE_URL is available when models.py imports db.py
load_dotenv()

# Verify DATABASE_URL is loaded
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOSTNAME = os.getenv("POSTGRES_HOSTNAME")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")

FRONTEND_URL = os.getenv("FRONTEND_URL")

# DATABASE_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOSTNAME}:{POSTGRES_PORT}/{POSTGRES_DB}"

if not POSTGRES_DB or not POSTGRES_USER or not POSTGRES_PASSWORD or not POSTGRES_HOSTNAME or not POSTGRES_PORT:
    raise ValueError("One or more required PostgreSQL environment variables are missing. Please check your .env file or system environment.")

# if not os.getenv("DATABASE_URL"):
#     raise ValueError("DATABASE_URL not found in environment variables")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# Now import your modules AFTER environment is loaded
# from backend.api.routes import router as api_router
from backend.api.health import router as health_router
from backend.api.translation import router as translation_router
from backend.api.transcription import router as transcription_router

from backend.api.auth import router as auth_router
from backend.api.auth_email import router as email_auth_router
from backend.database.db import create_db_tables
from backend.database import models
from backend.api.twoFA import router as two_fa_router

app = FastAPI(
    title="Subtitle Translator API",
    description="Translate .srt and .vtt subtitle files using Azure AI Translator.",
    version="1.0.0"
)

#Scheduler
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

scheduler.add_job(reset_user_credits, CronTrigger(hour=0, minute=0))
scheduler.start()

@app.on_event("startup")
async def startup_event():
    create_db_tables()
    print("FastAPI application startup complete and database tables ensured.")

# Add session middleware

if FRONTEND_URL and "https" in FRONTEND_URL:
    same_site_value = "none"
    https_only_value = True
else:
    same_site_value = "lax"
    https_only_value = False

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY"),
    same_site=same_site_value,
    https_only=https_only_value
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# app.include_router(api_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(translation_router, prefix="/api")
app.include_router(transcription_router, prefix="/api")
app.include_router(email_auth_router)
app.include_router(auth_router)
app.include_router(two_fa_router)

@app.get("/")
def read_root():
    return {"message": "Subtitle Translator backend running."}
