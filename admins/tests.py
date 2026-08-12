from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from experts.models import Expert

from .retention import AdminRetentionService

User = get_user_model()


@pytest.mark.django_db
def test_non_staff_user_forbidden_from_admin_endpoints():
    user = User.objects.create_user(phone_number="+251911112233", is_staff=False)
    client = APIClient()
    client.force_authenticate(user=user)

    res = client.get("/api/v1/admin/experts")
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
    res_list = admin_client.get("/api/v1/admin/experts?verification_status=pending")
    assert res_list.status_code == status.HTTP_200_OK
    data = res_list.data["results"] if "results" in res_list.data else res_list.data
    assert len(data) == 1

    # 2. Grant verified badge
    res_verify = admin_client.patch(
        f"/api/v1/admin/experts/{expert.id}",
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
