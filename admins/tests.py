from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from experts.models import Expert
from payments.models import EscrowTransaction

from .models import Dispute
from .retention import AdminRetentionService
from .utils import DisputeTelemetryGenerator

User = get_user_model()


@pytest.mark.django_db
def test_non_staff_user_forbidden_from_admin_endpoints():
    user = User.objects.create_user(phone_number="+251911112233", is_staff=False)
    client = APIClient()
    client.force_authenticate(user=user)

    res = client.get("/api/v1/admin/experts/")
    assert res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_compliance_admin_can_list_and_verify_expert():
    admin = User.objects.create_user(phone_number="+251911000000", is_staff=True)
    expert_user = User.objects.create_user(phone_number="+251911445566")

    expert = Expert.objects.create(
        user=expert_user,
        title="Dr. Bekele Legal Advisor",
        license_number="LIC-123456",
        verification_status="pending",
        wallet_provider="telebirr",
        wallet_account_number="+251911445566",
    )

    admin_client = APIClient()
    admin_client.force_authenticate(user=admin)

    # 1. Filter pending experts
    res_list = admin_client.get("/api/v1/admin/experts/?verification_status=pending")
    assert res_list.status_code == status.HTTP_200_OK
    data = res_list.data["results"] if "results" in res_list.data else res_list.data
    assert len(data) == 1

    # 2. Grant verified badge
    res_verify = admin_client.patch(
        f"/api/v1/admin/experts/{expert.id}/",
        {"verification_status": "verified"},
        format="json",
    )
    assert res_verify.status_code == status.HTTP_200_OK
    assert res_verify.data["verification_status"] == "verified"

    expert.refresh_from_db()
    assert expert.verification_status == "verified"


@patch("admins.retention.boto3.client")
def test_admin_s3_retention_policy_configuration(mock_boto_client):
    mock_s3 = mock_boto_client.return_value
    retention_service = AdminRetentionService()

    success = retention_service.apply_s3_verification_docs_lifecycle_rule(days=30)
    assert success is True
    mock_s3.put_bucket_lifecycle_configuration.assert_called_once()


@pytest.mark.django_db
class TestAdminDisputeEngine:

    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(phone_number="+251911000000", is_staff=True)
        self.client_user = User.objects.create_user(phone_number="+251911889900")
        self.expert_user = User.objects.create_user(phone_number="+251911445566")
        self.expert = Expert.objects.create(
            user=self.expert_user,
            title="Tax Expert",
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
            tx_ref="JOGEN-ESCROW-DISPUTETEST",
            amount=Decimal("1012.50"),
            status="held",
        )
        self.dispute = Dispute.objects.create(
            booking=self.booking,
            raised_by=self.client_user,
            status="open",
            reason="Call dropped early.",
            call_drop_summary=DisputeTelemetryGenerator.generate_summary(self.booking),
        )

    def test_compliance_admin_can_list_disputes(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/v1/admin/disputes/?status=open")
        assert res.status_code == status.HTTP_200_OK
        data = res.data["results"] if "results" in res.data else res.data
        assert len(data) == 1
        assert "call_drop_summary" in data[0]

    @patch("payments.chapa_service.ChapaService.refund_client")
    def test_compliance_admin_can_resolve_dispute_with_full_refund(self, mock_refund):
        mock_refund.return_value = {"status": "success"}

        self.client.force_authenticate(user=self.admin)
        payload = {
            "status": "resolved",
            "resolution_action": "full_refund",
            "admin_notes": "Full refund issued.",
        }
        res = self.client.patch(f"/api/v1/admin/disputes/{self.dispute.id}/", payload, format="json")

        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "resolved"
        assert res.data["resolution_action"] == "full_refund"

        self.escrow_tx.refresh_from_db()
        self.booking.refresh_from_db()
        assert self.escrow_tx.status == "refunded"
        assert self.booking.status == "cancelled"

    @patch("payments.chapa_service.ChapaService.refund_client")
    @patch("payments.chapa_service.ChapaService.transfer_to_expert")
    def test_compliance_admin_can_resolve_dispute_with_split_50_50(self, mock_payout, mock_refund):
        mock_refund.return_value = {"status": "success"}
        mock_payout.return_value = {"status": "success"}

        self.client.force_authenticate(user=self.admin)
        payload = {
            "status": "resolved",
            "resolution_action": "split_50_50",
            "admin_notes": "Split fifty-fifty.",
        }
        res = self.client.patch(f"/api/v1/admin/disputes/{self.dispute.id}/", payload, format="json")

        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "resolved"
        assert res.data["resolution_action"] == "split_50_50"

        self.escrow_tx.refresh_from_db()
        self.booking.refresh_from_db()
        assert self.escrow_tx.status == "released"
        assert self.booking.status == "completed"