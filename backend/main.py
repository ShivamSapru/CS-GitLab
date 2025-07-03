# backend/main.py
import os
from dotenv import load_dotenv

# CRITICAL: Load environment variables FIRST, before any other imports
# This ensures DATABASE_URL is available when models.py imports db.py
load_dotenv()

# Verify DATABASE_URL is loaded
if not os.getenv("DATABASE_URL"):
    raise ValueError("DATABASE_URL not found in environment variables")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import utc

# Now import your modules AFTER environment is loaded
from backend.api.routes import router as api_router
from backend.api.auth import router as auth_router
from backend.api.auth_email import router as email_auth_router
from backend.database.db import create_db_tables
from backend.database import models
from backend.api.twoFA import router as two_fa_router
from backend.utils.scheduler import reset_user_credits

app = FastAPI(
    title="Subtitle Translator API",
    description="Translate .srt and .vtt subtitle files using Azure AI Translator.",
    version="1.0.0"
)

scheduler = BackgroundScheduler(timezone=utc)
scheduler.add_job(reset_user_credits, 'cron', hour=0, minute=0)
scheduler.start()

@app.on_event("startup")
async def startup_event():
    create_db_tables()
    print("FastAPI application startup complete and database tables ensured.")

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()
    print("Scheduler shut down.")

# Add session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY"),
    same_site="lax",
    https_only=False
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(email_auth_router)
app.include_router(api_router, prefix="/api")
app.include_router(auth_router)
app.include_router(two_fa_router)

@app.get("/")
def read_root():
    return {"message": "Subtitle Translator backend running."}
