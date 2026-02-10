"""
Agent D - Writer Service
Generates tailored resumes and cover letters
"""
from typing import Dict, Any, List, Optional
from app.integrations.llm import call_llm
from app.core.logging_config import get_logger

logger = get_logger(__name__)

SMART_RESUME_TEMPLATE = """
### 智能简历生成模版定义 (Smart Resume Template Definition)

**总体约束：**
*   **页面限制**：严格控制在 **2页 A4 纸**以内。
*   **语言风格**：Professional English, Action-Oriented (使用强动词), Quantifiable (数据导向)。
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
*   **生成逻辑**：
    1.  **身份锚定**：NUS Master + X Years Experience + Domain (AI/Construction/Data).
    2.  **核心技能匹配**：提取 JD 中最核心的 3 个技术栈写入（如 "Expert in LLM agents..."）。
    3.  **软技能/语言**：强调 "Cross-functional leadership" 和 "Trilingual (Eng/Man/Cantonese)".
    4.  **目标声明**：Seeking [Specific Role] in Hong Kong to drive [Specific Goal].

#### 板块 3: Skills & Competencies (技能矩阵)
*   **目的**：通过 ATS (简历筛选系统) 关键词匹配。
*   **长度限制**：4-5 行列表。
*   **内容结构**：
    *   **AI & Data Stack**: [根据 JD 筛选，如：LLMs, LangChain, RAG, Python, TensorFlow, Knowledge Graphs]
    *   **Development & Tools**: [如：C#, JavaScript, DevOps, Docker, Azure/AWS]
    *   **Domain Expertise**: [如：BIM, GIS, Data Governance, Smart City]
    *   **Languages**: English (IELTS 6.5 - Professional), Mandarin (Native), Cantonese (Conversational).

#### 板块 4: Professional Experience (工作经历 - 核心模块)
这是最需要“动态生成”的部分。将“公司职责”与“精选项目”合并展示。

**Experience 1: [Most Recent Company]**
*   **时间/地点**：[Time Period] | [Location]
*   **职位**：[调整职位名称以更贴近 JD]
*   **Role Overview (固定)**：1-2 句描述宏观职责（团队规模、产品线、汇报对象）。
*   **Selected Projects (动态选择)**：**限制为 2-3 个最匹配 JD 的项目**。
    *   *格式要求*：
        > **Project: [Project Name]** (Role: [Your Specific Role])
        *   重点展示：如果投 AI 岗，重点展示 AI 相关项目；如果投工程/PM/管理 岗，保留更多管理细节。
        > *   **Challenge/Context**: 简短描述业务痛点。
        > *   **Action (Tech & Strategy)**: 这里植入 JD 里的技术词汇（如 "Architected a RAG system...", "Led agile team..."）。
        > *   **Result (Quantifiable)**: 必须包含数字（¥4.98M contract, 50% efficiency, 60% reduction）。
*   **长度分配**：该工作经历应占据简历约 **40-45%** 的篇幅。

**Experience 2: [Previous Company]**
*   **时间/地点**：[Time Period] | [Location]
*   **职位**：[Role]
*   **Role Overview (固定)**：1 句描述。
*   **Selected Projects (动态选择)**：**限制为 1-2 个项目**。
    *   重点展示：根据 JD 选择最相关的项目。
*   **长度分配**：该工作经历应占据简历约 **25-30%** 的篇幅。

#### 板块 5: Education (教育背景)
*   **目的**：背书学历优势（NUS），但置于底部不喧宾夺主。
*   **长度限制**：3-4 行。
*   **内容要求**：
    > **National University of Singapore (NUS)** | M.Eng in Enterprise Business Analytics | *07/2020 - 06/2021*
    > **Hohai University** | M.Eng in Surveying & Mapping | *09/2007 - 06/2010*
    > **Southeast University** | B.Eng in Surveying & Mapping | *09/2003 - 06/2007*

#### 板块 6: Certifications & IP (证书与知识产权)
*   **目的**：增加权威性。
*   **长度限制**：2 行。
*   **内容**：
    > **Certifications:** Certified Data Management Professional (CDMP)
    > **Intellectual Property:** 5 Invention Patents (3 Granted), 2 Software Copyrights (BIM/AI domain).
"""

async def generate_resume(
    job: Dict[str, Any],
    matched_blocks: List[Dict[str, Any]],
    template: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate a tailored resume for the job using the Smart Resume Template
    """
    print(f"--- STARTING RESUME GENERATION for {job.get('title')} at {job.get('company')} ---")
    logger.info(f"Generating resume for job: {job.get('title')} at {job.get('company')}")
    
    # Prepare context
    context = f"""Job Information:
Title: {job.get('title', '')}
Company: {job.get('company', '')}
Key Skills Required: {', '.join(job.get('key_skills', []))}
Description Excerpt: {job.get('description_markdown', '')[:1000]}

Candidate Experience Blocks (Available for Selection):
"""
    
    for i, block in enumerate(matched_blocks, 1):
        star = block.get('content_star', {})
        context += f"""
Block {i}:
Title: {block.get('title', '')}
Company: {block.get('company', '')}
Period: {block.get('time_period', '')}
Technologies: {', '.join(block.get('tech_stack', []))}
Situation: {star.get('situation', '')}
Task: {star.get('task', '')}
Action: {star.get('action', '')}
Result: {star.get('result', '')}
"""
    
    # Use provided template content if available, otherwise fallback to default
    active_template = template.get('template_content') if template and template.get('template_content') else SMART_RESUME_TEMPLATE

    system_prompt = f"""You are an expert resume writer specializing in the Hong Kong market and Applicant Tracking Systems (ATS).
You must follow the strict constraints of the provided resume template.

Template Definition:
{active_template}

Your goal is to fill this template using the provided Job Information and Candidate Experience Blocks.
1.  **Fact-Strictness**: YOU MUST ONLY USE THE INFORMATION PROVIDED IN THE CANDIDATE EXPERIENCE BLOCKS. DO NOT hallucinate, invent, or create any experience, companies, projects, or achievements that are not explicitly stated in the provided blocks. Making up experiences makes the resume meaningless.
2.  **Selectivity**: You MUST select the most appropriate experience units from the PROVIDED context that best match the target role. You cannot use all blocks. Adapt the focus and highlight relevant aspects of his REAL experience to match the JD, but do not add fake details.
3.  **Length Control**: The final output MUST fit within 2 A4 pages. Be concise.
3.  **Language**: Professional English.
4.  **Format**: Return ONLY the Markdown content. Do not include explanations.
"""

    user_prompt = f"""Create the resume for this job application:

{context}

Generate the full resume in Markdown following the Smart Resume Template structure exactly."""

    try:
        print("Calling LLM for resume generation...")
        resume = await call_llm(user_prompt, system_prompt, temperature=0.7, max_tokens=2500)
        print("Resume generation successful.")
        logger.info("Successfully generated resume")
        return resume
    except Exception as e:
        print(f"ERROR generating resume: {e}")
        logger.error(f"Error generating resume: {e}", exc_info=True)
        raise e

async def generate_cover_letter(
    job: Dict[str, Any],
    matched_blocks: List[Dict[str, Any]],
    company_analysis: Optional[Dict[str, Any]] = None,
    generated_resume: Optional[str] = None
) -> str:
    """
    Generate a tailored cover letter
    """
    logger.info(f"Generating cover letter for job: {job.get('title')} at {job.get('company')}")
    
    if not generated_resume:
        logger.warning("No generated resume provided for cover letter generation")
        # Proceed but with less context might be suboptimal in real world, but fine for now
    
    # Prepare context
    is_agency = job.get('recruiter_is_agency', False)
    client_desc = job.get('hiring_client_description', '')
    
    company_info = f"Recruitment Agency: {job.get('company', '')} (Hiring for client: {client_desc})" if is_agency else f"Company: {job.get('company', '')}"

    context = f"""Job Information:
Title: {job.get('title', '')}
{company_info}
Description: {job.get('description_markdown', '')[:500]}...

"""
    
    if company_analysis:
        context += f"""Company Research:
Culture: {company_analysis.get('culture', 'N/A')}
Brief: {company_analysis.get('seekerBrief', 'N/A')}

"""
    
    if generated_resume:
        context += f"""Candidate's Generated Resume (Use this as the primary source of truth for experience):
{generated_resume[:2000]}... (truncated)
"""
    else:
        context += "Candidate's Relevant Experience (Resume not available, using blocks):\n"
        for block in matched_blocks[:3]:
            star = block.get('content_star', {})
            context += f"""
- {block.get('title', '')} at {block.get('company', '')}
  Achievement: {star.get('result', '')}
"""
    
    system_prompt = """You are a professional cover letter writer implementing the "Structural Paradigm (The 4-Part Framework)".
Your goal is to write a high-impact, psychological flow cover letter.

CORE RULES:
1.  **Conciseness**: Max 220–300 words.
2.  **No Hallucinations**: Only use the actual experience and achievements provided in the context. DO NOT invent fake experiences.
3.  **Red Flags to AVOID**:
    -   NEVER start with "I am writing to apply for..." or "To Whom It May Concern".
    -   Avoid "I" overload. Focus on "You/Your Team/The Company".
    -   Do not regurgitate the resume. Narrate; don't list.

THE 4-PART FRAMEWORK:

Part I: The Hook (The "Why You")
-   Open with a strong hook demonstrating you know who they are or what they need.
-   Example paradigm: "Having followed [Company Name]’s recent pivot into [market], I see a clear opportunity to apply the [skill] strategies I developed at [Previous Company] to accelerate this transition."

Part II: The Evidence (The "So What")
-   Pick ONE or TWO specific achievements from the provided context that match the job's biggest pain points.
-   Use the STAR method (Situation, Task, Action, Result) briefly.
-   Example paradigm: "In your job description, you mentioned a need for [Skill]. At [Company], I led a team... By implementing [Solution], we reduced costs by 20%..."

Part III: The Bridge (The "Why Us")
-   Connect values or long-term goals to the company's mission.
-   Show you want *this* job, not just *a* job.
-   Example paradigm: "Your commitment to [Value] aligns perfectly with my focus on..."

Part IV: The Close (The "Call to Action")
-   Be confident, not passive. Propose the next step.
-   Example paradigm: "I would welcome the chance to discuss how my background in [Skill] can support your team’s goals for 2026."

CONTEXT SPECIFIC INSTRUCTIONS:
-   If "Recruitment Agency" is listed, address the Hiring Manager or Agency Recruiter, but express interest in the *Client's* role (not the agency itself).
-   Address to a specific name or team if possible (e.g., "Dear Hiring Manager", "Dear [Department] Team").
-   Output in clean Markdown format suitable for a professional document.
"""

    user_prompt = f"""Write a tailored cover letter for this job application following the Structural Paradigm:

{context}

Generate the cover letter strictly adhering to the 4-Part Framework defined in the system prompt."""

    try:
        cover_letter = await call_llm(user_prompt, system_prompt, temperature=0.7, max_tokens=1500)
        logger.info("Successfully generated cover letter")
        return cover_letter
    except Exception as e:
        logger.error(f"Error generating cover letter: {e}", exc_info=True)
        return "Error generating cover letter. Please try again."

async def generate_interview_prep(
    job: Dict[str, Any],
    company_analysis: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate interview preparation notes
    """
    context = f"""Job: {job.get('title', '')} at {job.get('company', '')}

Key Skills: {', '.join(job.get('key_skills', []))}
"""
    
    if company_analysis:
        context += f"""
Company Culture: {company_analysis.get('culture', 'N/A')}
Company Prospects: {company_analysis.get('prospectAnalysis', 'N/A')}
"""
    
    system_prompt = """You are a career coach preparing a candidate for an interview.
Provide:
1. 5 likely interview questions
2. Key talking points about the company
3. Questions the candidate should ask
4. Tips for demonstrating fit

Be specific and actionable."""

    user_prompt = f"""Create interview preparation notes:

{context}"""

    try:
        prep_notes = await call_llm(user_prompt, system_prompt, temperature=0.7, max_tokens=2000)
        logger.info("Successfully generated interview prep notes")
        return prep_notes
    except Exception as e:
        logger.error(f"Error generating interview prep: {e}", exc_info=True)
        return "Error generating interview preparation. Please try again."
