import os

from openai import OpenAI
from pgvector.django import CosineDistance

from .models import LegalDocumentEmbedding


class RAGPipelineService:
    """
    Executes Retrieval-Augmented Generation (RAG) using pgvector and OpenAI GPT.
    """

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "dummy-key-for-dev"))
        self.embedding_model = "text-embedding-3-small"
        self.llm_model = "gpt-4o-mini"

    def generate_embedding(self, text: str) -> list[float]:
        """Generate a 1536-dimensional vector embedding for user query."""
        response = self.client.embeddings.create(input=text, model=self.embedding_model)
        return response.data[0].embedding

    def retrieve_context(
        self, query_vector: list[float], top_k: int = 3
    ) -> list[LegalDocumentEmbedding]:
        """Perform vector cosine distance search in pgvector database."""
        return LegalDocumentEmbedding.objects.annotate(
            distance=CosineDistance("embedding", query_vector)
        ).order_by("distance")[:top_k]

    def execute_rag_query(self, user_query: str, target_language: str = "en") -> dict:
        """
        Full RAG Pipeline: Query -> Embedding -> Vector Search -> Prompt Context -> GPT Answer
        """
        # 1. Generate query embedding
        query_vector = self.generate_embedding(user_query)

        # 2. Retrieve top matching chunks from pgvector
        matched_docs = self.retrieve_context(query_vector, top_k=3)

        context_str = "\n\n".join(
            [f"Source: {doc.doc_reference}\nContent: {doc.content_chunk}" for doc in matched_docs]
        )
        sources = list({doc.doc_reference for doc in matched_docs})

        # 3. Construct System Prompt
        system_prompt = (
            f"You are Jogen's Ethiopian Regulatory & Legal Compliance AI assistant. "
            f"Answer the question accurately based ONLY on the provided context below. "
            f"Respond in language code: {target_language}.\n\n"
            f"Context:\n{context_str}"
        )

        # 4. Call OpenAI GPT
        response = self.client.chat.completions.create(
            model=self.llm_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            temperature=0.2,
        )

        answer = response.choices[0].message.content

        return {"answer": answer, "sources": sources, "context_used": context_str}
