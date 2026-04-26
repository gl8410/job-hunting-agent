from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.job import JobOpportunity
from app.services.scraper_service import clean_html
from app.models.user import Profile
from pydantic import BaseModel
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

class IngestRequest(BaseModel):
    url: str
    html: str
    user_email: str = "kd_0047@163.com"

from fastapi import BackgroundTasks
from app.api.v1.jobs import analyze_job

@router.post("/ingest")
async def ingest_job(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user)
):
    current_user_email = current_user.email
    logger.info(f"Ingesting job from URL: {request.url}")
    # Check if job already exists for this user
    statement = select(JobOpportunity).where(
        JobOpportunity.url == request.url,
        JobOpportunity.user_email == current_user_email
    )
    existing_job = session.exec(statement).first()
    
    if existing_job:
        logger.info(f"Job already exists for user: {current_user_email}")
        return {"message": "Job already exists", "id": existing_job.id}
    
    # Clean HTML (basic)
    # cleaned_text = clean_html(request.html) # Store raw for now, clean later or store both
    
    # Ingest requires minimal info, title/company will be analyzed later
    job = JobOpportunity(
        url=request.url,
        title="Unknown Title", # Will be updated by analyer
        company="Unknown Company", # Will be updated by analyzer
        description_raw=request.html,
        user_email=current_user_email,
        status="NEW"
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    logger.info(f"Successfully ingested job {job.id}")
    
    # Trigger auto-analysis in background
    background_tasks.add_task(
        analyze_job,
        job_id=job.id,
        accept_language="en", # Default to English, could be passed from extension
        current_user=current_user,
        db=session
    )
    
    return {"message": "Job ingested successfully", "id": job.id}
