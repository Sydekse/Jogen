import uuid

from django.conf import settings
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
    embedding = VectorField(dimensions=768)
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


class ChatMessage(models.Model):
    """
    CHAT_MESSAGE entity storing pre-booking AI chats and session communications (§3.2).
    """

    CONTEXT_CHOICES = [
        ("ai_chat", "AI Chat"),
        ("session_chat", "Session Chat"),
    ]

    ROLE_CHOICES = [
        ("user", "User"),
        ("expert", "Expert"),
        ("ai", "AI"),
        ("system", "System"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.UUIDField(null=True, blank=True, db_index=True)
    booking_id = models.UUIDField(null=True, blank=True, db_index=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
        db_index=True,
    )
    context_type = models.CharField(max_length=20, choices=CONTEXT_CHOICES, default="ai_chat")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "chat_message"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["booking_id", "sender", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.context_type}] {self.role}: {self.content[:30]}"
