from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from pgvector.django import CosineDistance
from rest_framework.test import APIClient

from ai_service.models import ChatMessage, LegalDocumentEmbedding
from ai_service.services import detect_language

User = get_user_model()


def test_language_detection():
    assert detect_language("How do I pay business tax?") == "en"
    assert detect_language("የንግድ ታክስ እንዴት ነው የምከፍለው?") == "am"


@pytest.mark.django_db
def test_vector_store_similarity_search():
    dummy_vec_1 = [1.0] * 768 + [0.0] * 768
    dummy_vec_2 = [0.0] * 768 + [1.0] * 768

    LegalDocumentEmbedding.objects.create(
        title="Startup Proclamation Excerpt",
        doc_reference="Proclamation No. 1396/2025",
        content_chunk="Tax incentives for tech startups...",
        category="startup_law",
        embedding=dummy_vec_1,
    )

    LegalDocumentEmbedding.objects.create(
        title="Commercial Code Excerpt",
        doc_reference="Commercial Code 2021",
        content_chunk="General business registration requirements...",
        category="commercial_code",
        embedding=dummy_vec_2,
    )

    query_vec = [0.9] * 768 + [0.1] * 768

    results = LegalDocumentEmbedding.objects.annotate(
        distance=CosineDistance("embedding", query_vec)
    ).order_by("distance")

    assert results.count() == 2
    assert results.first().doc_reference == "Proclamation No. 1396/2025"


@pytest.mark.django_db
@patch("ai_service.services.OpenAI")
def test_chat_query_endpoint(mock_openai):
    # Mock OpenAI client response
    mock_instance = MagicMock()
    mock_openai.return_value = mock_instance
    mock_instance.embeddings.create.return_value.data = [MagicMock(embedding=[0.1] * 1536)]
    mock_instance.chat.completions.create.return_value.choices = [
        MagicMock(message=MagicMock(content="Test response from GPT"))
    ]

    # Create a dummy embedding so matched_docs is not empty
    LegalDocumentEmbedding.objects.create(
        title="Business Reg Code",
        doc_reference="Commercial Code 2021",
        content_chunk="Business registration requires step A and B.",
        category="registration",
        embedding=[0.1] * 1536,
    )

    user = User.objects.create_user(phone_number="+251911999999")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/v1/chat/query",
        {"question": "How do I register a business?"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["answer"] == "Test response from GPT"
    assert response.data["language"] == "English"
    assert response.data["recommend_human"] is False

    # Check persistence in database
    assert ChatMessage.objects.filter(sender=user, context_type="ai_chat").count() == 2


@pytest.mark.django_db
@patch("ai_service.services.OpenAI")
def test_chat_mandatory_escalation(mock_openai):
    mock_instance = MagicMock()
    mock_openai.return_value = mock_instance
    mock_instance.embeddings.create.return_value.data = [MagicMock(embedding=[0.1] * 1536)]

    user = User.objects.create_user(phone_number="+251911888888")
    client = APIClient()
    client.force_authenticate(user=user)

    # Query with mandatory escalation keyword "lawsuit"
    response = client.post(
        "/api/v1/chat/query",
        {"question": "I am facing a lawsuit in court"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["recommend_human"] is True
    assert response.data["recommended_specialization"] == "Corporate Lawyer"


@pytest.mark.django_db
def test_chat_history_endpoint():
    user = User.objects.create_user(phone_number="+251911777777")
    ChatMessage.objects.create(sender=user, context_type="ai_chat", role="user", content="Hello AI")
    ChatMessage.objects.create(sender=user, context_type="ai_chat", role="ai", content="Hello User")

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/v1/chat/history")
    assert response.status_code == 200
    assert len(response.data) == 2
    assert response.data[0]["content"] == "Hello AI"
