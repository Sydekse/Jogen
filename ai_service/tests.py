import pytest
from django.contrib.auth import get_user_model
from pgvector.django import CosineDistance
from rest_framework import status
from rest_framework.test import APIClient

from ai_service.models import LegalDocumentEmbedding

User = get_user_model()


@pytest.mark.django_db
def test_vector_store_similarity_search():
    # 768-dimensional dummy vectors matching your current config
    dummy_vec_1 = [1.0] * 384 + [0.0] * 384
    dummy_vec_2 = [0.0] * 384 + [1.0] * 384

    LegalDocumentEmbedding.objects.create(
        doc_reference="Electronic Invoicing Directive 1142/2026 (English)",
        content_chunk="Rules regarding Electronic Sales Registration Systems...",
        embedding=dummy_vec_1,  # <-- Using the variable here
    )

    LegalDocumentEmbedding.objects.create(
        doc_reference="Electronic Invoicing Directive 1142/2026 (Amharic)",
        content_chunk="የኤሌክትሮኒክ ደረሰኝ ሥርዓት...",
        embedding=dummy_vec_2,  # <-- Using the variable here
    )

    query_vec = [0.9] * 384 + [0.1] * 384

    results = LegalDocumentEmbedding.objects.filter(
        doc_reference__icontains="(English)"
    ).annotate(
        distance=CosineDistance("embedding", query_vec)
    ).order_by("distance")

    assert results.count() == 1
    assert "(English)" in results.first().doc_reference


@pytest.mark.django_db
class TestRAGChatAPI:
    def setup_method(self):
        self.client = APIClient()
        self.url = "/api/ai/chat/"

    def test_rag_chat_endpoint_structure(self):
        # Insert test data so the database returns context
        LegalDocumentEmbedding.objects.create(
            doc_reference="Electronic Invoicing Directive 1142/2026 (English)",
            content_chunk="Software as a Service (SaaS) means a sales registration system...",
            embedding=[0.5] * 768  # <-- Add a dummy embedding here as well
        )

        payload = {
            "query": "What are the rules regarding SaaS providers?",
            "language": "en"
        }

        response = self.client.post(self.url, payload, format="json")

        # Verify response structure and status
        assert response.status_code == status.HTTP_200_OK
        assert "answer" in response.data
        assert "sources" in response.data
        assert "context_used" in response.data