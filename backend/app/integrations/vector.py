import chromadb
from typing import List, Dict, Any
from app.core.config import settings
from app.integrations.embeddings import get_embedding

class VectorClient:
    def __init__(self):
        self._client = None
        self._collection = None

    @property
    def client(self):
        if self._client is None:
            if settings.CHROMA_CLIENT_TYPE == "persistent":
                self._client = chromadb.PersistentClient(
                    path=settings.CHROMA_PERSIST_DIRECTORY
                )
            else:
                self._client = chromadb.HttpClient(
                    host=settings.CHROMA_HOST,
                    port=settings.CHROMA_PORT
                )
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name="experience_blocks",
                metadata={"description": "User experience blocks for RAG matching"}
            )
        return self._collection

    async def upsert_experience_blocks(self, blocks: List[Dict[str, Any]], user_email: str):
        """
        Store experience blocks with embeddings in ChromaDB
        """
        ids = [str(b['id']) for b in blocks]

        # Create documents from STAR content
        documents = []
        for b in blocks:
            star = b.get('content_star', {})
            doc = f"""
            Experience Name: {b.get('experience_name', '')}
            Company: {b.get('company', '')}
            Role: {b.get('role', '')}
            Situation: {star.get('situation', '')}
            Task: {star.get('task', '')}
            Action: {star.get('action', '')}
            Result: {star.get('result', '')}
            Tags: {', '.join(b.get('tags', []))}
            Tech Stack: {', '.join(b.get('tech_stack', []))}
            """.strip()
            documents.append(doc)

        # Generate embeddings
        embeddings = []
        for doc in documents:
            embedding = await get_embedding(doc)
            embeddings.append(embedding)

        # Prepare metadata
        metadatas = [
            {
                "experience_name": b.get('experience_name', ''),
                "company": b.get('company', ''),
                "role": b.get('role', ''),
                "tags": ",".join(b.get('tags', [])),
                "tech_stack": ",".join(b.get('tech_stack', [])),
                "user_email": user_email
            }
            for b in blocks
        ]

        self.collection.upsert( # Accessing property triggers connection
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )

    async def query_relevant_experience(
        self,
        job_description: str,
        user_email: str,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Find matching experience blocks for a job description
        """
        # Generate embedding for job description
        query_embedding = await get_embedding(job_description)

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"user_email": user_email},
            include=["documents", "metadatas", "distances"]
        )

        return results

    def delete_experience_block(self, block_id: str):
        """
        Delete an experience block from ChromaDB
        """
        self.collection.delete(ids=[str(block_id)])

vector_client = VectorClient()
