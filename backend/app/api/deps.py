"""
API Dependencies
"""
from typing import Generator, Any, Dict, Tuple, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session
import httpx
import uuid
import ssl
import time

from app.core.db import engine
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.models.user import Profile

import os
import tempfile
import json
import hashlib

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# File-based cache for authentication to avoid hitting Supabase on every request across workers
CACHE_DIR = os.path.join(tempfile.gettempdir(), 'jbh_auth_cache')
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_TTL = 3600  # 1 hour

def _get_from_file_cache(token: str) -> 'Optional[Profile]':
    token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
    file_path = os.path.join(CACHE_DIR, f"{token_hash}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if time.time() - data['timestamp'] < CACHE_TTL:
                profile_data = data['profile']
                return Profile(
                    id=uuid.UUID(profile_data['id']),
                    email=profile_data.get('email'),
                    first_name=profile_data.get('first_name'),
                    last_name=profile_data.get('last_name'),
                    avatar_url=profile_data.get('avatar_url'),
                    subscription_credits=profile_data.get('subscription_credits', 0),
                    topup_credits=profile_data.get('topup_credits', 0)
                )
            else:
                os.remove(file_path)
        except Exception:
            pass
    return None

def _save_to_file_cache(token: str, profile: Profile):
    token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
    file_path = os.path.join(CACHE_DIR, f"{token_hash}.json")
    try:
        data = {
            'timestamp': time.time(),
            'profile': {
                'id': str(profile.id),
                'email': profile.email,
                'first_name': profile.first_name,
                'last_name': profile.last_name,
                'avatar_url': profile.avatar_url,
                'subscription_credits': profile.subscription_credits,
                'topup_credits': profile.topup_credits
            }
        }
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f)
    except Exception as e:
        print(f"DEBUG: Failed to save file cache: {e}")


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency
    """
    with Session(engine) as session:
        yield session

def get_current_user(
    token: str = Depends(oauth2_scheme),
) -> Profile:
    """
    Validates the bearer token using Supabase and returns the user profile.
    If profile doesn't exist but token is valid, creates a default profile.
    """
    if not token:
        if settings.DEBUG:
             pass
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check local file cache first
    cached_profile = _get_from_file_cache(token)
    if cached_profile:
        return cached_profile

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
        client_config = {
            "timeout": httpx.Timeout(15.0, connect=5.0),
            "verify": True,
            "follow_redirects": True,
        }
        
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                with httpx.Client(**client_config) as client:
                    resp = client.get(url, headers=headers, params=params)
                break
            except (httpx.RequestError, ssl.SSLError) as e:
                last_error = e
                if attempt < max_retries - 1:
                    time.sleep(0.5 * (attempt + 1))
                    continue
                else:
                    raise
            
        data = resp.json() if resp.status_code == 200 else []
        profile_data: Any = data[0] if data else None

        if profile_data is None:
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
                        time.sleep(0.5 * (attempt + 1))
                        continue
                    else:
                        raise
            
            if resp_ins.status_code in (200, 201):
                 ins_data = resp_ins.json()
                 profile_data = ins_data[0] if ins_data else new_profile
            else:
                 print(f"DEBUG: Failed to auto-create profile: {resp_ins.text}")
                 profile_data = new_profile

        profile = Profile(
            id=uuid.UUID(str(profile_data['id'])),
            email=str(profile_data.get('email', '')) if profile_data.get('email') else None,
            subscription_credits=int(profile_data.get('subscription_credits') or 0),
            topup_credits=int(profile_data.get('topup_credits') or 0)
        )
        
        # Save to file cache
        _save_to_file_cache(token, profile)
        
        return profile
        
    except Exception as e:
        import traceback
        print(f"DEBUG: Supabase Profile Fetch Error: {str(e)}")
        print(traceback.format_exc())
        
        profile = Profile(
            id=uuid.UUID(str(user.id)),
            email=str(user.email) if user.email else None,
            subscription_credits=0,
            topup_credits=0
        )
        
        # Save fallback to file cache as well to prevent repeated failures
        _save_to_file_cache(token, profile)
        
        return profile
