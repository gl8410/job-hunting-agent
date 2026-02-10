from tavily import TavilyClient
from typing import List, Dict, Any
from app.core.config import settings

class TavilySearchClient:
    def __init__(self):
        # Parse API keys (comma-separated for rotation)
        self.api_keys = settings.Tavily_API_KEY.split(',')
        self.current_key_index = 0
    
    def _get_next_key(self) -> str:
        """Rotate through API keys"""
        key = self.api_keys[self.current_key_index].strip()
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        return key
    
    async def search_company_info(
        self,
        company_name: str,
        max_results: int = 7
    ) -> Dict[str, Any]:
        """
        Search for company information using Tavily API with key rotation
        Update: Enhanced prompt for job hunt aspect
        """
        api_key = self._get_next_key()
        # For Chinese company names, use Chinese keywords to get more relevant local results
        if any('\u4e00' <= char <= '\u9fff' for char in company_name):
            query = f'"{company_name}" 公司背景, 营收, 员工人数, 企业文化, 工作环境, 负面新闻, 发展前景'
        else:
            query = f"{company_name} company background, revenue, employee count, culture, work environment, negative news, future prospects for job seekers"
        
        try:
            print(f"Searching Tavily with query: {query}")
            client = TavilyClient(api_key=api_key)
            # Tavily might struggle with mixed language queries or specific Chinese terms
            # explicitly setting search keywords can help
            response = client.search(
                query=query,
                search_depth="advanced",
                include_answer=True,
                max_results=max_results,
                topic="general"
            )
            return response
        except Exception as e:
            print(f"Tavily search error with key {api_key[:5]}...: {e}")
            return {
                "query": query,
                "results": [],
                "answer": f"Search failed: {str(e)}"
            }
    
    async def search_web(
        self,
        query: str,
        max_results: int = 7
    ) -> List[Dict[str, Any]]:
        """
        General web search using Tavily API with key rotation
        """
        api_key = self._get_next_key()
        # Improve web search for Chinese queries
        if any('\u4e00' <= char <= '\u9fff' for char in query):
            if not (query.startswith('"') and query.endswith('"')):
                query = f'"{query}"'

        try:
            client = TavilyClient(api_key=api_key)
            response = client.search(
                query=query,
                search_depth="basic",
                max_results=max_results
            )
            return response.get("results", [])
        except Exception as e:
            print(f"Tavily web search error: {e}")
            return []

tavily_client = TavilySearchClient()

