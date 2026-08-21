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
    assert response.data["verification_status"] == "pending"


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


@pytest.mark.django_db
def test_get_experts_returns_only_verified():
    client = APIClient()

    user_unverified = User.objects.create_user(
        phone_number="+251911000001", full_name="Abebe Unverified"
    )
    Expert.objects.create(
        user=user_unverified,
        title="Unverified Lawyer",
        verification_status="unverified",
    )

    user_verified = User.objects.create_user(
        phone_number="+251911000002", full_name="Kebede Verified"
    )
    Expert.objects.create(
        user=user_verified,
        title="Corporate Legal Advisor",
        specialty_tags=["startup_law", "tax"],
        rate_per_session=800.00,
        verification_status="verified",
    )

    # GET /api/v1/experts should only return verified expert
    response = client.get("/api/v1/experts/")
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["full_name"] == "Kebede Verified"


@pytest.mark.django_db
def test_authenticated_expert_is_excluded_from_directory():
    client = APIClient()
    expert_user = User.objects.create_user(
        phone_number="+251911000003", full_name="Current Expert"
    )
    Expert.objects.create(
        user=expert_user,
        title="Current Expert Profile",
        verification_status="verified",
    )

    other_user = User.objects.create_user(
        phone_number="+251911000004", full_name="Other Expert"
    )
    Expert.objects.create(
        user=other_user,
        title="Other Expert Profile",
        verification_status="verified",
    )

    client.force_authenticate(user=expert_user)
    response = client.get("/api/v1/experts/")

    assert response.status_code == 200
    assert [item["full_name"] for item in response.data] == ["Other Expert"]


@pytest.mark.django_db
def test_get_experts_filtering_by_tag_search_and_rate():
    client = APIClient()

    u1 = User.objects.create_user(phone_number="+251911111111", full_name="Expert One")
    Expert.objects.create(
        user=u1,
        title="Tax Specialist",
        specialty_tags=["tax"],
        rate_per_session=300.00,
        verification_status="verified",
    )

    u2 = User.objects.create_user(phone_number="+251911222222", full_name="Expert Two")
    Expert.objects.create(
        user=u2,
        title="Intellectual Property Lawyer",
        specialty_tags=["ip_law"],
        rate_per_session=900.00,
        verification_status="verified",
    )

    # 1. Filter by tag 'tax'
    res_tag = client.get("/api/v1/experts/?tag=tax")
    assert res_tag.status_code == 200
    assert len(res_tag.data) == 1
    assert res_tag.data[0]["full_name"] == "Expert One"

    # 2. Text search 'Intellectual'
    res_search = client.get("/api/v1/experts/?search=Intellectual")
    assert res_search.status_code == 200
    assert len(res_search.data) == 1
    assert res_search.data[0]["full_name"] == "Expert Two"

    # 3. Filter by max rate
    res_rate = client.get("/api/v1/experts/?max_rate=500.00")
    assert res_rate.status_code == 200
    assert len(res_rate.data) == 1
    assert res_rate.data[0]["full_name"] == "Expert One"


@pytest.mark.django_db
def test_get_single_expert_detail_and_availability():
    client = APIClient()

    user = User.objects.create_user(phone_number="+251911333333", full_name="Verified Legal Pro")
    expert = Expert.objects.create(
        user=user,
        title="Senior Tech Attorney",
        bio="Specializing in Ethiopian foreign investment and startup laws.",
        specialty_tags=["startup_law"],
        rate_per_session=1500.00,
        verification_status="verified",
        availability={"tue": ["09:00-12:00"]},
    )

    # GET /api/v1/experts/{id}
    res_detail = client.get(f"/api/v1/experts/{expert.id}")
    assert res_detail.status_code == 200
    assert (
        res_detail.data["bio"] == "Specializing in Ethiopian foreign investment and startup laws."
    )

    # GET /api/v1/experts/{id}/availability
    res_avail = client.get(f"/api/v1/experts/{expert.id}/availability")
    assert res_avail.status_code == 200
    assert res_avail.data["availability"]["tue"] == ["09:00-12:00"]
