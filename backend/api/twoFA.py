from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import pyotp
from pydantic import BaseModel

from backend.database.models import User
from backend.database.db import get_db

router = APIRouter()

@router.get("/setup-2fa")
def setup_2fa(request: Request, db: Session = Depends(get_db)):
  session_user = request.session.get("user")

  if not session_user:
    return JSONResponse(status_code = 401, content = {"detial": "Unauthorised access"})
  
  user = db.query(User).filter(User.email == session_user["email"]).first()

  if not user:
    return JSONResponse(status_code = 404, content = {"detail": "User not found"})
  
  # Generate TOTP secret

  totp = pyotp.TOTP(pyotp.random_base32())
  uri = totp.provisioning_uri(name = user.email, issuer_name = "SubtitleTranslator")

  return {
    "provisioning_uri": uri,
    "secret": totp.secret  # Optional: frontend can show this for QR generation
  }

class Verify2FASetupRequest(BaseModel):
    otp: str
    secret: str

@router.post("/verify-2fa-setup")
def verify_2fa_setup(data: Verify2FASetupRequest, request: Request, db: Session = Depends(get_db)):
    session_user = request.session.get("user")
    if not session_user:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    user = db.query(User).filter(User.email == session_user["email"]).first()
    if not user:
        return JSONResponse(status_code=404, content={"detail": "User not found"})

    # Verify OTP
    totp = pyotp.TOTP(data.secret)
    if not totp.verify(data.otp):
        return JSONResponse(status_code=400, content={"detail": "Invalid OTP"})

    # Enable 2FA
    user.two_fa_secret = data.secret
    user.is_2fa_enabled = True
    db.commit()

    return {"message": "2FA enabled successfully"}

class Login2FARequest(BaseModel):
    otp: str

@router.post("/verify-2fa")
def verify_login_2fa(data: Login2FARequest, request: Request, db: Session = Depends(get_db)):
    session_user = request.session.get("user")
    if not session_user or "email" not in session_user:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    user = db.query(User).filter(User.email == session_user["email"]).first()
    if not user or not user.is_2fa_enabled or not user.two_fa_secret:
        return JSONResponse(status_code=400, content={"detail": "2FA not setup properly"})

    totp = pyotp.TOTP(user.two_fa_secret)
    if not totp.verify(data.otp):
        return JSONResponse(status_code=400, content={"detail": "Invalid OTP"})

    # ✅ OTP is valid, complete login
    request.session["user"] = {
        "email": user.email,
        "display_name": user.display_name,
        "user_id": str(user.user_id)
    }

    return {
        "message": "2FA verification successful",
        "user": {
            "user_id": str(user.user_id),
            "email": user.email,
            "display_name": user.display_name,
            "role": user.role,
            "credits": user.credits,
            "created_at": user.created_at.isoformat()
        }
    }

