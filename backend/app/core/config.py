from pydantic_settings import BaseSettings
from typing import Optional, List, Union
from pydantic import field_validator

class Settings(BaseSettings):
    # PostgreSQL Configuration
    DATABASE_URL: str

    # LLM Configuration (Phrase LLM - for Parser)
    PHARSE_LLM_API_KEY: str
    PHARSE_LLM_URL: str = "https://api.siliconflow.cn/v1/chat/completions"
    PHARSE_LLM_MODEL: str = "deepseek-ai/DeepSeek-V3.2"

    # LLM Configuration (Analysis LLM - for Research, RAG, Writer)
    ANALYSIS_LLM_API_KEY: str
    ANALYSIS_LLM_URL: str = "https://hiapi.online/v1/chat/completions"
    ANALYSIS_LLM_MODEL: str = "gemini-3-flash-preview"

    # Application Configuration
    APP_NAME: str = "Job Analysis System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["http://localhost:7803", "http://localhost:8080", "http://localhost:8875", "http://localhost:5173"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Supabase Configuration (for future auth)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    # New Standard Config (matching report_review_liteV2)
    VITE_SUPABASE_URL: Optional[str] = None
    VITE_SUPABASE_ANON_KEY: Optional[str] = None
    VITE_SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # Mineru.net configuration
    Mineru_KEY: Optional[str] = None

    # Tavily configuration (comma-separated keys for rotation)
    Tavily_API_KEY: str

    # Server Configuration
    BACKEND_PORT: int = 6803
    FRONTEND_PORT: int = 7803

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
