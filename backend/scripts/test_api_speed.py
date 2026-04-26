import time
import sys
import os
import asyncio
from httpx import AsyncClient

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import engine, Session
from app.models.user import Profile
from sqlmodel import select

async def test_api_speed():
    # We need a valid token or we can just test the DB functions directly if we want to simulate the API
    # Let's simulate the API endpoint logic directly to measure serialization time
    from app.api.v1.jobs import list_jobs, get_job
    from app.models.job import JobOpportunity
    
    user_email = "kd_0047@163.com"
    
    with Session(engine) as db:
        # Mock current user
        current_user = Profile(email=user_email, id="test-id")
        
        print("Testing list_jobs (Pagination)...")
        start = time.time()
        # We need to run the async function
        # list_jobs is async
        result = await list_jobs(skip=0, limit=20, status=None, search=None, current_user=current_user, db=db)
        
        # Simulate Pydantic serialization
        from app.schemas.job import PaginatedJobResponse
        serialized = PaginatedJobResponse(**result).model_dump_json()
        
        t_list = time.time() - start
        print(f"list_jobs time (including serialization): {t_list:.4f}s")
        print(f"Payload size: {len(serialized) / 1024:.2f} KB")
        
        # Get a job ID to test get_job
        if result["items"]:
            job_id = result["items"][0]["id"]
            print(f"\nTesting get_job for job_id {job_id}...")
            start = time.time()
            job = await get_job(job_id=job_id, current_user=current_user, db=db)
            
            from app.schemas.job import JobResponse
            serialized_job = JobResponse.model_validate(job).model_dump_json()
            t_get = time.time() - start
            print(f"get_job time (including serialization): {t_get:.4f}s")
            print(f"Payload size: {len(serialized_job) / 1024:.2f} KB")
        else:
            print("No jobs found to test get_job.")

if __name__ == "__main__":
    asyncio.run(test_api_speed())
