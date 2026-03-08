import sys
import os
from sqlalchemy import create_engine, text

sys.path.append('c:\\scripts\\build\\search_agent\\backend')

try:
    from app.core.config import settings
except ImportError:
    pass

engine = create_engine(settings.DATABASE_URL)

updates = [
    # Table, Column, Type, Default
    ("job_opportunities", "department", "VARCHAR", "NULL"),
    ("job_opportunities", "location", "VARCHAR", "NULL"),
    ("job_opportunities", "brief_description", "VARCHAR", "NULL"),
    ("job_opportunities", "tavily_results", "JSONB", "NULL"),
    ("job_opportunities", "recruiter_is_agency", "BOOLEAN", "FALSE"),
    ("job_opportunities", "hiring_client_description", "VARCHAR", "NULL"),
    ("job_opportunities", "user_email", "VARCHAR", "'kd_0047@163.com'"),
    ("job_opportunities", "resume_generated_at", "TIMESTAMP", "NULL"),
    ("job_opportunities", "cover_letter_generated_at", "TIMESTAMP", "NULL"),
    ("job_opportunities", "generated_content_lang", "VARCHAR", "NULL"),
    
    ("job_opportunities", "company_analysis", "JSONB", "NULL"),
    ("job_opportunities", "key_skills", "JSONB", "NULL"),
    ("job_opportunities", "matched_block_ids", "JSONB", "NULL"),
    ("job_opportunities", "match_level", "VARCHAR", "NULL"),
    ("job_opportunities", "match_reasoning", "VARCHAR", "NULL"),
    ("job_opportunities", "match_advantages", "JSONB", "NULL"),
    ("job_opportunities", "match_weaknesses", "JSONB", "NULL"),
    ("job_opportunities", "generated_resume", "VARCHAR", "NULL"),
    ("job_opportunities", "generated_cover_letter", "VARCHAR", "NULL"),
    ("job_opportunities", "selected_template_id", "VARCHAR", "NULL"),
    
    ("experience_blocks", "user_email", "VARCHAR", "'kd_0047@163.com'"),
    ("experience_blocks", "role", "VARCHAR", "''"),
    
    ("resume_templates", "user_email", "VARCHAR", "'kd_0047@163.com'"),
    ("resume_templates", "cover_letter_content", "VARCHAR", "NULL")
]

with engine.connect() as conn:
    for table, column, col_type, default_val in updates:
        try:
            check_sql = text("""
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = :table
                AND column_name = :column
            """)
            result = conn.execute(check_sql, {"table": table, "column": column}).scalar()
            
            if result:
                print(f"[{table}] Column {column} already exists")
                continue
            
            sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
            if default_val:
                 sql += f" DEFAULT {default_val}"
            
            conn.execute(text(sql))
            conn.commit()
            print(f"[{table}] SUCCESS: Added column {column}")
        except Exception as e:
            conn.rollback()
            print(f"[{table}] ERROR adding {column}: {e}")
            
    # Also check profiles table for new fields
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN subscription_credits INTEGER DEFAULT 0"))
        conn.commit()
        print("[profiles] Added subscription_credits")
    except Exception:
        conn.rollback()
        
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN topup_credits INTEGER DEFAULT 0"))
        conn.commit()
        print("[profiles] Added topup_credits")
    except Exception:
        conn.rollback()

print("Migration completed.")
