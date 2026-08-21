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
        try:
            query_vector = self.generate_embedding(user_query)
            matched_docs = list(self.retrieve_context(query_vector, top_k=7, language=target_language))
        except Exception:
            # A greeting or general question should still reach the language model
            # when the vector store is unavailable or has no matching language data.
            matched_docs = []

        # 2. Retrieve top matching chunks from pgvector

        context_str = "\n\n".join(
            [f"Source: {doc.doc_reference}\nContent: {doc.content_chunk}" for doc in matched_docs]
        )
        sources = list({doc.doc_reference for doc in matched_docs})

        # 3. Construct the input prompt with regulatory intent instructions
        language_instruction = (
            "Respond entirely in Amharic (Ethiopian script), keeping legal names and citations accurate."
            if target_language == "am"
            else "Respond entirely in English."
        )
        prompt = (
            f"You are Jogen's AI assistant. {language_instruction}\n\n"
            f"Task:\n"
            f"1. Determine if the User Question is a REGULATORY/LEGAL/TAX question (e.g. questions about Ethiopian tax laws, labor laws, business licensing, regulations, corporate legal requirements) vs a NON-REGULATORY query (greetings, general platform questions, general conversation).\n"
            f"2. IF IT IS A REGULATORY/LEGAL/TAX QUESTION:\n"
            f"   - You MUST rely strictly on the provided Context below to give an accurate, confident answer with citations.\n"
            f"   - If the provided Context is empty, missing, or insufficient to give a confident legal answer, start your response with 'UNCERTAIN_REGULATORY:' and explain briefly that legal references are insufficient.\n"
            f"3. IF IT IS NOT A REGULATORY QUESTION:\n"
            f"   - Answer directly and helpfully without requiring legal citations or expert escalation.\n\n"
            f"Context:\n{context_str if context_str else 'No matching legal documents found.'}\n\n"
            f"User Question: {user_query}"
        )

        # 4. Call Google Gemini Interactions API (the new way to generate content)
        interaction = self.client.interactions.create(model=self.llm_model, input=prompt)
        raw_answer = interaction.output_text.strip()
        answer_lower = raw_answer.lower()

        uncertainty_markers = (
            "uncertain_regulatory",
            "i'm not sure",
            "i am not sure",
            "cannot determine",
            "need more information",
            "consult a lawyer",
            "consult an expert",
            "outside my knowledge",
            "insufficient context",
            "እርግጠኛ አይደለሁም",
            "ተጨማሪ መረጃ ያስፈልጋል",
            "ባለሙያ ያማክሩ",
            "ጠበቃ ያማክሩ",
        )

        is_regulatory_uncertain = any(marker in answer_lower for marker in uncertainty_markers)

        # If it starts with UNCERTAIN_REGULATORY, clean up the response text for the user
        if raw_answer.startswith("UNCERTAIN_REGULATORY:"):
            clean_answer = raw_answer.replace("UNCERTAIN_REGULATORY:", "").strip()
            if target_language == "am":
                final_answer = f"{clean_answer}\n\nይህ የሕግ/የደንብ ጥያቄ በመሆኑ እና ትክክለኛ የሕግ ማስረጃዎች ባለመኖራቸው ምክንያት ጉዳዩን ወደ ሕግ ባለሙያ ማስተላለፍ አስፈላጊ ነው።"
            else:
                final_answer = f"{clean_answer}\n\nSince this is a regulatory question without sufficient legal reference in our database, we cannot answer with full confidence. Please consult a verified expert."
            needs_escalation = True
        elif is_regulatory_uncertain and ("regulatory" in answer_lower or "tax" in answer_lower or "law" in answer_lower or len(sources) == 0 and ("article" in user_query.lower() or "tax" in user_query.lower() or "legal" in user_query.lower() or "law" in user_query.lower() or "vat" in user_query.lower() or "license" in user_query.lower())):
            final_answer = raw_answer
            needs_escalation = True
        else:
            final_answer = raw_answer
            needs_escalation = False

        return {
            "answer": final_answer,
            "sources": sources if not needs_escalation else [],
            "context_used": context_str,
            "needs_escalation": needs_escalation,
            "escalation_reason": (
                "The AI could not confidently answer this regulatory question from the available legal sources."
                if needs_escalation
                else None
            ),
        }
