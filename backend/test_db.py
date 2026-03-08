import sys
import traceback
import json

# Add backend to path
sys.path.append('c:\\scripts\\build\\search_agent\\backend')

try:
    from app.core.config import settings
    import httpx
    
    print("Settings loaded successfully.")
    print(f"Supabase URL: {settings.VITE_SUPABASE_URL}")
    print(f"Postgres URL: {settings.DATABASE_URL}")
    
    # Let's try connecting to the database
    from sqlmodel import create_engine, Session, select
    from app.models.user import Profile
    
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as session:
        statement = select(Profile).limit(1)
        profiles = session.exec(statement).all()
        print(f"Successfully connected to DB. Found {len(profiles)} profiles.")
        
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {str(e)}")
    traceback.print_exc()
