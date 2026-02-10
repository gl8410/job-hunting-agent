from fastapi import APIRouter
from app.api.v1 import ingest, analyze

api_router = APIRouter()
api_router.include_router(ingest.router, tags=["ingest"])
api_router.include_router(analyze.router, tags=["analyze"])
