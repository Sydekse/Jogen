from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RequestOTPSerializer, VerifyOTPSerializer
from .utils import generate_otp, send_sms

User = get_user_model()


class OTPRateThrottle(AnonRateThrottle):
    # Limits requests to 5 per minute to prevent SMS bombing
    rate = "5/min"


class RequestOTPView(APIView):
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone_number = serializer.validated_data["phone_number"]

        # 1. Generate the 6-digit code
        otp_code = generate_otp()

        # 2. Save code to Redis with a 5-minute (300s) TTL
        cache_key = f"otp_{phone_number}"
        cache.set(cache_key, otp_code, timeout=300)

        # 3. Trigger mock SMS delivery
        send_sms(phone_number, otp_code)

        return Response({"message": "OTP sent successfully."}, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone_number = serializer.validated_data["phone_number"]
        submitted_otp = serializer.validated_data["otp_code"]

        # 1. Fetch code from Redis
        cache_key = f"otp_{phone_number}"
        cached_otp = cache.get(cache_key)

        # 2. Validate expiration and match
        if cached_otp is None:
            return Response(
                {"error": "OTP expired or does not exist."}, status=status.HTTP_400_BAD_REQUEST
            )

        if str(cached_otp) != str(submitted_otp):
            return Response({"error": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Delete code from Redis (one-time use safeguard)
        cache.delete(cache_key)

        # 4. Fetch existing user or create a new user row in PostgreSQL
        user, created = User.objects.get_or_create(phone_number=phone_number)

        # 5. Issue JWT access and refresh tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {"is_new_user": created, "access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_200_OK,
        )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Build the absolute URL for the image so React can render it directly
        profile_picture_url = (
            request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None
        )

        data = {
            "id": str(user.id),
            "phone_number": user.phone_number,
            "full_name": user.full_name,
            "email": user.email,  # Included the newly added email
            "profile_picture": profile_picture_url,  # Included the image URL
            "preferred_language": user.preferred_language,
            "is_expert": False,
            "is_admin": user.is_staff or user.is_superuser,
        }

        # Check if user has an expert profile
        if hasattr(user, "expert_profile"):
            expert = user.expert_profile
            data["is_expert"] = True
            data["expert_data"] = {
                "id": str(expert.id),
                "title": expert.title,
                "bio": expert.bio,
                "rate": str(expert.rate_per_session),
                "verification_status": expert.verification_status,
                "specialty_tags": expert.specialty_tags,
                "availability": expert.availability,
                "wallet_provider": expert.wallet_provider,
                "wallet_account_number": expert.wallet_account_number,
                "wallet_balance": str(expert.wallet_balance),
            }

        return Response(data, status=status.HTTP_200_OK)


class UpdateProfileView(APIView):
    # This ensures only logged-in users with a valid JWT token can access this view
    permission_classes = [IsAuthenticated]

    # Required to accept multipart/form-data from the React FormData object
    parser_classes = [MultiPartParser, FormParser]

    # Changed from 'put' to 'patch' to handle partial updates properly
    def patch(self, request):
        # request.user is automatically populated by DRF because of the JWT token
        user = request.user

        # Extract the text data sent from React
        new_name = request.data.get("full_name")
        new_language = request.data.get("preferred_language")
        new_email = request.data.get("email")

        # Extract the file data
        new_picture = request.FILES.get("profile_picture")
        new_bio = request.data.get("bio")

        # Track if we actually made any changes
        updated = False

        if new_bio is not None and hasattr(user, "expert_profile"):
            user.expert_profile.bio = new_bio
            user.expert_profile.save()
            updated = True

        if new_name is not None:
            user.full_name = new_name
            updated = True

        if new_language is not None:
            user.preferred_language = new_language
            updated = True

        if new_email is not None:
            user.email = new_email
            updated = True

        if new_picture is not None:
            user.profile_picture = new_picture
            updated = True

        if updated:
            user.save()
            return Response({"message": "Profile updated successfully!"}, status=status.HTTP_200_OK)

        # If no valid fields were sent in the request
        return Response(
            {"detail": "No valid data provided to update."}, status=status.HTTP_400_BAD_REQUEST
        )

    # Bulletproof fallback: If React sends a PUT request, just run the PATCH logic
    def put(self, request):
        return self.patch(request)
