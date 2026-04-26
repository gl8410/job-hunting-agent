import time
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from sqlalchemy import func
from app.core.db import engine
from app.models.job import JobOpportunity

def test_db_speed():
    user_email = "kd_0047@163.com"
    
    with Session(engine) as db:
        print("Starting DB speed test...")
        
        # 1. Base query
        base_query = select(
            JobOpportunity.id, 
            JobOpportunity.title, 
            JobOpportunity.company, 
            JobOpportunity.status, 
            JobOpportunity.created_at, 
            JobOpportunity.updated_at, 
            JobOpportunity.platform, 
            JobOpportunity.user_email
        ).where(JobOpportunity.user_email == user_email)
        
        # 2. Counts query
        start = time.time()
        counts_query = select(JobOpportunity.status, func.count(JobOpportunity.id)).where(JobOpportunity.user_email == user_email).group_by(JobOpportunity.status)
        status_counts = dict(db.exec(counts_query).all())
        t_counts = time.time() - start
        
        # 3. Total filtered
        start = time.time()
        total_filtered = db.exec(select(func.count()).select_from(base_query.subquery())).one()
        t_total = time.time() - start
        
        # 4. Paginated items
        start = time.time()
        statement = base_query.order_by(JobOpportunity.created_at.desc()).offset(20).limit(20)
        jobs = db.exec(statement).all()
        t_items = time.time() - start
        
        print(f"Counts query: {t_counts:.4f}s")
        print(f"Total filtered query: {t_total:.4f}s")
        print(f"Items query: {t_items:.4f}s")
        print(f"Total DB time: {t_counts + t_total + t_items:.4f}s")

if __name__ == "__main__":
    test_db_speed()
