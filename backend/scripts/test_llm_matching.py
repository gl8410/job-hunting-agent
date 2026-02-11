import sys
import os
import asyncio
from sqlmodel import Session, select, create_engine

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.core.config import settings
from app.models.profile import ExperienceBlock
from app.services.rag_service import match_experience_to_job

async def test_matching_logic():
    print("Testing Experience Matching Logic (LLM-based)...")
    
    # Use a dummy email for testing
    test_email = "test@example.com"
    
    engine = create_engine(settings.DATABASE_URL)
    
    # 1. Setup test data
    with Session(engine) as session:
        # Clear existing test data for this email
        statement = select(ExperienceBlock).where(ExperienceBlock.user_email == test_email)
        results = session.exec(statement).all()
        for r in results:
            session.delete(r)
        session.commit()
        
        # Add a few test blocks
        blocks = [
            ExperienceBlock(
                experience_name="Frontend Developer",
                company="TechCorp",
                role="Senior Engineer",
                tags=["React", "TypeScript", "Tailwind"],
                tech_stack=["React", "Vite", "Zustand"],
                content_star={
                    "situation": "Building a new dashboard",
                    "task": "Implement complex data visualization",
                    "action": "Used D3.js with React to create interactive charts",
                    "result": "Increased user engagement by 40%"
                },
                user_email=test_email
            ),
            ExperienceBlock(
                experience_name="Backend Developer",
                company="DataSystems",
                role="Backend Engineer",
                tags=["Python", "FastAPI", "PostgreSQL"],
                tech_stack=["Python", "SQLModel", "Redis"],
                content_star={
                    "situation": "Slow API responses",
                    "task": "Optimize database queries",
                    "action": "Implemented indexing and caching",
                    "result": "Reduced latency by 60%"
                },
                user_email=test_email
            ),
            ExperienceBlock(
                experience_name="DevOps Engineer",
                company="CloudOps",
                role="DevOps Specialist",
                tags=["Docker", "Kubernetes", "AWS"],
                tech_stack=["Terraform", "GitHub Actions"],
                content_star={
                    "situation": "Manual deployments",
                    "task": "Automate CI/CD pipeline",
                    "action": "Built a multi-stage pipeline using GitHub Actions",
                    "result": "Deployment time reduced from 30m to 5m"
                },
                user_email=test_email
            )
        ]
        for b in blocks:
            session.add(b)
        session.commit()
        
    print(f"Created {len(blocks)} test experience blocks.")
    
    # 2. Test matching
    job_description = """
    We are looking for a Senior Python Developer with experience in FastAPI and PostgreSQL.
    Knowledge of React is a plus. You will be responsible for optimizing our backend services.
    """
    job_skills = ["Python", "FastAPI", "PostgreSQL", "React"]
    
    print("\nRunning matching...")
    results = await match_experience_to_job(
        job_description=job_description,
        job_skills=job_skills,
        user_email=test_email,
        top_k=2
    )
    
    print("\nMatch Results:")
    print(f"Level: {results.get('match_level')}")
    print(f"Reasoning: {results.get('match_reasoning')}")
    print(f"Matched IDs: {results.get('matched_block_ids')}")
    print(f"Advantages: {results.get('match_advantages')}")
    print(f"Weaknesses: {results.get('match_weaknesses')}")
    
    # 3. Clean up
    with Session(engine) as session:
        statement = select(ExperienceBlock).where(ExperienceBlock.user_email == test_email)
        results_to_del = session.exec(statement).all()
        for r in results_to_del:
            session.delete(r)
        session.commit()
    
    print("\nTest completed and cleaned up.")

if __name__ == "__main__":
    asyncio.run(test_matching_logic())
