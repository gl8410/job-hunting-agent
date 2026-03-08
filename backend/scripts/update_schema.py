import sys
import os
from sqlalchemy import create_engine, text

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(backend_dir)

try:
    from backend.app.core.config import settings
except ImportError:
    # Fallback if running from a different context or if imports fail
    sys.path.append(os.path.join(backend_dir, 'backend'))
    from app.core.config import settings

def update_schema():
    print(f"Connecting to database...")
    engine = create_engine(settings.DATABASE_URL)
    
    updates = [
        # Table, Column, Type, Default
        ("job_opportunities", "department", "VARCHAR", None),
        ("job_opportunities", "location", "VARCHAR", None),
        ("job_opportunities", "brief_description", "VARCHAR", None),
        ("job_opportunities", "tavily_results", "JSONB", None),
        ("job_opportunities", "recruiter_is_agency", "BOOLEAN", "FALSE"),
        ("job_opportunities", "hiring_client_description", "VARCHAR", None),
        ("job_opportunities", "user_email", "VARCHAR", "'kd_0047@163.com'"),
        ("experience_blocks", "user_email", "VARCHAR", "'kd_0047@163.com'"),
        ("resume_templates", "user_email", "VARCHAR", "'kd_0047@163.com'"),
        ("experience_blocks", "role", "VARCHAR", None),
        ("job_opportunities", "resume_generated_at", "TIMESTAMP", None),
        ("job_opportunities", "cover_letter_generated_at", "TIMESTAMP", None),
        ("resume_templates", "cover_letter_content", "VARCHAR", None)
    ]
    
    with engine.connect() as conn:
        # Handle column additions
        for table, column, col_type, default_val in updates:
            try:
                # Check if column exists using information_schema
                check_sql = text("""
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = :table
                    AND column_name = :column
                """)
                result = conn.execute(check_sql, {"table": table, "column": column}).scalar()
                
                if result:
                    print(f"Column {column} in {table} already exists")
                    continue
                
                # Add column
                sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
                if default_val:
                     sql += f" DEFAULT {default_val}"
                
                conn.execute(text(sql))
                conn.commit()
                print(f"Added column: {column} to {table}")
                
                 # Add index if it's user_email
                if column == "user_email":
                    try:
                        index_name = f"ix_{table}_{column}"
                        conn.execute(text(f"CREATE INDEX {index_name} ON {table} ({column})"))
                        conn.commit()
                        print(f"Added index for {column} in {table}")
                    except Exception as e:
                         print(f"Error adding index: {e}")
                         conn.rollback()

            except Exception as e:
                print(f"Error processing {column} for {table}: {e}")
                conn.rollback()

        # Handle column rename (title -> experience_name)
        try:
            # Check if 'title' exists and 'experience_name' does not
            check_title = text("SELECT 1 FROM information_schema.columns WHERE table_name = 'experience_blocks' AND column_name = 'title'")
            check_exp_name = text("SELECT 1 FROM information_schema.columns WHERE table_name = 'experience_blocks' AND column_name = 'experience_name'")
            
            has_title = conn.execute(check_title).scalar()
            has_exp_name = conn.execute(check_exp_name).scalar()
            
            if has_title and not has_exp_name:
                conn.execute(text("ALTER TABLE experience_blocks RENAME COLUMN title TO experience_name"))
                conn.commit()
                print("Renamed column 'title' to 'experience_name' in experience_blocks")
            elif has_exp_name:
                print("Column 'experience_name' already exists")
        except Exception as e:
            print(f"Error renaming column: {e}")
            conn.rollback()

if __name__ == "__main__":
    update_schema()