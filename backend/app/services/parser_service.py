"""
Agent A - Parser Service
Extracts structured data from job descriptions
"""
import re
from typing import Dict, Any, Optional, List
from app.integrations.llm import call_llm_json
from app.core.logging_config import get_logger

logger = get_logger(__name__)

async def parse_job_description(description: str) -> Dict[str, Any]:
    """
    Parse job description to extract structured information
    Returns: {
        "title": str,
        "company": str,
        "recruiter_is_agency": bool,
        "hiring_client_description": str,
        "department": str,
        "location": str,
        "salary_range": str,
        "published_at": str,
        "brief_description": str,
        "key_skills": List[str],
        "requirements": List[str],
        "responsibilities": List[str]
    }
    """
    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    system_prompt = f"""You are a job description parser. Extract structured information from job postings.
Today's date is {current_date}.
Return a JSON object with the following fields:
- title: The job title
- company: The company name (or recruitment agency name if specified)
- recruiter_is_agency: Boolean, true if the job is posted by a recruitment agency (e.g., "Michael Page", "Hays", "Human Resource Company") for an unnamed client.
- hiring_client_description: If recruiter_is_agency is true, extract the description of the actual client (e.g., "A leading fintech company", "A global retail bank"). If not an agency, use null.
- department: The specific department or team (if mentioned)
- location: The job location
- salary_range: The salary range or compensation details (e.g., "$80k-$120k", "Competitive")
- published_at: Exact date in YYYY-MM-DD format. If the post says relative time like '3 days ago' or '1 month before', calculate the date based on {current_date}.
- brief_description: A markdown formatted summary (max 300 words). Include: 1. What is this role for? 2. What key skills are needed?
- key_skills: List of required technical skills and technologies
- requirements: List of job requirements
- responsibilities: List of job responsibilities

If a field is not found, use null or empty list."""

    user_prompt = f"""Parse this job description and extract the information:

{description}

Return only valid JSON."""

    try:
        logger.info(f"Parser: Sending description to LLM (length: {len(description)})")
        # Use longer timeout for parsing job descriptions (can be lengthy)
        result = await call_llm_json(user_prompt, system_prompt, model_type="phrase", timeout=300.0)
        
        # Ensure key_skills is a list
        if not result.get("key_skills"):
            result["key_skills"] = []
        
        logger.info(f"Parser: Successfully parsed job: {result.get('title')} at {result.get('company')}")
        return result
    except Exception as e:
        logger.error(f"Error parsing job description: {e}", exc_info=True)
        return {
            "title": None,
            "company": None,
            "recruiter_is_agency": False,
            "hiring_client_description": None,
            "department": None,
            "location": None,
            "salary_range": None,
            "published_at": None,
            "brief_description": None,
            "key_skills": [],
            "requirements": [],
            "responsibilities": []
        }

def clean_html_to_markdown(html: str) -> str:
    """
    More robust cleaning for job boards using BeautifulSoup
    """
    from bs4 import BeautifulSoup
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove obvious noise
        for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
            element.decompose()
            
        # Get text with better spacing (crucial for keeping context)
        text = soup.get_text(separator='\n')
        
        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return '\n'.join(lines)
    except Exception as e:
        logger.error(f"Error cleaning HTML: {e}")
        # Fallback to simple regex if BS4 fails
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<[^>]+>', '', html)
        return html.strip()

async def extract_job_metadata(url: str, html_content: str) -> Dict[str, Any]:
    """
    Extract metadata from job posting URL and HTML
    """
    platform = "Unknown"
    
    # Detect platform from URL
    if "linkedin.com" in url:
        platform = "LinkedIn"
    elif "jobsdb.com" in url:
        platform = "JobsDB"
    elif "indeed.com" in url:
        platform = "Indeed"
    elif "glassdoor.com" in url:
        platform = "Glassdoor"
    
    # Convert HTML to markdown
    markdown = clean_html_to_markdown(html_content)
    
    return {
        "platform": platform,
        "description_markdown": markdown,
        "description_raw": html_content
    }

