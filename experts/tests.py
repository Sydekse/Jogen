import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from experts.models import Expert

User = get_user_model()


@pytest.mark.django_db
def test_expert_model_creation_and_gin_filter():
    user = User.objects.create_user(phone_number="+251911112233")
    expert = Expert.objects.create(
        user=user,
        title="Tax Consultant",
        specialty_tags=["tax", "audit", "corporate"],
        rate_per_session=500.00,
        wallet_provider="telebirr",
        wallet_account_number="0911112233",
    )

    assert expert.verification_status == "unverified"
    # Query using PostgreSQL array contains filter (utilizes GIN index)
    tax_experts = Expert.objects.filter(specialty_tags__contains=["tax"])
    assert tax_experts.count() == 1
    assert tax_experts.first().user == user


@pytest.mark.django_db
def test_patch_expert_profile_endpoint():
    user = User.objects.create_user(phone_number="+251911223344")
    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        "title": "Senior Regulatory Lawyer",
        "bio": "10 years advising Ethiopian tech startups.",
        "specialty_tags": ["startup_law", "ip_law"],
        "rate_per_session": "1200.00",
        "wallet_provider": "telebirr",
        "wallet_account_number": "0911223344",
    }

    response = client.patch("/api/v1/experts/profile", payload, format="json")
    assert response.status_code == 200
    assert response.data["title"] == "Senior Regulatory Lawyer"
    assert response.data["specialty_tags"] == ["startup_law", "ip_law"]
    assert response.data["verification_status"] == "unverified"


@pytest.mark.django_db
def test_patch_expert_availability_endpoint():
    user = User.objects.create_user(phone_number="+251911334455")
    client = APIClient()
    client.force_authenticate(user=user)

    availability_matrix = {
        "mon": ["09:00-12:00", "14:00-17:00"],
        "wed": ["10:00-13:00"],
    }

    response = client.patch(
        "/api/v1/experts/availability",
        {"availability": availability_matrix},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["availability"]["mon"] == ["09:00-12:00", "14:00-17:00"]
