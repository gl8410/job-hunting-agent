import sys
import os
import asyncio
from sqlmodel import Session, select, create_engine

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(backend_dir)

from backend.app.core.config import settings
from backend.app.models.profile import ExperienceBlock

def test_experience_model():
    print("Testing ExperienceBlock model...")
    engine = create_engine(settings.DATABASE_URL)
    
    with Session(engine) as session:
        # Create a test block
        block = ExperienceBlock(
            experience_name="Test Experience",
            company="Test Company",
            role="Test Role",
            time_period="2023-2024",
            tags=["Python", "FastAPI"],
            tech_stack=["Python", "SQLModel"],
            content_star={
                "situation": "Test Situation",
                "task": "Test Task",
                "action": "Test Action",
                "result": "Test Result"
            }
        )
        session.add(block)
        session.commit()
        session.refresh(block)
        
        print(f"Created block with ID: {block.id}")
        print(f"Experience Name: {block.experience_name}")
        print(f"Role: {block.role}")
        
        # Verify it can be retrieved
        retrieved = session.get(ExperienceBlock, block.id)
        assert retrieved.experience_name == "Test Experience"
        assert retrieved.role == "Test Role"
        
        # Clean up
        session.delete(block)
        session.commit()
        print("Test passed!")

if __name__ == "__main__":
    test_experience_model()