from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from passlib.context import CryptContext
from database.models import User
from database.db import SessionLocal
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Pydantic Request Models ---
class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Register Endpoint ---
@router.post("/register")
async def register_user(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = pwd_context.hash(data.password)

    new_user = User(
        user_id=uuid.uuid4(),
        email=data.email,
        display_name=data.email.split('@')[0],
        password_hash=hashed_pw,
        role="user",
        credits=10,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "Registration successful"}

# --- Login Endpoint ---
@router.post("/login")
async def login_user(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    request.session["user"] = {"email": user.email}
    return {"message": "Login successful", "user": {"email": user.email}}
