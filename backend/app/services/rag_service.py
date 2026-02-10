"""
Agent C - RAG Service (Consultant)
Matches experience blocks to job requirements using vector similarity
"""
from typing import Dict, Any, List
from app.integrations.vector import vector_client
from app.integrations.llm import call_llm_json
from app.core.logging_config import get_logger

logger = get_logger(__name__)

async def match_experience_to_job(
    job_description: str,
    job_skills: List[str],
    user_email: str,
    top_k: int = 5
) -> Dict[str, Any]:
    """
    Match user's experience blocks to job requirements
    Returns: {
        "matched_block_ids": List[str],
        "match_level": str,  # Low, Medium, Good
        "match_reasoning": str,
        "match_advantages": List[str],
        "match_weaknesses": List[str]
    }
    """
    logger.info(f"Starting experience matching (top_k={top_k})")
    # Step 1: Query vector database for relevant experience blocks
    query_results = await vector_client.query_relevant_experience(
        job_description,
        user_email=user_email,
        top_k=top_k
    )
    logger.info(f"Vector search returned {len(query_results.get('ids', [[]])[0]) if query_results.get('ids') else 0} results")
    
    # Extract matched block IDs
    matched_block_ids = query_results.get("ids", [[]])[0] if query_results.get("ids") else []
    matched_documents = query_results.get("documents", [[]])[0] if query_results.get("documents") else []
    matched_metadatas = query_results.get("metadatas", [[]])[0] if query_results.get("metadatas") else []
    distances = query_results.get("distances", [[]])[0] if query_results.get("distances") else []
    
    # Step 2: Prepare context for LLM analysis
    context = f"Job Description:\n{job_description}\n\n"
    context += f"Required Skills: {', '.join(job_skills)}\n\n"
    context += "Matched Experience Blocks:\n"
    
    for i, (doc, meta, dist) in enumerate(zip(matched_documents, matched_metadatas, distances)):
        context += f"\nBlock {i+1} (Similarity: {1-dist:.2f}):\n"
        context += f"Title: {meta.get('title', 'N/A')}\n"
        context += f"Company: {meta.get('company', 'N/A')}\n"
        context += f"Tags: {meta.get('tags', 'N/A')}\n"
        context += f"Tech Stack: {meta.get('tech_stack', 'N/A')}\n"
        context += f"Content:\n{doc}\n"
        context += "---\n"
    
    # Step 3: Use LLM to analyze match quality
    system_prompt = """You are a career consultant analyzing job-candidate fit.
Analyze the match between the candidate's experience and the job requirements.

Return a JSON object with:
- match_level: "Low", "Medium", or "Good"
- match_reasoning: Brief explanation of the overall match quality
- match_advantages: List of 3-5 key strengths/advantages
- match_weaknesses: List of 2-4 gaps or areas for improvement

Be honest and constructive."""

    user_prompt = f"""Analyze this job-candidate match:

{context}

Provide your analysis in JSON format."""

    try:
        analysis = await call_llm_json(user_prompt, system_prompt)
        
        return {
            "matched_block_ids": matched_block_ids,
            "match_level": analysis.get("match_level", "Medium"),
            "match_reasoning": analysis.get("match_reasoning", ""),
            "match_advantages": analysis.get("match_advantages", []),
            "match_weaknesses": analysis.get("match_weaknesses", [])
        }
    except Exception as e:
        logger.error(f"Error matching experience to job: {e}", exc_info=True)
        return {
            "matched_block_ids": matched_block_ids,
            "match_level": "Medium",
            "match_reasoning": "Unable to perform detailed analysis",
            "match_advantages": [],
            "match_weaknesses": []
        }

async def calculate_fit_score(
    matched_blocks: List[Dict[str, Any]],
    required_skills: List[str]
) -> float:
    """
    Calculate a numerical fit score (0-100)
    """
    if not matched_blocks or not required_skills:
        return 0.0
    
    # Simple scoring based on skill overlap
    total_skills = set(required_skills)
    matched_skills = set()
    
    for block in matched_blocks:
        block_tags = block.get('tags', [])
        block_tech = block.get('tech_stack', [])
        matched_skills.update(block_tags)
        matched_skills.update(block_tech)
    
    overlap = len(total_skills.intersection(matched_skills))
    score = (overlap / len(total_skills)) * 100 if total_skills else 0
    
    return min(score, 100.0)

async def generate_match_reasoning(
    job: Dict[str, Any],
    blocks: List[Dict[str, Any]]
) -> str:
    """
    Generate detailed reasoning for the match
    """
    context = f"Job: {job.get('title', '')} at {job.get('company', '')}\n\n"
    context += "Candidate Experience:\n"
    
    for block in blocks:
        context += f"- {block.get('title', '')} at {block.get('company', '')}\n"
        context += f"  Skills: {', '.join(block.get('tags', []))}\n"
    
    system_prompt = """You are a career consultant. Explain why this candidate is a good (or not so good) fit for this job.
Be specific and reference actual experience. Keep it to 2-3 sentences."""

    user_prompt = f"""Explain the match quality:

{context}"""

    try:
        from app.integrations.llm import call_llm
        reasoning = await call_llm(user_prompt, system_prompt)
        return reasoning
    except Exception as e:
        logger.error(f"Error generating reasoning: {e}")
        return "Match analysis unavailable."

