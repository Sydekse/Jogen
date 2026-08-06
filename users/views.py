from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
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
        data = {
            "id": str(user.id),
            "phone_number": user.phone_number,
            "full_name": user.full_name,
            "preferred_language": user.preferred_language,
            "is_expert": False,
        }
        
        # Check if user has an expert profile
        if hasattr(user, 'expert_profile'):
            expert = user.expert_profile
            data["is_expert"] = True
            data["expert_data"] = {
                "id": str(expert.id),
                "title": expert.title,
                "bio": expert.bio,
                "rate": str(expert.rate_per_session),
                "verification_status": expert.verification_status,
                "specialty_tags": expert.specialty_tags,
            }
            
        return Response(data, status=status.HTTP_200_OK)
