from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CompanyAnalysis(BaseModel):
    establishTime: Optional[str] = None
    revenueModel: Optional[str] = None
    employeeCount: Optional[str] = None
    negativeNews: Optional[str] = None
    culture: Optional[str] = None
    seekerBrief: Optional[str] = None
    prospectAnalysis: Optional[str] = None
    riskAnalysis: Optional[str] = None
    rawSources: Optional[List[Dict[str, str]]] = None
    detailed_research_log: Optional[str] = None

class JobFromImages(BaseModel):
    images: List[str]  # List of base64 encoded strings
    language: Optional[str] = "en"
    url: Optional[str] = None  # Manually entered job link (can't be extracted from images)

class JobCreate(BaseModel):
    url: Optional[str] = None
    platform: str = "Unknown"
    title: str
    company: str
    department: Optional[str] = None
    recruiter_is_agency: bool = False
    hiring_client_description: Optional[str] = None
    location: Optional[str] = None
    description_markdown: Optional[str] = None
    description_raw: Optional[str] = None
    user_email: Optional[str] = None

    def __init__(self, **data):
        # Handle aliases for extension compatibility
        if 'description' in data and 'description_markdown' not in data:
            data['description_markdown'] = data['description']
        if 'html' in data and 'description_raw' not in data:
            data['description_raw'] = data['html']
        super().__init__(**data)

class JobUpdate(BaseModel):
    url: Optional[str] = None
    platform: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    recruiter_is_agency: Optional[bool] = None
    hiring_client_description: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    description_markdown: Optional[str] = None
    description_raw: Optional[str] = None
    salary_range: Optional[str] = None
    published_at: Optional[str] = None
    brief_description: Optional[str] = None
    company_analysis: Optional[CompanyAnalysis] = None
    key_skills: Optional[List[str]] = None
    matched_block_ids: Optional[List[str]] = None
    match_level: Optional[str] = None
    match_reasoning: Optional[str] = None
    match_advantages: Optional[List[str]] = None
    match_weaknesses: Optional[List[str]] = None
    generated_resume: Optional[str] = None
    resume_generated_at: Optional[datetime] = None
    generated_cover_letter: Optional[str] = None
    cover_letter_generated_at: Optional[datetime] = None
    selected_template_id: Optional[str] = None
    generated_content_lang: Optional[str] = None
    status: Optional[str] = None

class JobResponse(BaseModel):
    id: int
    url: Optional[str] = None
    platform: str
    title: str
    company: str
    recruiter_is_agency: bool = False
    hiring_client_description: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    description_markdown: Optional[str] = None
    description_raw: Optional[str] = None
    salary_range: Optional[str] = None
    published_at: Optional[str] = None
    brief_description: Optional[str] = None
    company_analysis: Optional[Dict[str, Any]] = None
    key_skills: Optional[List[str]] = None
    matched_block_ids: Optional[List[str]] = None
    match_level: Optional[str] = None
    match_reasoning: Optional[str] = None
    match_advantages: Optional[List[str]] = None
    match_weaknesses: Optional[List[str]] = None
    generated_resume: Optional[str] = None
    resume_generated_at: Optional[datetime] = None
    generated_cover_letter: Optional[str] = None
    cover_letter_generated_at: Optional[datetime] = None
    selected_template_id: Optional[str] = None
    generated_content_lang: Optional[str] = None
    status: str
    user_email: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class JobListItem(BaseModel):
    id: int
    title: str
    company: str
    status: str
    created_at: datetime
    updated_at: datetime
    platform: str
    user_email: str

    class Config:
        from_attributes = True

class PaginatedJobResponse(BaseModel):
    items: List[JobListItem]
    total: int
    counts: Dict[str, int]

class AnalysisResult(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    recruiter_is_agency: bool = False
    hiring_client_description: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    published_at: Optional[str] = None
    brief_description: Optional[str] = None
    keySkills: List[str]
    company_analysis: Optional[CompanyAnalysis] = None
