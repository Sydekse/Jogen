import uuid

from django.conf import settings
from django.db import models


class Booking(models.Model):
    """
    BOOKING entity for micro-consulting sessions.
    """

    STATUS_CHOICES = [
        ("pending_payment", "Pending Payment"),
        ("escrowed", "Escrowed"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("disputed", "Disputed"),
    ]

    CHANNEL_CHOICES = [
        ("voice", "Voice"),
        ("video", "Video"),
        ("chat", "Chat"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_bookings",
        db_index=True,
    )
    expert = models.ForeignKey(
        "experts.Expert",
        on_delete=models.CASCADE,
        related_name="expert_bookings",
        db_index=True,
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default="voice")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending_payment", db_index=True
    )
    scheduled_start = models.DateTimeField(db_index=True)
    scheduled_end = models.DateTimeField(db_index=True)

    # Locked snapshot of rate at booking creation time
    rate_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Flat rate or per-session snapshot locked at booking time.",
    )
    cancellation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bookings_booking"
        ordering = ["-scheduled_start"]
        indexes = [
            models.Index(
                fields=["expert", "scheduled_start", "scheduled_end"],
                name="idx_booking_expert_schedule",
            ),
            models.Index(
                fields=["client", "status"],
                name="idx_booking_client_status",
            ),
        ]

    def __str__(self):
        return f"Booking {self.id} | Client: {self.client.phone_number} | Status: {self.status}"


class SessionFile(models.Model):
    """
    SESSION_FILE entity storing file metadata for documents shared
    during or prior to a consultation session.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="session_files",
        db_index=True,
    )
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="uploaded_session_files",
        db_index=True,
    )
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)
    s3_key = models.CharField(max_length=512, unique=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "bookings_session_file"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.file_name} ({self.file_size} bytes) - Booking {self.booking_id}"
