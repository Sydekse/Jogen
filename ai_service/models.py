import uuid

from django.db import models
from pgvector.django import HnswIndex, VectorField


class LegalDocumentEmbedding(models.Model):
    """
    Stores legal, tax, and regulatory text chunks alongside vector embeddings
    for RAG similarity retrieval.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    doc_reference = models.CharField(
        max_length=255, help_text="e.g. Startup Proclamation No. 1396/2025"
    )
    content_chunk = models.TextField()
    category = models.CharField(max_length=100, help_text="e.g. tax, startup_law, fx_law")

    # OpenAI text-embedding-3-small generates 1536-dimensional vectors
    embedding = VectorField(dimensions=1536)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_legal_document_embedding"
        indexes = [
            # Use HnswIndex specifically for vector similarity indexing
            HnswIndex(
                name="legal_doc_vec_hnsw_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self):
        return f"{self.doc_reference} - {self.title}"
