from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.db import init_db
from app.core.config import settings
from fastapi.staticfiles import StaticFiles
from app.api.v1 import auth
from app.api.v1 import jobs, experience, templates, ingest, analyze, user
from app.core.logging_config import setup_logging

# Initialize logging
setup_logging()

def run_migrations():
    try:
        from auto_migrate import engine, updates
        from sqlalchemy import text
        with engine.connect() as conn:
            for table, column, col_type, default_val in updates:
                try:
                    check_sql = text(f"SELECT 1 FROM information_schema.columns WHERE table_name = '{table}' AND column_name = '{column}'")
                    result = conn.execute(check_sql).scalar()
                    if not result:
                        sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
                        if default_val: sql += f" DEFAULT {default_val}"
                        conn.execute(text(sql))
                        conn.commit()
                        print(f"[{table}] Added column {column}")
                except Exception as e:
                    conn.rollback()
                    print(f"[{table}] ERROR adding {column}: {e}")
            try:
                conn.execute(text("ALTER TABLE profiles ADD COLUMN subscription_credits INTEGER DEFAULT 0"))
                conn.commit()
            except Exception: conn.rollback()
            try:
                conn.execute(text("ALTER TABLE profiles ADD COLUMN topup_credits INTEGER DEFAULT 0"))
                conn.commit()
            except Exception: conn.rollback()
    except Exception as e:
        print(f"Migration error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    init_db()
    run_migrations()
    yield

app = FastAPI(
    title="Decision making support system API",
    version="1.0.0",
    description="AI-powered job application assistant",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Include routers
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(experience.router, prefix="/api", tags=["experience"])
app.include_router(templates.router, prefix="/api", tags=["templates"])
app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(analyze.router, prefix="/api", tags=["analyze"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(user.router, prefix="/api", tags=["users"])

import os
from fastapi.responses import FileResponse
from fastapi import HTTPException

download_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "download")
os.makedirs(download_dir, exist_ok=True)
# Keep static files just in case, but rely on explicit endpoint for downloading
app.mount("/static/download", StaticFiles(directory=download_dir), name="static_download")

@app.get("/api/download/{filename:path}")
async def download_file(filename: str):
    file_path = os.path.join(download_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=file_path,
        filename=os.path.basename(filename),
        headers={"Content-Disposition": f"attachment; filename={os.path.basename(filename)}"}
    )


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Decision making support system API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}
