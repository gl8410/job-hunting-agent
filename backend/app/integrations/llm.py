import httpx
import asyncio
from typing import Optional, Dict, Any
from app.core.config import settings

async def call_llm(
    prompt: str,
    system_prompt: str = "You are a helpful assistant.",
    temperature: float = 0.7,
    max_tokens: int = 2000,
    model_type: str = "analysis",  # Default to analysis
    timeout: float = 180.0,  # Default timeout in seconds
    max_retries: int = 3  # Maximum number of retry attempts
) -> str:
    """
    Call LLM via configured API with automatic retry on timeout
    
    Args:
        prompt: User prompt
        system_prompt: System prompt
        temperature: Temperature for generation
        max_tokens: Maximum tokens to generate
        model_type: Type of model to use ("phrase" or "analysis")
        timeout: Request timeout in seconds (default: 180s for long parsing tasks)
        max_retries: Maximum number of retry attempts on timeout (default: 3)
    """
    if model_type == "phrase":
        url = settings.PHARSE_LLM_URL
        api_key = settings.PHARSE_LLM_API_KEY
        model = settings.PHARSE_LLM_MODEL
    else:
        url = settings.ANALYSIS_LLM_URL
        api_key = settings.ANALYSIS_LLM_API_KEY
        model = settings.ANALYSIS_LLM_MODEL

    last_error = None
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError) as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                print(f"LLM request failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                print(f"LLM request failed after {max_retries} attempts: {e}")
                raise
        except Exception as e:
            # Don't retry on other errors
            print(f"LLM request error: {e}")
            raise
    
    # This should never be reached, but just in case
    raise last_error if last_error else Exception("Unknown error in LLM call")

async def call_llm_json(
    prompt: str,
    system_prompt: str = "You are a helpful assistant. Always respond with valid JSON.",
    temperature: float = 0.3,
    max_tokens: int = 2000,
    model_type: str = "analysis",
    timeout: float = 180.0,
    max_retries: int = 3
) -> Dict[str, Any]:
    """
    Call LLM and expect JSON response with automatic retry on timeout
    
    Args:
        prompt: User prompt
        system_prompt: System prompt
        temperature: Temperature for generation
        max_tokens: Maximum tokens to generate
        model_type: Type of model to use ("phrase" or "analysis")
        timeout: Request timeout in seconds (default: 180s)
        max_retries: Maximum number of retry attempts on timeout (default: 3)
    """
    result = await call_llm(prompt, system_prompt, temperature, max_tokens, model_type=model_type, timeout=timeout, max_retries=max_retries)
    import json
    import re
    
    # Try to extract JSON from markdown code block if present
    json_match = re.search(r'```(?:json)?\s*(\[.*\]|\{.*\})\s*```', result, re.DOTALL)
    if json_match:
        result = json_match.group(1)
    else:
        # Try to find array first (greedy to get full content), then object
        json_match = re.search(r'(\[.*\])', result, re.DOTALL)
        if json_match:
            result = json_match.group(1)
        else:
            # For objects, use greedy match to get everything
            json_match = re.search(r'(\{.*\})', result, re.DOTALL)
            if json_match:
                result = json_match.group(1)
    
    # Clean up the result to handle cases where JSON might have extra text
    result = result.strip()

    try:
        parsed = json.loads(result)
        return parsed
    except json.JSONDecodeError as e:
        # If parsing fails, try to wrap it in an array if it looks like comma-separated objects
        # This handles cases where LLM returns multiple objects but forgets the array wrapper
        if result.startswith('{') and not result.startswith('['):
            try:
                # Try wrapping in array brackets
                wrapped = f'[{result}]'
                parsed = json.loads(wrapped)
                print(f"Successfully parsed after wrapping in array brackets")
                return parsed
            except json.JSONDecodeError:
                pass
        
        print(f"Failed to parse LLM response as JSON: {result[:500]}...")
        raise e
