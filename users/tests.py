import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.mark.django_db
def test_create_user_success():
    user = User.objects.create_user(
        phone_number="+251911223344", full_name="Abebe Bikila", preferred_language="am"
    )
    assert user.phone_number == "+251911223344"
    assert user.preferred_language == "am"
    assert user.deleted_at is None
    assert user.is_active is True


@pytest.mark.django_db
def test_user_soft_delete():
    user = User.objects.create_user(phone_number="+251911000000")
    user.soft_delete()

    user.refresh_from_db()
    assert user.deleted_at is not None
    assert user.is_active is False


@pytest.mark.django_db
class TestAuthEndpoints:

    @pytest.fixture
    def api_client(self):
        """Creates a fake web browser/client to test API endpoints."""
        return APIClient()

    def test_request_otp_success(self, api_client):
        """Test that requesting an OTP returns 200 and caches the code."""
        url = reverse('request-otp')  # Maps to the name='request-otp' in urls.py

        response = api_client.post(url, {"phone_number": "+251911223344"})

        assert response.status_code == 200
        assert response.data["message"] == "OTP sent successfully."

        # Verify the code was actually saved in the cache/Redis
        cached_code = cache.get("otp_+251911223344")
        assert cached_code is not None
        assert len(cached_code) == 6

    def test_request_otp_invalid_phone_number(self, api_client):
        """Test that bad phone number formats are rejected."""
        url = reverse('request-otp')
        response = api_client.post(url, {"phone_number": "0911223344"}) # Missing +251

        assert response.status_code == 400
        assert "phone_number" in response.data

    def test_verify_otp_success_creates_user(self, api_client):
        """Test that a valid OTP issues JWTs and creates a new user."""
        phone = "+251999888777"

        # 1. Manually insert a mock OTP into the cache to simulate the first step
        cache.set(f"otp_{phone}", "123456", timeout=300)

        # 2. Hit the verify endpoint
        url = reverse('verify-otp')
        response = api_client.post(url, {
            "phone_number": phone,
            "otp_code": "123456"
        })

        # 3. Prove it worked
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["is_new_user"] is True

        # 4. Prove the user was actually saved to PostgreSQL
        assert User.objects.filter(phone_number=phone).exists()

        # 5. Prove the OTP was deleted from cache (security safeguard)
        assert cache.get(f"otp_{phone}") is None

    def test_verify_otp_invalid_code(self, api_client):
        """Test that sending the wrong code fails."""
        phone = "+251944455566"
        cache.set(f"otp_{phone}", "123456", timeout=300)

        url = reverse('verify-otp')
        response = api_client.post(url, {
            "phone_number": phone,
            "otp_code": "000000"  # Wrong code
        })

        assert response.status_code == 400
        assert response.data["error"] == "Invalid OTP code."

    def test_verify_otp_expired_code(self, api_client):
        """Test that verifying a code that isn't in the cache fails."""
        url = reverse('verify-otp')
        response = api_client.post(url, {
            "phone_number": "+251900000000",
            "otp_code": "123456"
        })

        assert response.status_code == 400
        assert response.data["error"] == "OTP expired or does not exist."

    def test_token_refresh_success(self, api_client):
        """Test that a valid refresh token yields a new access AND refresh token."""
        # 1. Create a mock user and generate a manual token
        user = User.objects.create(phone_number="+251900111222")
        refresh = RefreshToken.for_user(user)

        # 2. Hit the refresh endpoint
        url = reverse('token-refresh')
        response = api_client.post(url, {"refresh": str(refresh)})

        # 3. Prove it worked
        assert response.status_code == 200
        assert "access" in response.data
        # Because ROTATE_REFRESH_TOKENS = True in settings, we should get a new refresh token
        assert "refresh" in response.data

    def test_logout_blacklists_token(self, api_client):
        """Test that logging out destroys the token permanently."""
        user = User.objects.create(phone_number="+251900333444")
        refresh = RefreshToken.for_user(user)

        # 1. Hit the logout endpoint
        url = reverse('token-blacklist')
        response = api_client.post(url, {"refresh": str(refresh)})

        # SimpleJWT returns 200 OK on successful blacklist
        assert response.status_code == 200

        # 2. THE ULTIMATE SECURITY TEST: Try to use the dead token to get a new session
        refresh_url = reverse('token-refresh')
        failed_response = api_client.post(refresh_url, {"refresh": str(refresh)})

        # 3. Prove the server rejects it
        assert failed_response.status_code == 401
        assert failed_response.data["code"] == "token_not_valid"