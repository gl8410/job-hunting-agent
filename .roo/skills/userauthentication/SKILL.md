---
name: userauthentication
description: Reference guide for the project's user authentication flow, Supabase integration, and security patterns.
---

# Userauthentication

## 1. Overview
The project delegates authentication to **Supabase Auth** (GoTrue) but maintains a local logic layer for profile management. The backend validates JWTs passed by the frontend and syncs user data into a local `Profile` table (which is actually a proxy to Supabase's `public.profiles` or managed via REST).

## 2. Authentication Flow

### Frontend Responsibility
1.  Frontend uses Supabase JS Client to log in.
2.  Receives `access_token` (JWT).
3.  Sends `Authorization: Bearer <token>` header with every API request.

### Backend Responsibility (`app/api/deps.py`)
1.  **Intercept Request**: FastAPI `Depends(oauth2_scheme)` extracts the Bearer token.
2.  **Verify Token**: Calls `supabase.auth.get_user(token)` to validate signature and expiration.
3.  **Retrieve Profile**:
    - Uses a **Service Role Key** (or standard key with RLS awareness) to fetch user details from the `profiles` table via Supabase REST API (`/rest/v1/profiles`).
    - **Auto-Provisioning**: If the user exists in Auth but has no Profile, the backend **automatically creates** a default profile with initial credits (1100).
4.  **Inject User**: Returns a `Profile` model instance to the router.

## 3. Key Components

### `get_current_user` Dependency
- **Location**: `app/api/deps.py`
- **Usage**: `def endpoint(user: Profile = Depends(get_current_user)):`
- **Logic**:
  - Validates Auth Token.
  - Fetches Profile data.
  - Handles **Syncing** (Auth User -> App Profile).
  - Includes **Fallback Mechanism**: If Supabase Profile API fails, it constructs a minimal in-memory `Profile` to prevent total service denial.

### Supabase Client (`app/core/supabase.py`)
- Provides `get_supabase_client(use_service_role=False)`.
- **Service Role**: Used for admin tasks or bypassing RLS when necessary (e.g., profile creation).
- **Anon Key**: Used for standard operations.

### User Model (`app/models/user.py`)
- **`Profile`**:
  - `id`: Matches Supabase Auth User ID (UUID).
  - `email`: Synced from Auth.
  - `credits`: Computed property (`subscription + topup`).

## 4. Security Patterns

- **Stateless**: No sessions stored in backend RAM/Redis; relies entirely on JWT verification.
- **Fail-Safe**: The authentication logic includes try-catch blocks to handle external API failures gracefully (logging errors and providing fallback profiles).
- **RLS Bypassing**: The backend explicitly constructs headers with Service/Anon keys to interact with Supabase's REST layer, effectively acting as a privileged proxy for specific operations (like Profile syncing).

## 5. Development Reference

### Protecting a Route
```python
from fastapi import APIRouter, Depends
from backend.api.deps import get_current_user
from backend.models.user import Profile

router = APIRouter()

@router.get("/protected-resource")
def get_resource(current_user: Profile = Depends(get_current_user)):
    return {"message": f"Hello {current_user.email}, you have {current_user.credits} credits."}
```

### Accessing User ID
Always use `current_user.id` for:
- Filtering database queries (`owner_id == current_user.id`).
- Associating new resources (`owner_id=current_user.id`).