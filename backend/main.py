from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from api.routes import router as api_router
from backend.api.routes import router as api_router
from api.auth import router as auth_router
from starlette.middleware.sessions import SessionMiddleware
import os
from api.auth_email import router as email_auth_router
from dotenv import load_dotenv

# Load environment variables from the .env file located in the storage directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'storage', '.env'))

app = FastAPI(
    title="Subtitle Translator API",
    description="Translate .srt and .vtt subtitle files using Azure AI Translator.",
    version="1.0.0"
)

app.include_router(email_auth_router)

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
app.include_router(api_router, prefix="/api")
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"message": "Subtitle Translator backend running."}
