import sys
import os
from fastapi.testclient import TestClient

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(backend_dir)

from backend.app.main import app

client = TestClient(app)

def test_user_flow():
    # 1. Ingest a job for the default user
    payload = {
        "url": "https://example.com/job1",
        "html": "<html><body><h1>Job 1</h1><div class='company'>Company A</div></body></html>",
        "user_email": "kd_0047@163.com"
    }
    response = client.post("/api/ingest", json=payload)
    print(f"Ingest Response: {response.status_code} - {response.json()}")
    assert response.status_code == 200
    
    # 2. List jobs for the default user
    response = client.get("/api/jobs?user_email=kd_0047@163.com")
    print(f"List Jobs Response: {response.status_code}")
    jobs = response.json()
    print(f"Found {len(jobs)} jobs for kd_0047@163.com")
    assert response.status_code == 200
    assert any(j['url'] == "https://example.com/job1" for j in jobs)

    # 3. List jobs for another user (should be empty or not contain the above)
    response = client.get("/api/jobs?user_email=other@example.com")
    jobs_other = response.json()
    print(f"Found {len(jobs_other)} jobs for other@example.com")
    assert not any(j['url'] == "https://example.com/job1" for j in jobs_other)

if __name__ == "__main__":
    try:
        test_user_flow()
        print("Test PASSED")
    except Exception as e:
        print(f"Test FAILED: {e}")
        import traceback
        traceback.print_exc()
