from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    role: Optional[str] = "user"
    credits: Optional[int] = 0


class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    user_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True