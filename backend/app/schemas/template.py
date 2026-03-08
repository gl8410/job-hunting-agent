from pydantic import BaseModel
from typing import Optional

class TemplateCreate(BaseModel):
    name: str
    description: str
    style: str  # modern, classic, creative
    template_content: Optional[str] = None
    cover_letter_content: Optional[str] = None

class TemplateResponse(BaseModel):
    id: int
    name: str
    description: str
    style: str
    template_content: Optional[str] = None
    cover_letter_content: Optional[str] = None

    class Config:
        from_attributes = True

