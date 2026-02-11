from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.schemas.job import AnalysisResult
from app.services.parser_service import parse_job_description
from app.services.research_service import research_company
from app.services.rag_service import match_experience_to_job
from app.services.writer_service import generate_resume, generate_cover_letter
from app.models.profile import ExperienceBlock
from app.models.user import Profile
from app.api.deps import get_db, get_current_user
from sqlmodel import Session
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

class AnalyzeRequest(BaseModel):
    description: str
    language: Optional[str] = "en"

class MatchRequest(BaseModel):
    job: Dict[str, Any]
    blocks: List[Dict[str, Any]]
    language: Optional[str] = "en"

class GenerateRequest(BaseModel):
    job: Dict[str, Any]
    blocks: List[Dict[str, Any]]
    type: str # "resume" or "cover_letter"
    customInstructions: Optional[str] = ""
    templateStyle: Optional[str] = "modern"
    language: Optional[str] = "en"

class ExtractRequest(BaseModel):
    text: str
    language: Optional[str] = "en"

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_job(
    request: AnalyzeRequest,
    current_user: Profile = Depends(get_current_user),
    x_language: Optional[str] = Header(None, alias="X-Language")
):
    """
    Standalone analysis for job description (Agent A + Agent B)
    """
    lang = x_language or request.language or "en"
    logger.info(f"Standalone analysis: Starting job analysis in {lang}")
    # Agent A: Parse job description
    # Currently parse_job_description might be lang-agnostic but we can pass it if needed
    parsed_data = await parse_job_description(request.description, language=lang)
    
    # Agent B: Research company
    company_analysis = None
    if parsed_data.get("company"):
        logger.info(f"Standalone analysis: Researching company {parsed_data.get('company')}")
        company_analysis = await research_company(parsed_data.get("company"), language=lang)
    
    return AnalysisResult(
        title=parsed_data.get("title"),
        company=parsed_data.get("company"),
        department=parsed_data.get("department"),
        location=parsed_data.get("location"),
        salary_range=parsed_data.get("salary_range"),
        published_at=parsed_data.get("published_at"),
        brief_description=parsed_data.get("brief_description"),
        keySkills=parsed_data.get("key_skills", []),
        company_analysis=company_analysis
    )

@router.post("/match")
async def match_experience(
    request: MatchRequest,
    current_user: Profile = Depends(get_current_user),
    x_language: Optional[str] = Header(None, alias="X-Language")
):
    """
    Match experience blocks to job (Agent C)
    """
    lang = x_language or request.language or "en"
    current_user_email = current_user.email
    logger.info(f"Standalone matching: Starting experience matching in {lang}")
    results = await match_experience_to_job(
        request.job.get("description_markdown", ""),
        request.job.get("key_skills", []),
        user_email=current_user_email,
        language=lang
    )
    logger.info("Standalone matching: Completed experience matching")
    return {
        "matches": [{"blockId": bid, "score": 100} for bid in results.get("matched_block_ids", [])],
        "level": results.get("match_level", "Medium"),
        "reasoning": results.get("match_reasoning", ""),
        "advantages": results.get("match_advantages", []),
        "weaknesses": results.get("match_weaknesses", [])
    }

@router.post("/generate")
async def generate_materials(
    request: GenerateRequest,
    current_user: Profile = Depends(get_current_user),
    x_language: Optional[str] = Header(None, alias="X-Language")
):
    """
    Generate tailored resume or cover letter (Agent D)
    """
    lang = x_language or request.language or "en"
    logger.info(f"Standalone generation: Starting {request.type} generation in {lang}")
    if request.type == "resume":
        content = await generate_resume(
            job=request.job,
            matched_blocks=request.blocks,
            template={"style": request.templateStyle},
            language=lang
        )
    else:
        content = await generate_cover_letter(
            job=request.job,
            matched_blocks=request.blocks,
            company_analysis=request.job.get("company_analysis"),
            language=lang
        )
    logger.info(f"Standalone generation: Completed {request.type} generation")
    
    return {"content": content}

@router.post("/extract-experience")
async def extract_experience(
    request: ExtractRequest,
    current_user: Profile = Depends(get_current_user),
    x_language: Optional[str] = Header(None, alias="X-Language")
):
    """
    Extract experience blocks from resume text
    """
    from app.integrations.llm import call_llm_json
    
    lang = x_language or request.language or "en"
    logger.info(f"Extracting experience blocks from resume text in {lang}")

    system_prompt = """You are an expert resume parser and career coach.
Analyze the provided resume text and extract discrete professional experience blocks.
For each experience block, structure it into the STAR format (Situation, Task, Action, Result).

CRITICAL: You must return ONLY a valid JSON array starting with [ and ending with ].
Do not include any explanatory text before or after the JSON.
Do not wrap the JSON in markdown code blocks.

Return a JSON array of experience blocks. Each block should have:
- experience_name: A descriptive title for this experience/achievement
- company: Company name
- role: Job title/role
- time_period: Time period (e.g., "2020-2022")
- tags: Array of relevant tags/categories
- tech_stack: Array of technologies used
- content_star: Object with {situation, task, action, result} fields

Example format (you MUST return an array like this):
[
  {
    "experience_name": "Led Cloud Migration Project",
    "company": "Tech Corp",
    "role": "Senior Engineer",
    "time_period": "2020-2022",
    "tags": ["cloud", "leadership"],
    "tech_stack": ["AWS", "Docker", "Kubernetes"],
    "content_star": {
      "situation": "Legacy infrastructure causing scalability issues",
      "task": "Migrate entire infrastructure to cloud",
      "action": "Led team of 5 engineers, implemented CI/CD pipeline",
      "result": "Reduced costs by 40%, improved uptime to 99.9%"
    }
  }
]

If the text contains markers like "### EXPERIENCE BLOCK START ###" and "### EXPERIENCE BLOCK END ###", parse them accordingly.
Otherwise, intelligently extract experience blocks from the resume text.

Remember: Return ONLY the JSON array, starting with [ and ending with ]."""

    user_prompt = f"Extract experience blocks from this resume:\n\n{request.text}"
    
    try:
        result = await call_llm_json(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=4000,
            model_type="analysis"
        )
        
        # Handle both array and object responses
        if isinstance(result, dict) and "experiences" in result:
            experiences = result["experiences"]
        elif isinstance(result, list):
            experiences = result
        else:
            experiences = [result]
        
        # Validate and clean the experiences
        validated_experiences = []
        for exp in experiences:
            if not isinstance(exp, dict):
                continue
                
            # Ensure required fields
            validated_exp = {
                "experience_name": exp.get("experience_name", ""),
                "company": exp.get("company", ""),
                "role": exp.get("role", ""),
                "time_period": exp.get("time_period", ""),
                "tags": exp.get("tags", []),
                "tech_stack": exp.get("tech_stack", []),
                "content_star": exp.get("content_star", {
                    "situation": "",
                    "task": "",
                    "action": "",
                    "result": ""
                })
            }
            
            # Only include if we have at least experience_name or company
            if validated_exp["experience_name"] or validated_exp["company"]:
                validated_experiences.append(validated_exp)
        
        logger.info(f"Successfully extracted {len(validated_experiences)} experience blocks")
        return validated_experiences
        
    except Exception as e:
        logger.error(f"Failed to extract experience blocks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to extract experience blocks: {str(e)}")
