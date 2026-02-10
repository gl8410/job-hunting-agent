from sqlmodel import SQLModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, JSON

class ExperienceBlock(SQLModel, table=True):
    __tablename__ = "experience_blocks"

    id: Optional[int] = Field(default=None, primary_key=True)
    experience_name: str
    company: str
    role: str
    time_period: Optional[str] = None
    tags: List[str] = Field(default=[], sa_column=Column(JSON))
    tech_stack: List[str] = Field(default=[], sa_column=Column(JSON))

    # STAR format content
    content_star: Dict[str, str] = Field(
        default={},
        sa_column=Column(JSON)
    )  # {situation, task, action, result}

    # Optional perspectives
    perspectives: Optional[Dict[str, str]] = Field(
        default=None,
        sa_column=Column(JSON)
    )  # {leadership, technical}

    # Vector DB reference
    embedding_id: Optional[str] = None

    # User ownership
    user_email: str = Field(default="kd_0047@163.com", index=True)
