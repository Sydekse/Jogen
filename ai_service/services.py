import os

from google import genai
from pgvector.django import CosineDistance

from .models import LegalDocumentEmbedding


class RAGPipelineService:
    """
    Executes Retrieval-Augmented Generation (RAG) using pgvector
    and Google Gemini for both embeddings and chat.
    """

    def __init__(self):
        # Configure the new Gemini Client
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key)

        # Use the current 2026 models
        self.embedding_model = "models/gemini-embedding-001"
        self.llm_model = "gemini-3.6-flash"

    def generate_embedding(self, text: str) -> list[float]:
        """Generate a 768-dimensional vector embedding using Gemini API."""
        result = self.client.models.embed_content(
            model=self.embedding_model,
            contents=text,
            # We force it to output 768 to match the PostgreSQL db
            config=genai.types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY", output_dimensionality=768
            ),
        )
        return result.embeddings[0].values

    def retrieve_context(
        self, query_vector: list[float], top_k: int = 7, language: str = "en"
    ) -> list[LegalDocumentEmbedding]:
        lang_tag = "(English)" if language == "en" else "(Amharic)"
        """Perform vector cosine distance search in pgvector database."""
        return (
            LegalDocumentEmbedding.objects.filter(doc_reference__icontains=lang_tag)
            .annotate(distance=CosineDistance("embedding", query_vector))
            .order_by("distance")[:top_k]
        )

    def execute_rag_query(self, user_query: str, target_language: str = "en") -> dict:
        """
        Full RAG Pipeline: Query -> Gemini Embedding -> Vector Search -> Gemini Answer
        """
        # 1. Generate query embedding via Gemini API
        query_vector = self.generate_embedding(user_query)

        # 2. Retrieve top matching chunks from pgvector
        matched_docs = self.retrieve_context(query_vector, top_k=7, language=target_language)

        context_str = "\n\n".join(
            [f"Source: {doc.doc_reference}\nContent: {doc.content_chunk}" for doc in matched_docs]
        )
        sources = list({doc.doc_reference for doc in matched_docs})

        # 3. Construct the input prompt
        prompt = (
            f"You are Jogen's Regulatory & Legal Compliance AI assistant. "
            f"Answer the question accurately based ONLY on the provided context below. "
            f"Respond in language code: {target_language}.\n\n"
            f"Context:\n{context_str}\n\n"
            f"User Question: {user_query}"
        )

        # 4. Call Google Gemini Interactions API (the new way to generate content)
        interaction = self.client.interactions.create(model=self.llm_model, input=prompt)

        return {"answer": interaction.output_text, "sources": sources, "context_used": context_str}
