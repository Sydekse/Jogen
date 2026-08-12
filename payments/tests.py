from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from experts.models import Expert
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
