from sqlmodel import SQLModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy import Column, JSON

class JobOpportunity(SQLModel, table=True):
    __tablename__ = "job_opportunities"

    id: Optional[int] = Field(default=None, primary_key=True)
    url: Optional[str] = Field(default=None, index=True)
    platform: str = Field(default="Unknown")
    title: str
    company: str
    department: Optional[str] = None
    location: Optional[str] = None

    # Agency/Recruiter handling
    recruiter_is_agency: bool = Field(default=False)
    hiring_client_description: Optional[str] = None

    # Raw content
    description_markdown: Optional[str] = None
    description_raw: Optional[str] = None

    # Parsed data (Agent A - Parser)
    salary_range: Optional[str] = None
    published_at: Optional[str] = None
    brief_description: Optional[str] = None

    # Company analysis (Agent B - Detective)
    company_analysis: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    tavily_results: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

    # RAG matching results (Agent C - Consultant)
    key_skills: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    matched_block_ids: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    match_level: Optional[str] = None  # Low, Medium, Good
    match_reasoning: Optional[str] = None
    match_advantages: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    match_weaknesses: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))

    # Generated content (Agent D - Writer)
    generated_resume: Optional[str] = None
    resume_generated_at: Optional[datetime] = None
    generated_cover_letter: Optional[str] = None
    cover_letter_generated_at: Optional[datetime] = None
    selected_template_id: Optional[str] = None
    generated_content_lang: Optional[str] = Field(default=None) # en, zh, etc.

    # Status tracking
    status: str = Field(default="NEW")  # NEW, ANALYZED, DRAFTING, APPLIED, INTERVIEW, REJECTED

    # User ownership
    user_email: str = Field(default="kd_0047@163.com", index=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
