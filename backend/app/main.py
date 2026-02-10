from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.db import init_db
from app.core.config import settings
from app.api.v1 import auth
from app.api.v1 import jobs, experience, templates, ingest, analyze, user
from app.core.logging_config import setup_logging

# Initialize logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    init_db()
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

# Include routers
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(experience.router, prefix="/api", tags=["experience"])
app.include_router(templates.router, prefix="/api", tags=["templates"])
app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(analyze.router, prefix="/api", tags=["analyze"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(user.router, prefix="/api", tags=["users"])

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
