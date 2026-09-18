import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

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


class UserWallet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet",
    )
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    reserved_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    currency = models.CharField(max_length=10, default="ETB")
    is_frozen = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_user_wallet"
        verbose_name = "User Wallet"
        verbose_name_plural = "User Wallets"

    @property
    def available_balance(self) -> Decimal:
        return self.balance - self.reserved_balance

    def __str__(self):
        return f"Wallet ({self.user.phone_number or self.user.email}) - Bal: {self.balance} {self.currency}"


class WalletTransaction(models.Model):
    TYPE_CHOICES = [
        ("topup", "Top-Up"),
        ("booking_hold", "Booking Pre-Authorization Hold"),
        ("booking_charge", "Booking Final Charge"),
        ("booking_refund_release", "Unused Reserved Balance Release"),
        ("expert_payout", "Expert Consultation Earnings"),
        ("withdrawal", "Balance Withdrawal"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("reversed", "Reversed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        UserWallet,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    running_balance = models.DecimalField(max_digits=12, decimal_places=2)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wallet_transactions",
    )
    reference = models.CharField(max_length=100, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="completed")
    raw_provider_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "payments_wallet_transaction"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} {self.wallet.currency} ({self.status})"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_wallet(sender, instance, created, **kwargs):
    if created:
        UserWallet.objects.get_or_create(user=instance)

