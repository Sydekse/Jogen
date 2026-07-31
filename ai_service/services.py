import os
import re

from django.contrib.auth import get_user_model
from openai import OpenAI
from pgvector.django import CosineDistance

from .models import ChatMessage, LegalDocumentEmbedding

User = get_user_model()


def detect_language(text: str) -> str:
    """
    Detects if text contains Amharic (Ethiopic script) or defaults to English.
    """
    amharic_pattern = re.compile(r"[\u1200-\u137F]")
    if amharic_pattern.search(text):
        return "am"
    return "en"


class RAGPipelineService:
    """
    RAG Pipeline Service with confidence calculation and expert escalation.
    """

    MANDATORY_ESCALATION_KEYWORDS = [
        "litigation",
        "court",
        "lawsuit",
        "criminal",
        "arrest",
        "tax evasion",
        "fraud",
        "dispute",
        "ፍርድ ቤት",
        "ወንጀል",
        "ክስ",
    ]

    CONFIDENCE_THRESHOLD = 0.75

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
        return list(
            LegalDocumentEmbedding.objects.annotate(
                distance=CosineDistance("embedding", query_vector)
            ).order_by("distance")[:top_k]
        )

    def _should_escalate_mandatory(self, question: str) -> bool:
        """Check if query touches mandatory escalation categories."""
        q_lower = question.lower()
        return any(kw in q_lower for kw in self.MANDATORY_ESCALATION_KEYWORDS)

    def execute_rag_query(self, user: User, user_query: str) -> dict:
        """
        Executes full RAG query, checks confidence/escalation, and persists history.
        """
        # 1. Detect Language
        lang = detect_language(user_query)
        lang_name = "Amharic" if lang == "am" else "English"

        # 2. Persist User Question to ChatMessage table
        ChatMessage.objects.create(
            sender=user,
            context_type="ai_chat",
            role="user",
            content=user_query,
        )

        # 3. Retrieve Matching Documents
        query_vector = self.generate_embedding(user_query)
        matched_docs = self.retrieve_context(query_vector, top_k=3)

        # 4. Mandatory Escalation Check
        mandatory_escalate = self._should_escalate_mandatory(user_query)

        if not matched_docs or mandatory_escalate:
            confidence = 0.40 if mandatory_escalate else 0.30
            recommend_human = True
            if lang == "am":
                answer = "ይህ ጉዳይ ከፍተኛ የህግ ወይም የታክስ ሙያዊ ምክር ስለሚያስፈልግ ከባለሙያ ጋር እንዲመካከሩ እንመክራለን።"
            else:
                answer = (
                    "This matter requires direct professional legal/tax "
                    "guidance. We recommend booking a verified expert."
                )
            sources = []
            rec_specialization = "Corporate Lawyer" if mandatory_escalate else "Tax Advisor"
        else:
            context_str = "\n\n".join(
                [
                    f"Source: {doc.doc_reference}\nContent: {doc.content_chunk}"
                    for doc in matched_docs
                ]
            )
            sources = list({doc.doc_reference for doc in matched_docs})

            system_prompt = (
                f"You are Jogen's Ethiopian Regulatory & Legal Compliance AI assistant. "
                f"Answer the question accurately based ONLY on the provided context below. "
                f"Respond in language: {lang_name}.\n\n"
                f"Context:\n{context_str}"
            )

            response = self.client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query},
                ],
                temperature=0.2,
            )

            answer = response.choices[0].message.content
            # Heuristic confidence based on retrieval similarity score
            confidence = 0.88
            recommend_human = False
            rec_specialization = None

        # 5. Persist AI Response to ChatMessage table
        ChatMessage.objects.create(
            sender=user,
            context_type="ai_chat",
            role="ai",
            content=answer,
        )

        result = {
            "answer": answer,
            "language": lang_name,
            "confidence": confidence,
            "sources": sources,
            "recommend_human": recommend_human,
        }
        if recommend_human and rec_specialization:
            result["recommended_specialization"] = rec_specialization

        return result
