from fastapi import APIRouter, HTTPException, Depends
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.supabase import get_supabase_client
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """
    Authenticate user with Supabase and return access token
    """
    supabase = get_supabase_client()
    try:
        response = supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        return TokenResponse(
            access_token=response.session.access_token,
            token_type="bearer",
            expires_in=response.session.expires_in,
            refresh_token=response.session.refresh_token,
            user_id=str(response.user.id),
            user_email=response.user.email
        )
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        # Check if it is an invalid login error from Supabase
        if "Invalid login credentials" in str(e):
             raise HTTPException(status_code=401, detail="Invalid login credentials")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")