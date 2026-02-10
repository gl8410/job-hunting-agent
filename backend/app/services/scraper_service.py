from bs4 import BeautifulSoup
import re
from app.core.logging_config import get_logger

logger = get_logger(__name__)

def clean_html(raw_html: str) -> str:
    logger.debug(f"Cleaning HTML content (length: {len(raw_html)})")
    soup = BeautifulSoup(raw_html, 'html.parser')
    
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.decompose()
        
    text = soup.get_text()
    
    # Break into lines and remove leading/trailing space on each
    lines = (line.strip() for line in text.splitlines())
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    # Drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    
    return text
