from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None

class User(BaseModel):
    id: str
    email: str
    role: Optional[str] = None