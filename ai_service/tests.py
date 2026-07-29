# ai_service/tests.py
import pytest
from pgvector.django import CosineDistance

from ai_service.models import LegalDocumentEmbedding


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
