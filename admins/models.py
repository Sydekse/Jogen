import uuid

from django.conf import settings
from django.db import models

from bookings.models import Booking


class Dispute(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("frozen", "Escrow Frozen"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
    ]

    RESOLUTION_CHOICES = [
        ("full_refund", "Full Refund to Client"),
        ("full_release", "Full Release to Expert"),
        ("split_50_50", "Split 50/50"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="dispute_record",
    )
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="raised_disputes",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    reason = models.TextField()
    call_drop_summary = models.JSONField(
        default=dict,
        blank=True,
        help_text="Timestamped telemetry and call drop logs for compliance auditing",
    )
    resolution_action = models.CharField(
        max_length=30, choices=RESOLUTION_CHOICES, blank=True, null=True
    )
    admin_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_disputes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "admins_dispute"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Dispute {self.id} - Booking {self.booking.id} ({self.status})"