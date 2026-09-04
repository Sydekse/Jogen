import uuid
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from pgvector.django import CosineDistance
from rest_framework import status
from rest_framework.test import APIClient

from ai_service.models import LegalDocumentEmbedding

User = get_user_model()


@pytest.mark.django_db
def test_vector_store_similarity_search():
    # 1024-dimensional dummy vectors matching Cohere embed-multilingual-v3.0 config
    dummy_vec_1 = [1.0] * 512 + [0.0] * 512
    dummy_vec_2 = [0.0] * 512 + [1.0] * 512

    LegalDocumentEmbedding.objects.create(
        doc_reference="Electronic Invoicing Directive 1142/2026 (English)",
        content_chunk="Rules regarding Electronic Sales Registration Systems...",
        embedding=dummy_vec_1,
    )

    LegalDocumentEmbedding.objects.create(
        doc_reference="Electronic Invoicing Directive 1142/2026 (Amharic)",
        content_chunk="የኤሌክትሮኒክ ደረሰኝ ሥርዓት...",
        embedding=dummy_vec_2,
    )

    query_vec = [0.9] * 512 + [0.1] * 512

    results = (
        LegalDocumentEmbedding.objects.filter(doc_reference__icontains="(English)")
        .annotate(distance=CosineDistance("embedding", query_vec))
        .order_by("distance")
    )

    assert results.count() == 1
    assert "(English)" in results.first().doc_reference


@pytest.mark.django_db
class TestRAGChatAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone_number="+251911223344")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("rag_chat")

    @patch("ai_service.services.cohere.Client")
    @patch("ai_service.services.genai.Client")
    def test_rag_chat_endpoint_structure(self, mock_genai_client, mock_cohere_client):
        # 1. Mock the Gemini & Cohere SDK responses to avoid live API calls
        mock_client_instance = mock_genai_client.return_value
        mock_cohere_instance = mock_cohere_client.return_value

        mock_embed_response = MagicMock()
        mock_embed_response.embeddings = [[0.5] * 1024]
        mock_cohere_instance.embed.return_value = mock_embed_response

        mock_interaction_result = MagicMock()
        mock_interaction_result.output_text = "Mocked answer about SaaS providers."
        mock_client_instance.interactions.create.return_value = mock_interaction_result

        # 2. Insert test data so the database returns context
        LegalDocumentEmbedding.objects.create(
            doc_reference="Electronic Invoicing Directive 1142/2026 (English)",
            content_chunk="Software as a Service (SaaS) means a sales registration system...",
            embedding=[0.5] * 1024,
        )

        payload = {
            "query": "What are the rules regarding SaaS providers?",
            "language": "en",
            "session_id": str(uuid.uuid4()),
        }

        response = self.client.post(self.url, payload, format="json")

        # 3. Verify response structure and status
        assert response.status_code == status.HTTP_200_OK
        assert "answer" in response.data
        assert "sources" in response.data
        assert "context_used" in response.data
