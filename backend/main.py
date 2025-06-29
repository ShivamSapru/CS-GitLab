# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router as api_router
from backend.api.auth import router as auth_router 
from backend.api.auth_email import router as email_auth_router 
from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv

# --- NEW ADDITIONS FOR DATABASE TABLE CREATION ---
from backend.database.db import create_db_tables # Import the table creation function
from backend.database import models # CRITICAL: Import your models to ensure Base.metadata discovers them

# Load environment variables (from project root .env or backend/.env based on your final decision)
# If using env_file in docker-compose.yml, this load_dotenv might not be strictly needed inside container
# but harmless for local dev.
# load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage', '.env'), override=True)

app = FastAPI(
    title="Subtitle Translator API",
    description="Translate .srt and .vtt subtitle files using Azure AI Translator.",
    version="1.0.0"
)
# --- Add startup event to create tables ---
@app.on_event("startup")
async def startup_event():
# Ensure all models are imported (done above with 'import backend.database.models')
# Then, call the function to create tables.
    create_db_tables()
    print("FastAPI application startup complete and database tables ensured.")


app.include_router(email_auth_router)

# Enable session middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key = os.getenv("SESSION_SECRET_KEY"), same_site = "lax", https_only = False)

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(api_router, prefix="/api")
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"message": "Subtitle Translator backend running."}

