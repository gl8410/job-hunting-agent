import time
import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        start = time.time()
        resp = await client.get("http://127.0.0.1:6803/health")
        print(f"Health check: {time.time() - start:.4f}s")

if __name__ == "__main__":
    asyncio.run(main())