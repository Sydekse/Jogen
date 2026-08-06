import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.db import models


class Expert(models.Model):
    """
    EXPERT entity extending User with regulatory credentialing,
    payout details, and availability matrices (§3.2).
    """

    VERIFICATION_CHOICES = [
        ("unverified", "Unverified"),
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    WALLET_CHOICES = [
        ("telebirr", "Telebirr"),
        ("cbe_birr", "CBE Birr"),
        ("mpesa", "M-Pesa"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expert_profile",
    )
    title = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    license_number = models.CharField(max_length=100, blank=True, null= True)
    specialty_tags = ArrayField(
        models.CharField(max_length=100),
        default=list,
        blank=True,
        help_text="e.g. ['tax', 'startup_law', 'commercial_code']",
    )
    rate_per_session = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    verification_status = models.CharField(
        max_length=20, choices=VERIFICATION_CHOICES, default="unverified"
    )
    wallet_provider = models.CharField(max_length=20, choices=WALLET_CHOICES, default="telebirr")
    wallet_account_number = models.CharField(max_length=100, blank=True)
    availability = models.JSONField(
        default=dict,
        blank=True,
        help_text="Weekly availability slots matrix e.g. {'mon': ['09:00-12:00']}",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "experts_expert"
        indexes = [
            # GIN Index for fast array tag filtering (§3.2, §4.3)
            GinIndex(fields=["specialty_tags"], name="expert_specialty_tags_gin"),
            models.Index(fields=["verification_status"]),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.title} ({self.verification_status})"
