"""
Agent D - Writer Service
Generates tailored resumes and cover letters
"""
import re
import json
from typing import Dict, Any, List, Optional
from app.integrations.llm import call_llm
from app.core.logging_config import get_logger

logger = get_logger(__name__)

SMART_RESUME_TEMPLATE = """
### 智能简历生成模版定义 (Smart Resume Template Definition)

**总体约束：**
*   **页面限制**：严格控制在 **2页 A4 纸**以内。
*   **语言风格**：Professional, Action-Oriented (使用强动词), Quantifiable (数据导向)。
*   **针对市场**：Hong Kong (强调签证优势、语言能力、跨文化背景)。

#### 板块 1: Header (头部信息)
*   **目的**：极简展示身份与联系方式，**高亮签证优势**。
*   **长度限制**：占用页面顶部约 3-4 行。
*   **固定内容格式**：
    > **[Candidate Name]**
    > **[Target Role Title based on JD]** (e.g., AI Product Lead | Senior Data Scientist)
    > Location: [Current City] (Relocating to HK) | Tel: [Phone with Area Code] | Email: [Professional Email]
    > **Status: Eligible for HK TTPS Visa (Top Talent Pass Scheme)** | **Portfolio/GitHub:** [Link]

#### 板块 2: Professional Summary (职业摘要)
*   **目的**：30秒电梯演讲。根据 JD 的关键词（如 LLM, RAG, Team Lead）动态调整强调点。
*   **长度限制**：3-4 句，约 80-100 词。

#### 板块 3: Skills & Competencies (技能矩阵)
#### 板块 4: Professional Experience (工作经历 - 核心模块)
#### 板块 5: Education (教育背景)
#### 板块 6: Certifications & IP (证书与知识产权)
"""

async def generate_resume(
    job: Dict[str, Any],
    matched_blocks: List[Dict[str, Any]],
    template: Optional[Dict[str, Any]] = None,
    language: str = "en"
) -> str:
    """
    Generate a tailored resume for the job using the Smart Resume Template
    """
    logger.info(f"Generating resume for job: {job.get('title')} in {language}")
    
    # Prepare context
    context = f"Job Information:\n"
    context += f"Title: {job.get('title', '')}\n"
    context += f"Company: {job.get('company', '')}\n"
    context += f"Key Skills Required: {', '.join(job.get('key_skills', []))}\n"
    context += f"Description Excerpt: {job.get('description_markdown', '')[:1000]}\n\n"
    context += "Candidate Experience Blocks (Available for Selection):\n"
    
    for i, block in enumerate(matched_blocks, 1):
        star = block.get('content_star', {})
        context += f"\nBlock {i}:\n"
        context += f"Title: {block.get('title', '')}\n"
        context += f"Company: {block.get('company', '')}\n"
        context += f"Period: {block.get('time_period', '')}\n"
        context += f"Technologies: {', '.join(block.get('tech_stack', []))}\n"
        context += f"Situation: {star.get('situation', '')}\n"
        context += f"Task: {star.get('task', '')}\n"
        context += f"Action: {star.get('action', '')}\n"
        context += f"Result: {star.get('result', '')}\n"
    
    active_template = template.get('template_content') if template and template.get('template_content') else SMART_RESUME_TEMPLATE

    lang_instruction = "The final resume MUST be written in Chinese (简体中文). However, keep technical terms (like LLM, Python, RAG) in English where appropriate for a professional HK market resume." if language == "zh" else "The final resume MUST be written in Professional English."

    system_prompt = f"""You are an expert resume writer specializing in the Hong Kong market and Applicant Tracking Systems (ATS).
You must follow the strict constraints of the provided resume template.

{lang_instruction}

Template Definition:
{active_template}

Your goal is to fill this template using the provided Job Information and Candidate Experience Blocks.
1.  **Fact-Strictness**: YOU MUST ONLY USE THE INFORMATION PROVIDED IN THE CANDIDATE EXPERIENCE BLOCKS. DO NOT hallucinate.
2.  **Selectivity**: Select the most appropriate experience units.
3.  **Length Control**: The final output MUST fit within 2 A4 pages.
4.  **Format**: Return ONLY the Markdown content. Do not include explanations.
"""

    user_prompt = f"""Create the resume for this job application:

{context}

Generate the full resume in Markdown following the template structure exactly."""

    resume = await call_llm(user_prompt, system_prompt, temperature=0.7, max_tokens=2500)
    return resume

async def generate_cover_letter(
    job: Dict[str, Any],
    matched_blocks: List[Dict[str, Any]],
    company_analysis: Optional[Dict[str, Any]] = None,
    generated_resume: Optional[str] = None,
    language: str = "en"
) -> str:
    """
    Generate a tailored cover letter
    """
    logger.info(f"Generating cover letter for job: {job.get('title')} in {language}")
    
    lang_instruction = "The final cover letter MUST be written in Chinese (简体中文). Maintain a professional and persuasive tone." if language == "zh" else "The final cover letter MUST be written in Professional English."

    system_prompt = f"""You are an expert career consultant. Write a highly tailored and persuasive cover letter for the following job and candidate.

{lang_instruction}

Your goal is to connect the candidate's specific achievements to the company's needs and culture.
Return ONLY the Markdown content.
"""

    # ... context preparation (similar to previous version but with language in mind)
    user_prompt = f"Create a cover letter for {job.get('title')} at {job.get('company')}. Use the provided experience and company research."

    cover_letter = await call_llm(user_prompt, system_prompt, temperature=0.7, max_tokens=2000)
    return cover_letter


async def generate_content_for_keys(
    placeholders: Dict[str, str],
    job: Dict[str, Any],
    matched_blocks: List[Dict[str, Any]],
    language: str = "en"
) -> Dict[str, str]:
    """
    Generate content for each placeholder key extracted from a .docx template.
    
    placeholders: dict of {key: instruction}  (instruction may be empty string)
    Returns:      dict of {key: generated_text}
    """
    logger.info(f"Generating content for {len(placeholders)} keys: {list(placeholders.keys())} in {language}")

    # Build the candidate experience context (same as generate_resume)
    context = "Job Information:\n"
    context += f"Title: {job.get('title', '')}\n"
    context += f"Company: {job.get('company', '')}\n"
    context += f"Key Skills Required: {', '.join(job.get('key_skills', []))}\n"
    context += f"Description Excerpt: {job.get('description_markdown', '')[:1500]}\n\n"
    context += "Candidate Experience Blocks (All Available):\n"

    for i, block in enumerate(matched_blocks, 1):
        star = block.get('content_star', {}) or {}
        context += f"\nBlock {i}:\n"
        context += f"Title: {block.get('title', '')}\n"
        context += f"Company: {block.get('company', '')}\n"
        context += f"Period: {block.get('time_period', '')}\n"
        context += f"Technologies: {', '.join(block.get('tech_stack', []) or [])}\n"
        context += f"Situation: {star.get('situation', '')}\n"
        context += f"Task: {star.get('task', '')}\n"
        context += f"Action: {star.get('action', '')}\n"
        context += f"Result: {star.get('result', '')}\n"

    # Describe each key the LLM must generate
    keys_description = ""
    for key, instruction in placeholders.items():
        if instruction:
            keys_description += f'- "{key}": {instruction}\n'
        else:
            keys_description += f'- "{key}": Generate professional content for this resume section.\n'

    lang_instruction = (
        "ALL generated text MUST be in Chinese (简体中文). Keep technical terms (e.g. Python, LLM, API) in English."
        if language == "zh"
        else "ALL generated text MUST be in Professional English."
    )

    system_prompt = f"""You are an expert resume and cover letter writer specializing in the Hong Kong market.
{lang_instruction}

IMPORTANT RULES:
1. YOU MUST ONLY USE FACTS FROM THE PROVIDED CANDIDATE EXPERIENCE BLOCKS. DO NOT hallucinate.
2. Tailor each section tightly to the job description and required skills.
3. Keep each section concise and professional.
4. Return ONLY a valid JSON object — no markdown fences, no explanations, no extra text.

Your response must be a JSON object where EACH of the following keys maps to the generated content string:
{keys_description}
"""

    user_prompt = f"""Generate resume/cover letter content for the following job application.

{context}

Return a JSON object with exactly these keys: {json.dumps(list(placeholders.keys()))}

Each value should be the complete, professional text for that section."""

    raw = await call_llm(user_prompt, system_prompt, temperature=0.7, max_tokens=3000)

    # Parse the JSON response
    try:
        # Strip any accidental markdown code fences
        clean = raw.strip()
        if clean.startswith("```"):
            clean = re.sub(r'^```[a-zA-Z]*\n?', '', clean)
            clean = re.sub(r'\n?```$', '', clean)
        result = json.loads(clean)
        # Ensure all keys are present (fall back to empty string if LLM missed one)
        for key in placeholders:
            if key not in result:
                logger.warning(f"LLM did not generate content for key: '{key}'")
                result[key] = f"[Content for {key} not generated]"
        return result
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON response: {e}\nRaw: {raw[:500]}")
        # Return a best-effort extraction: use the raw text for the first key
        fallback = {key: "" for key in placeholders}
        if len(placeholders) == 1:
            key = list(placeholders.keys())[0]
            fallback[key] = raw
        return fallback
