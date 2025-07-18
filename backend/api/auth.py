from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from sqlalchemy.orm import Session
from database.models import User
from database.db import SessionLocal
from datetime import datetime, timezone
import uuid
import os

router = APIRouter()

# OAuth Setup
config = Config('.env')
oauth = OAuth(config)

oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/login")
async def login(request: Request):
    redirect_uri = os.getenv("BACKEND_URL") + "/auth/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/auth/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        userinfo = token["userinfo"]

        db = SessionLocal()
        user = db.query(User).filter(User.email == userinfo["email"]).first()

        if not user:
            # Create new user in DB
            new_user = User(
                email=userinfo["email"],
                display_name=userinfo.get("name", userinfo["email"].split("@")[0]),
                password_hash="",  # empty since OAuth
                role="user",
                credits=10,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                last_login=datetime.now(timezone.utc)
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user

        # ✅ Store user_id in session
        request.session["user"] = {
            "email": user.email,
            "display_name": user.display_name,
            "user_id": str(user.user_id)
        }

        return RedirectResponse(os.getenv("FRONTEND_URL"))

    except Exception as e:
        print("OAuth Error:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/me")
async def me(request: Request, db: Session = Depends(get_db)):
    session_user = request.session.get("user")
    if not session_user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)

    user = db.query(User).filter(User.email == session_user["email"]).first()
    if not user:
        return JSONResponse({"error": "User not found in database"}, status_code=404)

    return {
        "user_id": str(user.user_id),
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
        "credits": user.credits,
        "created_at": user.created_at.isoformat(),
        "last_login": user.last_login.isoformat() if user.last_login else None
    }

@router.get("/logout")
async def logout(request: Request):
    request.session.pop('user', None)
    return JSONResponse({"message": "Logged out"})
