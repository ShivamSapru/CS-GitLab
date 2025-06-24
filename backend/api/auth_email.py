from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from passlib.context import CryptContext
import uuid

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory user store (replace with DB later)
users_db = {}

# --- Request Models ---
class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# --- Register Endpoint ---
@router.post("/register")
async def register_user(data: RegisterRequest):
    if data.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = pwd_context.hash(data.password)
    users_db[data.email] = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "hashed_password": hashed_pw
    }

    return {"message": "Registration successful"}

# --- Login Endpoint ---
@router.post("/login")
async def login_user(request: Request, data: LoginRequest):
    user = users_db.get(data.email)
    if not user or not pwd_context.verify(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    request.session["user"] = {"email": user["email"]}
    return {"message": "Login successful", "user": {"email": user["email"]}}
