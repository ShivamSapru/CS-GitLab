from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from api.auth import router as auth_router
from api.db_health import router as db_router
from api.auth_email import router as email_auth_router

# from api.routes import router as api_router
from api.translation import router as translation_router
from api.transcription import router as transcription_router
from api.health import router as health_router

import os

app = FastAPI(
    title="Subtitle Translator API",
    description="Translate .srt and .vtt subtitle files using Azure AI Translator.",
    version="1.0.0"
)

# Enable session middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key = os.getenv("SESSION_SECRET_KEY"), same_site = "lax", https_only = False)

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth_router)
app.include_router(db_router)
app.include_router(email_auth_router)

# app.include_router(api_router, prefix="/api")
app.include_router(health_router)
app.include_router(translation_router)
app.include_router(transcription_router)

@app.get("/")
def read_root():
    return {"message": "Subtitle Translator backend running."}
