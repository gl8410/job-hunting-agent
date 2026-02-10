import uuid
from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import computed_field

class Profile(SQLModel, table=True):
    """User Profile (maps to Supabase public.profiles)"""
    __tablename__ = "profiles"

    id: uuid.UUID = Field(primary_key=True)
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    # Credits or other business logic fields
    subscription_credits: int = Field(default=0)
    topup_credits: int = Field(default=0)

    @computed_field
    def credits(self) -> int:
        return self.subscription_credits + self.topup_credits