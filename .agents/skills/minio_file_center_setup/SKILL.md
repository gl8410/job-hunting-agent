---
name: minio_file_center_setup
description: How to establish and interact with a file center using MinIO, including configurations, uploading, downloading, and presigned URLs.
---

# Establish a File Center using MinIO

## 1. Overview
In this project, MinIO is used as an S3-compatible object storage solution for storing project files safely. We interact with MinIO using the official Python SDK, specifically **minio (v7.2.20)**.

## 2. Configuration (`app/core/config.py`)
Ensure your environment and application settings are configured properly:
- `MINIO_ENDPOINT`: Hostname or IP of the MinIO instance (e.g., "localhost" or Docker service "pm_tools_minio")
- `MINIO_PORT`: API port (default `9000`)
- `MINIO_ROOT_USER`: Admin user/Access Key
- `MINIO_ROOT_PASSWORD`: Admin password/Secret Key

## 3. MinIO Client Initialization
Create a singleton client to avoid redundant connections and configure it to connect over `http` (secure=False for local/Docker).

```python
from minio import Minio
from app.core.config import settings

_client = None
BUCKET_NAME = "pm-tools-files"

def get_minio_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            f"{settings.MINIO_ENDPOINT}:{settings.MINIO_PORT}",
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=False,
        )
        if not _client.bucket_exists(BUCKET_NAME):
            _client.make_bucket(BUCKET_NAME)
    return _client
```

## 4. Key Operations

### Upload a File
Convert your file data to an `io.BytesIO` stream.
```python
import io
def upload_file_to_minio(object_key: str, data: bytes, content_type: str) -> str:
    client = get_minio_client()
    client.put_object(
        BUCKET_NAME,
        object_key,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return object_key
```

### Read Object Content
Fetch the raw bytes for background processing or downloading.
```python
def get_object_content(object_key: str) -> bytes:
    client = get_minio_client()
    try:
        response = client.get_object(BUCKET_NAME, object_key)
        return response.read()
    finally:
        if 'response' in locals() and response:
            response.close()
            response.release_conn()
```

### Delete a File
Silently ignore `S3Error` if the intended object is already missing.
```python
from minio.error import S3Error
def delete_file_from_minio(object_key: str) -> None:
    try:
        client = get_minio_client()
        client.remove_object(BUCKET_NAME, object_key)
    except S3Error:
        pass
```

### Generate a Presigned URL
Useful for frontend downloads without piping traffic through the backend.
```python
from datetime import timedelta
def get_presigned_url(object_key: str, expires_seconds: int = 3600) -> str:
    client = get_minio_client()
    return client.presigned_get_object(
        BUCKET_NAME,
        object_key,
        expires=timedelta(seconds=expires_seconds),
    )
```
