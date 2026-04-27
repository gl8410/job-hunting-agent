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
from app.schemas.job import JobCreate, JobUpdate, JobResponse, AnalysisResult, JobFromImages
from app.services.parser_service import parse_job_description, extract_job_metadata, clean_html_to_markdown, parse_job_from_images
from app.services.research_service import research_company
from app.services.writer_service import generate_resume, generate_cover_letter
from app.core.logging_config import get_logger
from app.core.supabase import get_supabase_client

router = APIRouter()
logger = get_logger(__name__)

from app.schemas.job import PaginatedJobResponse
from sqlalchemy import func

@router.get("/jobs", response_model=PaginatedJobResponse)
async def list_jobs(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List jobs with pagination, filtering, and counts"""
    current_user_email = current_user.email
    
    # Base query for user's jobs
    base_query = select(JobOpportunity.id, JobOpportunity.title, JobOpportunity.company, JobOpportunity.status, JobOpportunity.created_at, JobOpportunity.updated_at, JobOpportunity.platform, JobOpportunity.user_email).where(JobOpportunity.user_email == current_user_email)
    
    # Calculate counts for all statuses (ignoring current filters)
    counts_query = select(JobOpportunity.status, func.count(JobOpportunity.id)).where(JobOpportunity.user_email == current_user_email).group_by(JobOpportunity.status)
    status_counts = dict(db.exec(counts_query).all())
    total_count = sum(status_counts.values())
    
    counts = {"ALL": total_count}
    counts.update(status_counts)

    # Calculate platform counts
    platform_counts_query = select(JobOpportunity.platform, func.count(JobOpportunity.id)).where(JobOpportunity.user_email == current_user_email).group_by(JobOpportunity.platform)
    platform_counts = dict(db.exec(platform_counts_query).all())

    # Apply filters
    if status and status != "ALL":
        base_query = base_query.where(JobOpportunity.status == status)
        
    if search:
        search_term = f"%{search}%"
        base_query = base_query.where(
            (JobOpportunity.title.ilike(search_term)) |
            (JobOpportunity.company.ilike(search_term))
        )

    # Get total count for current filter
    total_filtered = db.exec(select(func.count()).select_from(base_query.subquery())).one()

    # Get paginated items
    statement = base_query.order_by(JobOpportunity.created_at.desc()).offset(skip).limit(limit)
    jobs = db.exec(statement).all()
    
    # Convert Row objects to dictionaries to match JobListItem schema
    job_items = [
        {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "status": job.status,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "platform": job.platform,
            "user_email": job.user_email
        }
        for job in jobs
    ]
    
    return {
        "items": job_items,
        "total": total_filtered,
        "counts": counts,
        "platform_counts": platform_counts
    }

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

@router.get("/jobs/resumes")
async def list_jobs_with_resumes(
    skip: int = 0,
    limit: int = 20,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return jobs that have a generated resume or cover letter with pagination."""
    current_user_email = current_user.email
    base_query = (
        select(JobOpportunity)
        .where(JobOpportunity.user_email == current_user_email)
        .where(
            (JobOpportunity.generated_resume != None) |
            (JobOpportunity.generated_cover_letter != None)
        )
    )
    
    total = db.exec(select(func.count()).select_from(base_query.subquery())).one()
    
    statement = base_query.order_by(JobOpportunity.resume_generated_at.desc()).offset(skip).limit(limit)
    jobs = db.exec(statement).all()
    
    return {
        "items": jobs,
        "total": total
    }

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

@router.post("/jobs/from-images", response_model=JobResponse)
async def create_job_from_images(
    job_req: JobFromImages,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create and analyze a job straight from images via Vision LLM"""
    current_user_email = current_user.email
    logger.info(f"Processing job from {len(job_req.images)} images for user {current_user_email}")
    
    if not job_req.images:
        raise HTTPException(status_code=400, detail="No images provided")

    # 1. Parse from images
    parsed_data = await parse_job_from_images(job_req.images, language=job_req.language)
    
    job_data = {
        "url": job_req.url or None,  # Use manually provided URL (images can't provide this)
        "platform": "Scanned Image",
        "title": parsed_data.get("title") or "Unknown Title",
        "company": parsed_data.get("company") or "Unknown Company",
        "department": parsed_data.get("department"),
        "location": parsed_data.get("location"),
        "salary_range": parsed_data.get("salary_range"),
        "published_at": parsed_data.get("published_at"),
        "brief_description": parsed_data.get("brief_description"),
        "description_markdown": parsed_data.get("description_markdown"),
        "key_skills": parsed_data.get("key_skills", []),
        "status": "ANALYZED",
        "user_email": current_user_email
    }
    
    db_job = JobOpportunity(**job_data)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Note: Company analysis is left for manual trigger.
    return db_job

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
    Generate tailored resume for a job (Agent D).
    - If a .docx template is provided: extracts {key} placeholders, generates per-key content,
      replaces them in the template, and stores the result as base64.
    - Otherwise: falls back to the legacy markdown generation path.
    """
    current_user_email = current_user.email
    job = db.get(JobOpportunity, job_id)
    if not job:
        logger.warning(f"Job not found for resume generation: {job_id}")
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="Not authorized to generate resume for this job")

    logger.info(f"Generating resume for job {job_id}")

    # Deduct 20 credits
    supabase = get_supabase_client(use_service_role=True)
    try:
        response = supabase.rpc('deduct_credits', {
            'p_user_id': str(current_user.id),
            'p_cost_amount': 20,
            'p_app_id': 'search_agent',
            'p_feature_name': 'generate_resume',
            'p_metadata': {'job_id': job_id}
        }).execute()
    except Exception as e:
        logger.error(f"Credit deduction failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=402, detail="Insufficient credits or credit deduction failed")

    # Extract language from header
    lang = "en"
    if accept_language:
        first_lang = accept_language.split(',')[0].split('-')[0].lower()
        if first_lang in ["zh", "en"]:
            lang = first_lang

    # Collect all experience blocks
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

    # --- DOCX TEMPLATE PATH ---
    if template and getattr(template, 'style', '') == 'docx':
        import base64
        from app.services.docx_service import extract_placeholders, replace_placeholders, build_output_filename
        from app.services.writer_service import generate_content_for_keys

        try:
            # Decode base64 template content to bytes
            template_bytes = base64.b64decode(template.template_content)

            # 1. Extract placeholders from the .docx template
            placeholders = extract_placeholders(template_bytes)
            if not placeholders:
                raise HTTPException(status_code=400, detail="No {key} placeholders found in the template .docx file.")

            job_dict = {
                "title": job.title,
                "company": job.company,
                "key_skills": job.key_skills or [],
                "description_markdown": job.description_markdown
            }

            # 2. Use LLM to generate content for each placeholder key
            generated_content = await generate_content_for_keys(
                placeholders=placeholders,
                job=job_dict,
                matched_blocks=experience_context,
                language=lang
            )

            # 3. Replace placeholders in the template docx
            output_bytes = replace_placeholders(template_bytes, generated_content)

            # 4. Build the output filename
            from datetime import datetime
            date_str = datetime.now().strftime("%Y%m%d")
            
            applicant_name = f"{current_user.last_name or ''}{current_user.first_name or ''}".strip()
            
            output_filename = build_output_filename(
                company=job.company or "",
                position=job.title or "",
                applicant=applicant_name,
                date_str=date_str,
                doc_type="Resume"
            )

            # 5. Store result as base64 and save filename for frontend
            result_b64 = base64.b64encode(output_bytes).decode('utf-8')
            job.generated_resume = result_b64
            job.resume_generated_at = datetime.utcnow()
            job.selected_template_id = str(template_id)
            job.generated_content_lang = lang
            job.status = "DRAFTING"
            job.updated_at = datetime.utcnow()

            # Store output filename in a dedicated field (use brief_description as fallback if no field)
            # We store it as a JSON-encoded prefix so the frontend can detect and extract it
            import json as _json
            job.generated_resume = _json.dumps({
                "type": "docx_b64",
                "filename": output_filename,
                "content": result_b64
            })

        except Exception as e:
            logger.error(f"Docx generation failed for job {job_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Docx generation failed: {str(e)}")

    # --- LEGACY MARKDOWN PATH ---
    else:
        template_dict = None
        if template:
            template_dict = {
                "id": template.id,
                "name": template.name,
                "style": template.style,
                "template_content": template.template_content
            }

        resume = await generate_resume(
            job={
                "title": job.title,
                "company": job.company,
                "key_skills": job.key_skills or [],
                "description_markdown": job.description_markdown
            },
            matched_blocks=experience_context,
            template=template_dict,
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
    template_id: int = None,
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate tailored cover letter for a job (Agent D).
    - If a .docx template is provided: extracts {key} placeholders, generates per-key content,
      replaces them in the template, and stores the result as base64.
    - Otherwise: falls back to legacy markdown generation.
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

    # Get template if specified
    template = None
    if template_id:
        from app.models.template import ResumeTemplate
        template = db.get(ResumeTemplate, template_id)

    # --- DOCX TEMPLATE PATH ---
    if template and getattr(template, 'style', '') == 'docx':
        import base64, json as _json
        from app.services.docx_service import extract_placeholders, replace_placeholders, build_output_filename
        from app.services.writer_service import generate_content_for_keys

        try:
            if not template.cover_letter_content:
                raise HTTPException(status_code=400, detail="No cover letter template provided in this template pair.")
            template_bytes = base64.b64decode(template.cover_letter_content)

            placeholders = extract_placeholders(template_bytes)
            if not placeholders:
                raise HTTPException(status_code=400, detail="No {key} placeholders found in the cover letter template .docx file.")

            job_dict = {
                "title": job.title,
                "company": job.company,
                "key_skills": job.key_skills or [],
                "description_markdown": job.description_markdown
            }

            generated_content = await generate_content_for_keys(
                placeholders=placeholders,
                job=job_dict,
                matched_blocks=matched_blocks,
                language=lang
            )

            output_bytes = replace_placeholders(template_bytes, generated_content)

            date_str = datetime.now().strftime("%Y%m%d")
            
            applicant_name = f"{current_user.last_name or ''}{current_user.first_name or ''}".strip()
            
            output_filename = build_output_filename(
                company=job.company or "",
                position=job.title or "",
                applicant=applicant_name,
                date_str=date_str,
                doc_type="Cover Letter"
            )

            result_b64 = base64.b64encode(output_bytes).decode('utf-8')
            job.generated_cover_letter = _json.dumps({
                "type": "docx_b64",
                "filename": output_filename,
                "content": result_b64
            })

        except Exception as e:
            logger.error(f"Cover letter docx generation failed for job {job_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Cover letter docx generation failed: {str(e)}")

    # --- LEGACY MARKDOWN PATH ---
    else:
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
