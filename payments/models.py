import uuid

from django.db import models

from bookings.models import Booking


class EscrowTransaction(models.Model):
    STATUS_CHOICES = [
        ("initiated", "Initiated"),
        ("held", "Held in Escrow"),
        ("released", "Released to Expert"),
        ("refunded", "Refunded to Client"),
        ("failed", "Payment Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="escrow_transaction",
    )
    tx_ref = models.CharField(max_length=100, unique=True, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="ETB")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="initiated")
    chapa_checkout_url = models.URLField(max_length=500, blank=True, null=True)
    raw_provider_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_escrow_transaction"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tx_ref} - {self.booking.id} ({self.status})"
