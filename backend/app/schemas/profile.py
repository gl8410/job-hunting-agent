from pydantic import BaseModel
from typing import Optional, List, Dict

class STARContent(BaseModel):
    situation: str
    task: str
    action: str
    result: str

class Perspectives(BaseModel):
    leadership: Optional[str] = None
    technical: Optional[str] = None

class ExperienceBlockCreate(BaseModel):
    experience_name: str
    company: str
    role: str
    time_period: Optional[str] = None
    tags: List[str] = []
    tech_stack: List[str] = []
    content_star: Dict[str, str]
    perspectives: Optional[Dict[str, str]] = None

class ExperienceBlockUpdate(BaseModel):
    experience_name: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    time_period: Optional[str] = None
    tags: Optional[List[str]] = None
    tech_stack: Optional[List[str]] = None
    content_star: Optional[Dict[str, str]] = None
    perspectives: Optional[Dict[str, str]] = None

class ExperienceBlockResponse(BaseModel):
    id: int
    experience_name: str
    company: str
    role: str
    time_period: Optional[str] = None
    tags: List[str]
    tech_stack: List[str]
    content_star: Dict[str, str]
    perspectives: Optional[Dict[str, str]] = None

    class Config:
        from_attributes = True

