from fastapi import APIRouter, Depends, HTTPException
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

class MatchRequest(BaseModel):
    job: Dict[str, Any]
    blocks: List[Dict[str, Any]]

class GenerateRequest(BaseModel):
    job: Dict[str, Any]
    blocks: List[Dict[str, Any]]
    type: str # "resume" or "cover_letter"
    customInstructions: Optional[str] = ""
    templateStyle: Optional[str] = "modern"

class ExtractRequest(BaseModel):
    text: str

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_job(
    request: AnalyzeRequest,
    current_user: Profile = Depends(get_current_user)
):
    """
    Standalone analysis for job description (Agent A + Agent B)
    """
    current_user_email = current_user.email
    logger.info("Standalone analysis: Starting job analysis")
    # Agent A: Parse job description
    parsed_data = await parse_job_description(request.description)
    
    # Agent B: Research company
    company_analysis = None
    if parsed_data.get("company"):
        logger.info(f"Standalone analysis: Researching company {parsed_data.get('company')}")
        company_analysis = await research_company(parsed_data.get("company"))
    
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
    logger.info("Standalone analysis: Completed job analysis")
    return result

@router.post("/match")
async def match_experience(
    request: MatchRequest,
    current_user: Profile = Depends(get_current_user)
):
    """
    Match experience blocks to job (Agent C)
    """
    current_user_email = current_user.email
    logger.info("Standalone matching: Starting experience matching")
    # In a real scenario, we might use the vector DB here,
    # but for this endpoint we'll use the provided blocks
    results = await match_experience_to_job(
        request.job.get("description_markdown", ""),
        request.job.get("key_skills", []),
        user_email=current_user_email
    )
    logger.info("Standalone matching: Completed experience matching")
    # The frontend expects { matches, level, reasoning, advantages, weaknesses }
    # match_experience_to_job returns something slightly different, let's adapt
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
    current_user: Profile = Depends(get_current_user)
):
    """
    Generate tailored resume or cover letter (Agent D)
    """
    current_user_email = current_user.email
    logger.info(f"Standalone generation: Starting {request.type} generation")
    if request.type == "resume":
        content = await generate_resume(
            job=request.job,
            matched_blocks=request.blocks,
            template={"style": request.templateStyle}
        )
    else:
        content = await generate_cover_letter(
            job=request.job,
            matched_blocks=request.blocks,
            company_analysis=request.job.get("company_analysis")
        )
    logger.info(f"Standalone generation: Completed {request.type} generation")
    
    return {"content": content}

@router.post("/extract-experience")
async def extract_experience(
    request: ExtractRequest,
    current_user: Profile = Depends(get_current_user)
):
    """
    Extract experience blocks from resume text
    """
    current_user_email = current_user.email
    from app.integrations.llm import call_llm_json

    system_prompt = """You are an expert resume parser and career coach.
    Analyze the provided resume text and extract discrete professional experience blocks.
    For each experience block, structure it into the STAR format (Situation, Task, Action, Result).
    
    The resume may use different formats. Look for patterns like:
    - "Experience_name:" or "Experience Name:" followed by the experience title
    - "Company:" followed by the company name
    - "Role:" followed by the job role
    - "Time period:" or "Time Period:" followed by duration
    - "Tags:" followed by keywords
    - "Situation:", "Task:", "Action:", "Result:" for STAR content
    
    CRITICAL: You MUST extract ALL experience blocks found in the text. Do not stop after a few blocks.
    Count the number of "Experience_name:" entries and ensure you extract that many blocks.
    
    Return a valid JSON object containing a list called "blocks", where each block has:
    - experience_name: Name/title of the experience (required)
    - company: Company name (required)
    - role: Job role/position (required)
    - time_period: Duration (required, e.g., "2021.06-2022.10")
    - tags: List of keywords (extract from "Tags:" line)
    - tech_stack: List of technologies (infer from tags or text)
    - content_star: An object with keys "situation", "task", "action", "result"
      - situation: Copy from "Situation:" line
      - task: Copy from "Task:" line
      - action: Copy from "Action:" line
      - result: Copy from "Result:" line
    - perspectives: (Optional) An object with keys "leadership" and "technical"

    IMPORTANT:
    1. Extract ALL experience blocks, not just a sample
    2. Keep STAR content concise but complete
    3. Ensure valid JSON syntax
    4. Do not truncate the response - complete all blocks
    """

    user_prompt = f"Resume Content:\n\n{request.text}"

    try:
        # Use analysis model with increased max_tokens for large resumes
        logger.info(f"[EXTRACT] Starting extraction, text length: {len(request.text)}")
        result = await call_llm_json(
            user_prompt,
            system_prompt,
            temperature=0.1,  # Lower temperature for more consistent extraction
            max_tokens=32000,  # Further increased to ensure all blocks are extracted
            model_type="analysis"
        )
        logger.debug(f"[EXTRACT] LLM result: {result}")
        
        blocks = result.get("blocks", [])
        logger.info(f"[EXTRACT] Successfully extracted {len(blocks)} blocks")
        
        # Validate blocks structure to ensure frontend compatibility
        for i, block in enumerate(blocks):
            if "content_star" not in block or not isinstance(block["content_star"], dict):
                logger.warning(f"[EXTRACT] Block {i} missing content_star dict, creating fallback")
                block["content_star"] = {
                    "situation": block.get("situation", ""),
                    "task": block.get("task", ""),
                    "action": block.get("action", ""),
                    "result": block.get("result", "")
                }
        
        return blocks
    except Exception as e:
        logger.error(f"[EXTRACT] Error extracting experience: {e}", exc_info=True)
        return []