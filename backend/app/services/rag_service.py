"""
Agent C - RAG Service (Consultant)
Matches experience blocks to job requirements using direct LLM analysis
"""
from typing import Dict, Any, List, Optional
from app.integrations.llm import call_llm_json
from app.core.logging_config import get_logger
from app.models.profile import ExperienceBlock
from app.core.db import engine
from sqlmodel import Session, select

logger = get_logger(__name__)

async def match_experience_to_job(
    job_description: str,
    job_skills: List[str],
    user_email: str,
    top_k: int = 5,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Match user's experience blocks to job requirements using LLM
    """
    logger.info(f"Starting experience matching using LLM for {user_email} (Lang: {language})")
    
    with Session(engine) as session:
        statement = select(ExperienceBlock).where(ExperienceBlock.user_email == user_email)
        blocks = session.exec(statement).all()
    
    if not blocks:
        reasoning = "库中未找到任何经验块。" if language == "zh" else "No experience blocks found in your library."
        weakness = "未找到相关的经验块" if language == "zh" else "No relevant experience blocks found"
        return {
            "matched_block_ids": [],
            "match_level": "Low",
            "match_reasoning": reasoning,
            "match_advantages": [],
            "match_weaknesses": [weakness]
        }

    experience_context = ""
    for b in blocks:
        star = b.content_star or {}
        experience_context += f"""
ID: {b.id}
Experience Name: {b.experience_name}
Company: {b.company}
Role: {b.role}
Situation: {star.get('situation', '')}
Task: {star.get('task', '')}
Action: {star.get('action', '')}
Result: {star.get('result', '')}
Tags: {', '.join(b.tags)}
Tech Stack: {', '.join(b.tech_stack)}
---
"""

    lang_instruction = "IMPORTANT: You MUST provide 'match_reasoning', 'match_advantages', and 'match_weaknesses' in Chinese (简体中文)." if language == "zh" else "IMPORTANT: You MUST provide all analysis fields in English."

    system_prompt = f"""You are a career consultant analyzing job-candidate fit.
Your task is to analyze the provided job description and select the BEST matching experience blocks from the candidate's library.

{lang_instruction}

Rules:
1. Select at most {top_k} experience blocks that are most relevant to the job.
2. Provide a detailed analysis of the match.

Return a JSON object with:
- matched_block_ids: List of IDs (integers) of the selected experience blocks
- match_level: "Low", "Medium", or "Good"
- match_reasoning: Brief explanation of the overall match quality
- match_advantages: List of 3-5 key strengths/advantages
- match_weaknesses: List of 2-4 gaps or areas for improvement

Be honest and constructive."""

    user_prompt = f"""
Job Description:
{job_description}

Required Skills: {', '.join(job_skills)}

Candidate's Experience Blocks:
{experience_context}

Provide your selection and analysis in JSON format."""

    try:
        analysis = await call_llm_json(user_prompt, system_prompt, model_type="analysis")
        matched_block_ids = [str(bid) for bid in analysis.get("matched_block_ids", [])]
        
        return {
            "matched_block_ids": matched_block_ids,
            "match_level": analysis.get("match_level", "Medium"),
            "match_reasoning": analysis.get("match_reasoning", ""),
            "match_advantages": analysis.get("match_advantages", []),
            "match_weaknesses": analysis.get("match_weaknesses", [])
        }
    except Exception as e:
        logger.error(f"Error matching experience to job: {e}", exc_info=True)
        reasoning = "由于错误，无法进行详细分析。" if language == "zh" else "Unable to perform detailed analysis due to an error."
        return {
            "matched_block_ids": [],
            "match_level": "Medium",
            "match_reasoning": reasoning,
            "match_advantages": [],
            "match_weaknesses": []
        }
