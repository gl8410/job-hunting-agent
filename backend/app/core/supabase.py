from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client(use_service_role: bool = False) -> Client:
    """
    Get Supabase client.
    
    Args:
        use_service_role: If True, uses service role key (for admin operations).
                         If False, uses anon key (for user operations).
    """
    if not settings.VITE_SUPABASE_URL and not settings.SUPABASE_URL:
        raise RuntimeError("VITE_SUPABASE_URL or SUPABASE_URL must be set in .env")
        
    url = settings.VITE_SUPABASE_URL or settings.SUPABASE_URL

    if use_service_role:
        if not settings.VITE_SUPABASE_SERVICE_ROLE_KEY:
             # Fallback to key if defined but likely wrong
            raise RuntimeError("VITE_SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        return create_client(url, settings.VITE_SUPABASE_SERVICE_ROLE_KEY)
    else:
        key = settings.VITE_SUPABASE_ANON_KEY or settings.SUPABASE_KEY
        if not key:
            raise RuntimeError("VITE_SUPABASE_ANON_KEY or SUPABASE_KEY must be set in .env")
        return create_client(url, key)