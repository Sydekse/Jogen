from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from bookings.models import Booking
from experts.models import Expert

User = get_user_model()


@pytest.mark.django_db
def test_create_booking_locks_rate_snapshot():
    client_user = User.objects.create_user(phone_number="+251911110000")
    expert_user = User.objects.create_user(phone_number="+251911220000")

    expert = Expert.objects.create(
        user=expert_user,
        title="Tax Consultant",
        rate_per_session=1000.00,
        verification_status="verified",
    )

    api_client = APIClient()
    api_client.force_authenticate(user=client_user)

    start_time = timezone.now() + timedelta(days=1)
    end_time = start_time + timedelta(minutes=30)

    payload = {
        "expert_id": str(expert.id),
        "channel": "voice",
        "scheduled_start": start_time.isoformat(),
        "scheduled_end": end_time.isoformat(),
    }

    response = api_client.post("/api/v1/consultations/", payload, format="json")
    assert response.status_code == 201
    assert response.data["rate_snapshot"] == "1000.00"
    assert response.data["status"] == "pending_payment"


@pytest.mark.django_db
def test_double_booking_prevention():
    client_1 = User.objects.create_user(phone_number="+251911111111")
    client_2 = User.objects.create_user(phone_number="+251911222222")
    expert_user = User.objects.create_user(phone_number="+251911333333")

    expert = Expert.objects.create(
        user=expert_user,
        title="Corporate Lawyer",
        rate_per_session=1500.00,
        verification_status="verified",
    )

    start_time = timezone.now() + timedelta(days=2)
    end_time = start_time + timedelta(minutes=30)

    # First booking reservation succeeds
    api_1 = APIClient()
    api_1.force_authenticate(user=client_1)
    res1 = api_1.post(
        "/api/v1/consultations/",
        {
            "expert_id": str(expert.id),
            "scheduled_start": start_time.isoformat(),
            "scheduled_end": end_time.isoformat(),
        },
        format="json",
    )
    assert res1.status_code == 201

    # Second booking reservation on overlapping time fails
    api_2 = APIClient()
    api_2.force_authenticate(user=client_2)
    res2 = api_2.post(
        "/api/v1/consultations/",
        {
            "expert_id": str(expert.id),
            "scheduled_start": start_time.isoformat(),
            "scheduled_end": end_time.isoformat(),
        },
        format="json",
    )
    assert res2.status_code == 400
    assert "slot" in res2.data


@pytest.mark.django_db
@patch("bookings.views.S3StorageService")
def test_session_file_upload_and_download_flow(mock_s3_cls):
    mock_s3 = mock_s3_cls.return_value
    mock_s3.generate_presigned_upload_url.return_value = "https://s3.amazonaws.com/mock-upload-url"
    mock_s3.generate_presigned_download_url.return_value = (
        "https://s3.amazonaws.com/mock-download-url"
    )

    client_user = User.objects.create_user(phone_number="+251911444444")
    expert_user = User.objects.create_user(phone_number="+251911555555")
    expert = Expert.objects.create(user=expert_user, verification_status="verified")

    start_time = timezone.now() + timedelta(days=1)
    booking = Booking.objects.create(
        client=client_user,
        expert=expert,
        scheduled_start=start_time,
        scheduled_end=start_time + timedelta(minutes=30),
        rate_snapshot=500.00,
    )

    client_api = APIClient()
    client_api.force_authenticate(user=client_user)

    # 1. Request presigned upload URL
    res_url = client_api.post(
        f"/api/v1/consultations/{booking.id}/files/upload-url/",
        {
            "file_name": "business_tax_cert.pdf",
            "file_size": 1024500,
            "mime_type": "application/pdf",
        },
        format="json",
    )
    assert res_url.status_code == 200
    assert "upload_url" in res_url.data
    s3_key = res_url.data["s3_key"]

    # 2. Register uploaded file metadata
    res_reg = client_api.post(
        f"/api/v1/consultations/{booking.id}/files/",
        {
            "file_name": "business_tax_cert.pdf",
            "file_size": 1024500,
            "mime_type": "application/pdf",
            "s3_key": s3_key,
        },
        format="json",
    )
    assert res_reg.status_code == 201
    file_id = res_reg.data["id"]

    # 3. Request presigned download URL
    res_download = client_api.get(f"/api/v1/consultations/{booking.id}/files/{file_id}/download-url/")
    assert res_download.status_code == 200
    assert res_download.data["download_url"] == "https://s3.amazonaws.com/mock-download-url"


@pytest.mark.django_db
def test_unauthorized_user_cannot_access_session_files():
    client_user = User.objects.create_user(phone_number="+251911666666")
    unauthorized_user = User.objects.create_user(phone_number="+251911777777")
    expert_user = User.objects.create_user(phone_number="+251911888888")
    expert = Expert.objects.create(user=expert_user, verification_status="verified")

    start_time = timezone.now() + timedelta(days=1)
    booking = Booking.objects.create(
        client=client_user,
        expert=expert,
        scheduled_start=start_time,
        scheduled_end=start_time + timedelta(minutes=30),
        rate_snapshot=500.00,
    )

    unauth_api = APIClient()
    unauth_api.force_authenticate(user=unauthorized_user)

    res = unauth_api.get(f"/api/v1/consultations/{booking.id}/files/")
    assert res.status_code == 404
