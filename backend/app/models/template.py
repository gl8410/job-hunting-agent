from sqlmodel import SQLModel, Field
from typing import Optional

class ResumeTemplate(SQLModel, table=True):
    __tablename__ = "resume_templates"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str
    style: str  # modern, classic, creative
    template_content: Optional[str] = None  # Template structure/format
    
    # User ownership
    user_email: str = Field(default="kd_0047@163.com", index=True)

