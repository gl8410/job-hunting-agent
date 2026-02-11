"""
Agent B - Research Service (Detective)
Conducts company background research
"""
from typing import Dict, Any, Optional
from app.integrations.llm import call_llm_json
from app.integrations.search import tavily_client
from app.core.logging_config import get_logger

logger = get_logger(__name__)

async def research_company(company_name: str, language: str = "en") -> Dict[str, Any]:
    """
    Research company background using web search and LLM analysis
    Returns CompanyAnalysis structure and raw search results
    """
    print(f"--- STARTING COMPANY RESEARCH: {company_name} (Lang: {language}) ---")
    logger.info(f"Starting company research for: {company_name}")
    # Step 1: Search for company information
    search_results = await tavily_client.search_company_info(company_name, max_results=7)
    
    if not search_results.get("results"):
        error_msg = search_results.get("answer", "No search results found")
        print(f"Research failed: {error_msg}")
        logger.warning(f"Research failed for {company_name}: {error_msg}")
        raise Exception(f"Company search failed: {error_msg}")

    # Step 2: Compile search results into context
    context = f"Company: {company_name}\n\n"
    context += "Search Results:\n"
    
    raw_sources = []
    for result in search_results.get("results", []):
        context += f"\nTitle: {result.get('title', '')}\n"
        context += f"Content: {result.get('content', '')}\n"
        context += f"URL: {result.get('url', '')}\n"
        context += "---\n"
        
        raw_sources.append({
            "title": result.get('title', ''),
            "url": result.get('url', '')
        })
    
    print(f"Found {len(search_results.get('results', []))} sources. Analyzing with LLM...")

    lang_instruction = "IMPORTANT: You MUST provide all analysis fields in Chinese (简体中文)." if language == "zh" else "IMPORTANT: You MUST provide all analysis fields in English."

    # Step 3: Use LLM to analyze and structure the information
    system_prompt = f"""You are a company research analyst. Analyze the provided search results and create a comprehensive company analysis.

{lang_instruction}

Return a JSON object with these fields:
- establishTime: When the company was founded
- revenueModel: How the company makes money
- employeeCount: Approximate number of employees
- negativeNews: Any concerning news or red flags
- culture: Company culture and work environment
- seekerBrief: Brief summary for job seekers
- prospectAnalysis: Future prospects and growth potential
- riskAnalysis: Potential risks for joining this company

Use "Not available" (or Chinese equivalent) if information is not found. Be objective and factual."""

    user_prompt = f"""Analyze this company based on the search results:

{context}

Provide a comprehensive analysis in JSON format."""

    try:
        analysis = await call_llm_json(user_prompt, system_prompt)
        
        # Add raw sources and detailed log
        analysis["rawSources"] = raw_sources
        analysis["detailed_research_log"] = context
        analysis["tavily_raw_results"] = search_results
        
        logger.info(f"Successfully completed research for: {company_name}")
        return analysis
    except Exception as e:
        logger.error(f"Error researching company {company_name}: {e}", exc_info=True)
        print(f"Research Error: {e}")
        raise e
