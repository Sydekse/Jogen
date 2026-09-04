import os

import cohere
from google import genai
from pgvector.django import CosineDistance

from .models import LegalDocumentEmbedding


class RAGPipelineService:
    """
    Executes Retrieval-Augmented Generation (RAG) using pgvector,
    Cohere for embeddings, and Google Gemini for chat.
    """

    def __init__(self):
        # Configure the new Gemini Client
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=gemini_api_key)

        # Configure the Cohere Client for embeddings
        cohere_api_key = os.getenv("COHERE_API_KEY")
        try:
            self.cohere_client = cohere.Client(cohere_api_key)
        except Exception:
            self.cohere_client = None

        # Use the current 2026 models
        self.embedding_model = "embed-multilingual-v3.0"
        self.llm_model = "gemini-3.6-flash"

    def generate_embedding(self, text: str) -> list[float]:
        """Generate a 1024-dimensional vector embedding using Cohere API."""
        if not self.cohere_client:
            raise RuntimeError("COHERE_API_KEY is not configured or Cohere client failed to initialize.")
        response = self.cohere_client.embed(
            texts=[text],
            model=self.embedding_model,
            input_type="search_query",
        )
        return response.embeddings[0]

    def retrieve_context(
        self, query_vector: list[float], top_k: int = 7, language: str = "en"
    ) -> list[LegalDocumentEmbedding]:
        """Perform vector cosine distance search in pgvector database."""
        lang_tag = "(English)" if language == "en" else "(Amharic)"
        return (
            LegalDocumentEmbedding.objects.filter(doc_reference__icontains=lang_tag)
            .annotate(distance=CosineDistance("embedding", query_vector))
            .order_by("distance")[:top_k]
        )

    def execute_rag_query(self, user_query: str, target_language: str = "en") -> dict:
        """
        Full RAG Pipeline: Query -> Cohere Embedding -> Vector Search -> Gemini Answer
        """
        # 1. Generate query embedding via Cohere API
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
            f"1. Determine if the User Question is a REGULATORY/LEGAL/TAX question "
            f"(e.g. questions about Ethiopian tax laws, labor laws, business licensing, "
            f"regulations, corporate legal requirements) vs a NON-REGULATORY query "
            f"(greetings, general platform questions, general conversation).\n"
            f"2. IF IT IS A REGULATORY/LEGAL/TAX QUESTION:\n"
            f"   - You MUST rely strictly on the provided Context below to give an accurate, "
            f"confident answer with citations.\n"
            f"   - Make sure to use bullet points instead of paragraphs, "
            f"numbered steps for sequential tasks, and bold headers for topics.\n"
            f"   - If the provided Context is empty, missing, or insufficient to give a "
            f"confident legal answer, start your response with 'UNCERTAIN_REGULATORY:' and "
            f"explain briefly that legal references are insufficient.\n"
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
                final_answer = (
                    f"{clean_answer}\n\n"
                    f"ይህ የሕግ/የደንብ ጥያቄ በመሆኑ እና ትክክለኛ የሕግ ማስረጃዎች ባለመኖራቸው ምክንያት "
                    f"ጉዳዩን ወደ ሕግ ባለሙያ ማስተላለፍ አስፈላጊ ነው።"
                )
            else:
                final_answer = (
                    f"{clean_answer}\n\n"
                    f"Since this is a regulatory question without sufficient legal reference "
                    f"in our database, we cannot answer with full confidence. "
                    f"Please consult a verified expert."
                )
            needs_escalation = True
        else:
            is_query_regulatory = any(
                kw in user_query.lower() for kw in ("article", "tax", "legal", "law", "vat", "license")
            )
            if is_regulatory_uncertain and (
                "regulatory" in answer_lower
                or "tax" in answer_lower
                or "law" in answer_lower
                or (len(sources) == 0 and is_query_regulatory)
            ):
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
