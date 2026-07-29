from rest_framework import serializers


class RequestOTPSerializer(serializers.Serializer):
    # E.164 format validation (e.g., +251912345678)
    phone_number = serializers.RegexField(
        regex=r"^\+?[1-9]\d{1,14}$",
        error_messages={"invalid": "Phone number must be in E.164 format."},
    )


class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    otp_code = serializers.CharField(max_length=6, min_length=6)
