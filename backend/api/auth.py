# backend/api/auth.py
from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from sqlalchemy.orm import Session
from backend.database.models import User
from backend.database.db import SessionLocal
from datetime import datetime
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
    # Use BACKEND_URL instead of VITE_BACKEND_URL to match your .env
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    redirect_uri = f"{backend_url}/auth/callback"
    print(f"OAuth redirect URI: {redirect_uri}")  # Debug log
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/auth/callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    try:
        print("Processing OAuth callback...")  # Debug log
        token = await oauth.google.authorize_access_token(request)
        userinfo = token["userinfo"]
        print(f"Received userinfo: {userinfo.get('email')}")  # Debug log

        user = db.query(User).filter(User.email == userinfo["email"]).first()

        if not user:
            print("Creating new user...")  # Debug log
            # Create new user in DB
            new_user = User(
                user_id=uuid.uuid4(),  # Ensure UUID is generated
                email=userinfo["email"],
                display_name=userinfo.get("name", userinfo["email"].split("@")[0]),
                password_hash="",  # empty since OAuth
                role="user",
                credits=5,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                last_login=datetime.utcnow()
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user
        else:
            print("Updating existing user...")  # Debug log
            # Update last login for existing users
            user.last_login = datetime.utcnow()
            db.commit()

        # Store session data - OAuth users get user_id immediately if no 2FA setup
        session_data = {
            "email": user.email,
            "display_name": user.display_name
        }

        # If user doesn't have 2FA enabled, they can get user_id right away
        if not user.is_2fa_enabled:
            session_data["user_id"] = str(user.user_id)

        request.session["user"] = session_data
        print(f"Session data stored: {session_data}")  # Debug log

        return RedirectResponse(
            url=f"{frontend_url}/dashboard?auth=success",
            status_code=302
        )

    except Exception as e:
        print(f"OAuth Error: {e}")  # Debug log
        import traceback
        traceback.print_exc()

        return RedirectResponse(
            url=f"{frontend_url}/dashboard?auth=error&message={str(e)}",
            status_code=302
        )

@router.get("/me")
async def me(request: Request, db: Session = Depends(get_db)):
    session_user = request.session.get("user")
    print(f"Session user: {session_user}")  # Debug log

    if not session_user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)

    user = db.query(User).filter(User.email == session_user["email"]).first()
    if not user:
        return JSONResponse({"error": "User not found in database"}, status_code=404)

    has_user_id_in_session = "user_id" in session_user
    print(f"User 2FA enabled: {user.is_2fa_enabled}, Has user_id in session: {has_user_id_in_session}")  # Debug log

    # If user has not enabled 2FA, inform frontend
    if not user.is_2fa_enabled:
        response_data = {
            "setup_2fa_required": True,
            "email": user.email,
            "display_name": user.display_name,
            "role": user.role,
            "credits": user.credits,
            "created_at": user.created_at.isoformat()
        }
        # For OAuth users without 2FA, they already have user_id
        if has_user_id_in_session:
            response_data["user_id"] = str(user.user_id)
            response_data["last_login"] = user.last_login.isoformat() if user.last_login else None
        return response_data

    # If 2FA is enabled but not yet verified in session
    if user.is_2fa_enabled and not has_user_id_in_session:
        return {
            "twofa_required": True,
            "email": user.email,
            "display_name": user.display_name
        }

    # Fully authenticated user
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
    print("Logging out user...")  # Debug log
    print(f"Session before logout: {dict(request.session)}")  # Debug log

    # Clear the entire session
    request.session.clear()

    print(f"Session after logout: {dict(request.session)}")  # Debug log
    return JSONResponse({"message": "Logged out successfully"})
