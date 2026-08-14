from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from experts.models import Expert
from payments.calculator import PrecisionEscrowCalculator
from payments.models import EscrowTransaction

User = get_user_model()


@pytest.mark.django_db
class TestChapaEscrowEngine:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone_number="+251911889900")
        self.expert_user = User.objects.create_user(phone_number="+251911445566")
        self.expert = Expert.objects.create(
            user=self.expert_user,
            title="Corporate Lawyer",
            rate_per_session=1000.00,
            wallet_provider="telebirr",
            wallet_account_number="+251911445566",
        )
        self.booking = Booking.objects.create(
            client=self.user,
            expert=self.expert,
            channel="voice",
            scheduled_start=timezone.now(),
            scheduled_end=timezone.now() + timezone.timedelta(minutes=30),
            rate_snapshot=1000.00,
            status="pending_payment",
        )
        self.client.force_authenticate(user=self.user)

    @patch("payments.chapa_service.ChapaService.initialize_payment")
    def test_initialize_escrow_payment(self, mock_chapa_init):
        mock_chapa_init.return_value = {
            "checkout_url": "https://checkout.chapa.co/checkout/payment/123",
            "raw_response": {"status": "success"},
        }

        payload = {"booking_id": str(self.booking.id)}
        res = self.client.post("/api/v1/payments/initialize", payload, format="json")

        assert res.status_code == status.HTTP_201_CREATED
        assert "checkout_url" in res.data
        assert EscrowTransaction.objects.filter(booking=self.booking).exists()

    @patch("payments.chapa_service.ChapaService.verify_transaction")
    def test_chapa_webhook_locks_funds_in_escrow(self, mock_verify):
        mock_verify.return_value = {"status": "success", "amount": 1000.00}

        tx = EscrowTransaction.objects.create(
            booking=self.booking,
            tx_ref="JOGEN-ESCROW-TEST12345",
            amount=1000.00,
            status="initiated",
        )

        res = self.client.post(
            "/api/v1/payments/webhook",
            {"tx_ref": "JOGEN-ESCROW-TEST12345"},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        tx.refresh_from_db()
        self.booking.refresh_from_db()

        assert tx.status == "held"
        assert self.booking.status == "escrowed"


@pytest.mark.django_db
class TestWalletAndDropCallEscrow:

    def setup_method(self):
        self.client = APIClient()
        self.client_user = User.objects.create_user(phone_number="+251911889900")
        self.expert_user = User.objects.create_user(phone_number="+251911445566")
        self.expert = Expert.objects.create(
            user=self.expert_user,
            title="Senior Corporate Counsel",
            rate_per_session=Decimal("1000.00"),
            wallet_provider="telebirr",
            wallet_account_number="+251911445566",
        )
        self.booking = Booking.objects.create(
            client=self.client_user,
            expert=self.expert,
            channel="voice",
            scheduled_start=timezone.now(),
            scheduled_end=timezone.now() + timezone.timedelta(minutes=30),
            rate_snapshot=Decimal("1000.00"),
            status="escrowed",
        )
        self.escrow_tx = EscrowTransaction.objects.create(
            booking=self.booking,
            tx_ref="JOGEN-ESCROW-DROPTEST123",
            amount=Decimal("1000.00"),
            status="held",
        )

    @patch("payments.chapa_service.ChapaService.verify_account_ownership")
    def test_expert_can_link_verified_telebirr_wallet(self, mock_verify):
        mock_verify.return_value = {"valid": True, "account_name": "Dr. Bekele"}

        self.client.force_authenticate(user=self.expert_user)
        payload = {
            "wallet_provider": "telebirr",
            "wallet_account_number": "+251911998877",
        }
        res = self.client.post("/api/v1/payments/wallet", payload, format="json")

        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "verified_and_linked"

        self.expert.refresh_from_db()
        assert self.expert.wallet_account_number == "+251911998877"

    def test_non_expert_cannot_link_wallet(self):
        self.client.force_authenticate(user=self.client_user)
        payload = {
            "wallet_provider": "telebirr",
            "wallet_account_number": "+251911998877",
        }
        res = self.client.post("/api/v1/payments/wallet", payload, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    @patch("payments.chapa_service.ChapaService.refund_client")
    def test_drop_call_tier1_grace_period_triggers_full_refund(self, mock_refund):
        mock_refund.return_value = {"status": "success"}

        self.client.force_authenticate(user=self.client_user)
        res = self.client.post(
            f"/api/v1/payments/{self.booking.id}/session-end",
            {"duration_seconds": 60},  # 60 seconds (< 120s grace period)
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        assert res.data["decision"] == "grace_period_refund"
        assert res.data["client_refund"] == "1000.00"

        self.escrow_tx.refresh_from_db()
        self.booking.refresh_from_db()
        assert self.escrow_tx.status == "refunded"
        assert self.booking.status == "cancelled"

    @patch("payments.chapa_service.ChapaService.transfer_to_expert")
    @patch("payments.chapa_service.ChapaService.refund_client")
    def test_drop_call_tier2_prorated_split(self, mock_refund, mock_payout):
        mock_refund.return_value = {"status": "success"}
        mock_payout.return_value = {"status": "success"}

        self.client.force_authenticate(user=self.client_user)
        res = self.client.post(
            f"/api/v1/payments/{self.booking.id}/session-end",
            {"duration_seconds": 900},  # 15 minutes (900s)
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        assert res.data["decision"] == "prorated_adjustment"
        assert res.data["gross_earned"] == "500.00"
        assert res.data["client_refund"] == "500.00"
        assert res.data["expert_payout"] == "450.00"

        self.escrow_tx.refresh_from_db()
        self.booking.refresh_from_db()
        assert self.escrow_tx.status == "released"
        assert self.booking.status == "completed"

    @patch("payments.chapa_service.ChapaService.transfer_to_expert")
    def test_drop_call_tier3_full_completion(self, mock_payout):
        mock_payout.return_value = {"status": "success"}

        self.client.force_authenticate(user=self.client_user)
        res = self.client.post(
            f"/api/v1/payments/{self.booking.id}/session-end",
            {"duration_seconds": 1680},  # 28 minutes (>= 1620s threshold)
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        assert res.data["decision"] == "full_completion"
        assert res.data["client_refund"] == "0.00"
        assert res.data["platform_fee"] == "100.00"
        assert res.data["expert_payout"] == "900.00"

        self.escrow_tx.refresh_from_db()
        self.booking.refresh_from_db()
        assert self.escrow_tx.status == "released"
        assert self.booking.status == "completed"


class TestPrecisionEscrowCalculator:
    """
    Verifies pro-rata math, rounding, and financial invariant constraints.
    """

    def test_arbitrary_second_precision(self):
        res = PrecisionEscrowCalculator.calculate(
            total_deposit=Decimal("750.50"),
            duration_seconds=423,
        )
        assert res.decision == "prorated_adjustment"
        assert res.gross_earned == Decimal("176.37")
        assert res.client_refund == Decimal("574.13")
        assert res.platform_fee == Decimal("17.64")
        assert res.expert_payout == Decimal("158.73")

        # Invariant check
        assert res.client_refund + res.expert_payout + res.platform_fee == Decimal("750.50")