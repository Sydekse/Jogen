from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

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
