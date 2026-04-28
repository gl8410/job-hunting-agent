---
name: supabase_communication
description: Guide on authenticating with Supabase, executing RPC calls for credit deduction, storing files, and manipulating passwords.
---

# Supabase Communication Guide

## 1. Authentication

### Frontend
Initialize via **@supabase/supabase-js (v^2.97.0)** within `services/supabase.ts`. It acts as the backbone for `AuthContext`.
```typescript
import { supabase } from './services/supabase';

// Log user in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Update password for currently authed user
const { data: pwData, error: pwError } = await supabase.auth.updateUser({
  password: 'new-password'
});
```

### Backend (Python)
Extract Token and identify User.
The Python app verifies tokens against Supabase via `supabase.auth.get_user(token)`. A `profiles` record is generally established on first contact during this dependencies check (`deps.py`).

## 2. Server-side Action: Credit Deduction (Bypassing RLS)
Deduction operations utilize the Postgres RPC `deduct_credits`. Since security logic prevents Users from cheating their values, backend calls use the **Service Role Key** which bypasses Row Level Security (RLS).
**Note**: NEVER expose the service role key publicly.

```python
from backend.core.supabase import get_supabase_client

# Important: Use Service Role
supabase = get_supabase_client(use_service_role=True)

response = supabase.rpc('deduct_credits', {
    'p_user_id': user_id,
    'p_cost_amount': 20,
    'p_app_id': 'app_identifier',
    'p_feature_name': 'feature_generation',
    'p_metadata': {"details": "json_info"}
}).execute()
```

## 3. Storage Interactions (FORBIDDEN)

> [!CAUTION]  
> **Do not use Supabase Storage.** All file and object storage operations MUST be handled by **MinIO**. Supabase is uniquely constrained to handling Auth (user credentials/sessions) and PostgreSQL logic (like credits deduction scripts via RPC). Refer to the `minio_file_center_setup` skill for any file management logic.

## 4. Admin Management (Service Role Actions)
Server side can reset user passwords bypassing frontend current-password requirements:
```python
supabase = get_supabase_client(use_service_role=True)
supabase.auth.admin.update_user_by_id(
    user_id,
    attributes={'password': 'new-temporary-password'}
)
```

## 5. Usage Logs & History
Queries log records stored safely with RLS filtering for standard interactions.
```typescript
const { data, error } = await supabase
  .from('usage_logs')
  .select('*')
  .eq('user_id', currentUser.id)
  .order('consumed_at', { ascending: false });
```
