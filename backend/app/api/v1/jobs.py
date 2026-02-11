"""
Job API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.job import JobOpportunity
from app.models.profile import ExperienceBlock
from app.models.user import Profile
from app.schemas.job import JobCreate, JobUpdate, JobResponse, AnalysisResult
from app.services.parser_service import parse_job_description, extract_job_metadata, clean_html_to_markdown
from app.services.research_service import research_company
from app.services.writer_service import generate_resume, generate_cover_letter
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    skip: int = 0,
    limit: int = 100,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all jobs"""
    current_user_email = current_user.email
    statement = select(JobOpportunity).where(JobOpportunity.user_email == current_user_email).offset(skip).limit(limit)
    jobs = db.exec(statement).all()
    return jobs

@router.post("/jobs", response_model=JobResponse)
async def create_job(
    job: JobCreate,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new job"""
    current_user_email = current_user.email
    job_data = job.model_dump()
    job_data['user_email'] = current_user_email
    db_job = JobOpportunity(**job_data)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific job"""
    current_user_email = current_user.email
    job = db.get(JobOpportunity, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to access this job")
    return job

@router.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_update: JobUpdate,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a job"""
    current_user_email = current_user.email
    job = db.get(JobOpportunity, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")
    
    update_data = job_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)
    
    job.updated_at = datetime.utcnow()
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: int,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a job"""
    current_user_email = current_user.email
    job = db.get(JobOpportunity, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")
    
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}

@router.post("/jobs/{job_id}/analyze", response_model=JobResponse)
async def analyze_job(
    job_id: int,
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trigger AI analysis for a job (Parsing only)
    
    - Agent A: Parse job description
    Note: Match (Agent C) and Research (Agent B) are separate manual steps.
    """
    current_user_email = current_user.email
    job = db.get(JobOpportunity, job_id)
    if not job:
        logger.warning(f"Job not found for analysis: {job_id}")
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to analyze this job")
    
    logger.info(f"Triggering analysis for job {job_id}: {job.title}")
    # Agent A: Parse job description
    # If markdown is missing OR if we have raw HTML, prefer re-cleaning from raw for best quality
    if job.description_raw:
        job.description_markdown = clean_html_to_markdown(job.description_raw)
    
    if job.description_markdown:
        # Extract language from header
        lang = "en"
        if accept_language:
            first_lang = accept_language.split(',')[0].split('-')[0].lower()
            if first_lang in ["zh", "en"]:
                lang = first_lang

        parsed_data = await parse_job_description(job.description_markdown, language=lang)
        job.salary_range = parsed_data.get("salary_range")
        job.published_at = parsed_data.get("published_at")
        job.key_skills = parsed_data.get("key_skills", [])
        
        # New fields reinjected
        if parsed_data.get("title"):
             job.title = parsed_data.get("title")
        if parsed_data.get("company"):
             job.company = parsed_data.get("company")
        
        job.department = parsed_data.get("department")
        job.location = parsed_data.get("location")
        job.brief_description = parsed_data.get("brief_description")
    
    
    # Update status
    job.status = "ANALYZED"
    job.updated_at = datetime.utcnow()
    
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Successfully analyzed job {job_id}")
    return job

@router.post("/jobs/{job_id}/research-company", response_model=JobResponse)
async def research_job_company(
    job_id: int,
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger company research for a job (Agent B)
    
    This is separated from job analysis to avoid duplicate research for jobs from the same company
    """
    current_user_email = current_user.email
    job = db.get(JobOpportunity, job_id)
    if not job:
        logger.warning(f"Job not found for research: {job_id}")
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to research this job")
    
    if not job.company:
        logger.warning(f"Company name missing for job {job_id}")
        raise HTTPException(status_code=400, detail="Job must have a company name to research")
    
    logger.info(f"Triggering research for job {job_id}: {job.company}")
    
    # Extract language from header (e.g., "zh-CN,zh;q=0.9,en;q=0.8" -> "zh")
    lang = "en"
    if accept_language:
        first_lang = accept_language.split(',')[0].split('-')[0].lower()
        if first_lang in ["zh", "en"]:
            lang = first_lang

    # Agent B: Research company
    analysis_data = await research_company(job.company, language=lang)
    # Extract raw search results if present
    if "tavily_raw_results" in analysis_data:
        job.tavily_results = analysis_data.pop("tavily_raw_results")
    job.company_analysis = analysis_data
    
    job.updated_at = datetime.utcnow()
    
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Successfully researched company for job {job_id}")
    return job

@router.post("/jobs/{job_id}/generate-resume", response_model=JobResponse)
async def generate_job_resume(
    job_id: int,
    template_id: int = None,
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate tailored resume for a job (Agent D)
    """
    current_user_email = current_user.email
    job = db.get(JobOpportunity, job_id)
    if not job:
        logger.warning(f"Job not found for resume generation: {job_id}")
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to generate resume for this job")
    
    logger.info(f"Generating resume for job {job_id}")

    # Extract language from header
    lang = "en"
    if accept_language:
        first_lang = accept_language.split(',')[0].split('-')[0].lower()
        if first_lang in ["zh", "en"]:
            lang = first_lang
    
    # Procedure Step 1: Combine job detail, template, and ALL working experience
    statement = select(ExperienceBlock).where(ExperienceBlock.user_email == job.user_email)
    all_blocks = db.exec(statement).all()
    
    experience_context = []
    for block in all_blocks:
        experience_context.append({
            "id": block.id,
            "title": block.experience_name,
            "company": block.company,
            "time_period": block.time_period,
            "tags": block.tags,
            "tech_stack": block.tech_stack,
            "content_star": block.content_star,
            "perspectives": block.perspectives
        })
    
    # Get template if specified
    template = None
    if template_id:
        from app.models.template import ResumeTemplate
        template = db.get(ResumeTemplate, template_id)
        if template:
            template = {
                "id": template.id,
                "name": template.name,
                "style": template.style,
                "template_content": template.template_content
            }
    
    # Generate resume
    resume = await generate_resume(
        job={
            "title": job.title,
            "company": job.company,
            "key_skills": job.key_skills or [],
            "description_markdown": job.description_markdown
        },
        matched_blocks=experience_context,
        template=template,
        language=lang
    )
    
    job.generated_resume = resume
    job.resume_generated_at = datetime.utcnow()
    job.selected_template_id = str(template_id) if template_id else None
    job.generated_content_lang = lang
    job.status = "DRAFTING"
    job.updated_at = datetime.utcnow()
    
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Successfully generated resume for job {job_id}")
    return job

@router.post("/jobs/{job_id}/generate-cover-letter", response_model=JobResponse)
async def generate_job_cover_letter(
    job_id: int,
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate tailored cover letter for a job (Agent D)
    """
    current_user_email = current_user.email
    job = db.get(JobOpportunity, job_id)
    if not job:
        logger.warning(f"Job not found for cover letter generation: {job_id}")
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to generate cover letter for this job")
    
    logger.info(f"Generating cover letter for job {job_id}")

    # Extract language from header
    lang = "en"
    if accept_language:
        first_lang = accept_language.split(',')[0].split('-')[0].lower()
        if first_lang in ["zh", "en"]:
            lang = first_lang

    # Get matched experience blocks
    matched_blocks = []
    if job.matched_block_ids:
        for block_id in job.matched_block_ids:
            block = db.get(ExperienceBlock, int(block_id))
            if block:
                matched_blocks.append({
                    "id": block.id,
                    "title": block.experience_name,
                    "company": block.company,
                    "time_period": block.time_period,
                    "content_star": block.content_star
                })
    
    # Generate cover letter
    cover_letter = await generate_cover_letter(
        job={
            "title": job.title,
            "company": job.company,
            "description_markdown": job.description_markdown
        },
        matched_blocks=matched_blocks,
        company_analysis=job.company_analysis,
        generated_resume=job.generated_resume,
        language=lang
    )
    
    job.generated_cover_letter = cover_letter
    job.cover_letter_generated_at = datetime.utcnow()
    job.generated_content_lang = lang
    job.updated_at = datetime.utcnow()
    
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Successfully generated cover letter for job {job_id}")
    return job
