import httpx
import asyncio
import logging
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)

async def get_embedding(text: str, max_retries: int = 3) -> List[float]:
    """
    Generate embeddings using Qwen model via SiliconFlow with retry logic
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    settings.EMBEDDING_URL,
                    headers={
                        "Authorization": f"Bearer {settings.EMBEDDING_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.EMBEDDING_MODEL,
                        "input": text
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["data"][0]["embedding"]
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.warning(f"Embedding request failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"Embedding request failed after {max_retries} attempts: {e}")
                raise
        except Exception as e:
            logger.error(f"Unexpected error in get_embedding: {e}")
            raise
    
    raise last_error if last_error else Exception("Unknown error in get_embedding")

async def get_embeddings_batch(texts: List[str], max_retries: int = 3) -> List[List[float]]:
    """
    Generate embeddings for multiple texts with retry logic
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    settings.EMBEDDING_URL,
                    headers={
                        "Authorization": f"Bearer {settings.EMBEDDING_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.EMBEDDING_MODEL,
                        "input": texts
                    }
                )
                response.raise_for_status()
                data = response.json()
                return [item["embedding"] for item in data["data"]]
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.warning(f"Batch embedding request failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"Batch embedding request failed after {max_retries} attempts: {e}")
                raise
        except Exception as e:
            logger.error(f"Unexpected error in get_embeddings_batch: {e}")
            raise

    raise last_error if last_error else Exception("Unknown error in get_embeddings_batch")

