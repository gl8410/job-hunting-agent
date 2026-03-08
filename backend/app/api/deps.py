"""
API Dependencies
"""
from typing import Generator, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session
import httpx
import uuid
import ssl

from app.core.db import engine
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.models.user import Profile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency
    """
    with Session(engine) as session:
        yield session

async def get_current_user(
    token: str = Depends(oauth2_scheme),
) -> Profile:
    """
    Validates the bearer token using Supabase and returns the user profile.
    If profile doesn't exist but token is valid, creates a default profile.
    """
    if not token:
        # In DEBUG mode, we might want to allow access, but for safety in this refactor,
        # we enforce auth. If dev mode is needed, handling it explicitly is better.
        # But previous code had a fallback.
        if settings.DEBUG:
            # Check if we should allow bypass.
             pass
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    supabase = get_supabase_client()
    
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = user_response.user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch User Profile from Supabase directly via REST API
    try:
        anon_key = settings.VITE_SUPABASE_ANON_KEY or settings.SUPABASE_KEY
        supabase_url = settings.VITE_SUPABASE_URL or settings.SUPABASE_URL
        
        headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        url = f"{supabase_url}/rest/v1/profiles"
        params = {"select": "*", "id": f"eq.{user.id}"}
        
        # Configure httpx client with proper timeout and SSL settings
        # Use verify=True but with increased timeout to handle SSL handshake issues
        client_config = {
            "timeout": httpx.Timeout(15.0, connect=5.0),
            "verify": True,  # Keep SSL verification enabled for security
            "follow_redirects": True,
        }
        
        # Retry logic for transient SSL errors
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                with httpx.Client(**client_config) as client:
                    resp = client.get(url, headers=headers, params=params)
                break  # Success, exit retry loop
            except (httpx.RequestError, ssl.SSLError) as e:
                last_error = e
                if attempt < max_retries - 1:
                    # Wait briefly before retry
                    import time
                    time.sleep(0.5 * (attempt + 1))
                    continue
                else:
                    # Last attempt failed, raise the error
                    raise
            
        data = resp.json() if resp.status_code == 200 else []
        profile_data: Any = data[0] if data else None

        if profile_data is None:
            # Auto-create profile in Supabase if missing
            new_profile = {
                "id": user.id,
                "email": user.email,
                "subscription_credits": 0,
                "topup_credits": 0
            }
            
            for attempt in range(max_retries):
                try:
                    with httpx.Client(**client_config) as client:
                        resp_ins = client.post(url, headers=headers, json=new_profile)
                    break
                except (httpx.RequestError, ssl.SSLError) as e:
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(0.5 * (attempt + 1))
                        continue
                    else:
                        raise
            
            if resp_ins.status_code in (200, 201):
                 ins_data = resp_ins.json()
                 profile_data = ins_data[0] if ins_data else new_profile
            else:
                 # Fallback
                 print(f"DEBUG: Failed to auto-create profile: {resp_ins.text}")
                 profile_data = new_profile

        # Map to Profile model
        profile = Profile(
            id=uuid.UUID(str(profile_data['id'])),
            email=str(profile_data.get('email', '')) if profile_data.get('email') else None,
            subscription_credits=int(profile_data.get('subscription_credits') or 0),
            topup_credits=int(profile_data.get('topup_credits') or 0)
        )
        return profile
        
    except Exception as e:
        import traceback
        print(f"DEBUG: Supabase Profile Fetch Error: {str(e)}")
        print(traceback.format_exc())
        
        # Fallback to local default profile
        return Profile(
            id=uuid.UUID(str(user.id)),
            email=str(user.email) if user.email else None,
            subscription_credits=0,
            topup_credits=0
        )
