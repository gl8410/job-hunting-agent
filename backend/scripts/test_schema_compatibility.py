import sys
import os
import pytest

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.schemas.job import JobCreate

def test_job_create_schema_aliases():
    # Test extension payload
    extension_payload = {
        "url": "https://example.com/job",
        "platform": "LinkedIn",
        "title": "Software Engineer",
        "company": "Tech Corp",
        "description": "Job description here",
        "html": "<p>Job description here</p>",
        "user_email": "test@example.com"
    }
    
    job = JobCreate(**extension_payload)
    
    assert job.title == "Software Engineer"
    assert job.company == "Tech Corp"
    assert job.description_markdown == "Job description here"
    assert job.description_raw == "<p>Job description here</p>"
    assert job.url == "https://example.com/job"
    assert job.platform == "LinkedIn"

def test_job_create_schema_standard():
    # Test standard payload
    standard_payload = {
        "url": "https://example.com/job",
        "platform": "LinkedIn",
        "title": "Software Engineer",
        "company": "Tech Corp",
        "description_markdown": "Job description here",
        "description_raw": "<p>Job description here</p>",
        "user_email": "test@example.com"
    }
    
    job = JobCreate(**standard_payload)
    
    assert job.title == "Software Engineer"
    assert job.company == "Tech Corp"
    assert job.description_markdown == "Job description here"
    assert job.description_raw == "<p>Job description here</p>"
