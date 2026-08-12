from rest_framework import serializers

from experts.models import Expert


class AdminExpertListSerializer(serializers.ModelSerializer):
    """
    Serializer for Compliance Admins to inspect expert applications and credential details.
    """

    user_phone = serializers.CharField(source="user.phone_number", read_only=True)

    class Meta:
        model = Expert
        fields = [
            "id",
            "user",
            "user_phone",
            "title",
            "bio",
            "license_number",
            "specialty_tags",
            "rate_per_session",
            "verification_status",
            "wallet_provider",
            "wallet_account_number",
            "availability",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminExpertVerificationSerializer(serializers.ModelSerializer):
    """
    Serializer for updating an expert's verification status.
    """

    class Meta:
        model = Expert
        fields = ["verification_status"]

    def validate_verification_status(self, value):
        allowed_statuses = ["verified", "rejected", "pending", "unverified"]
        if value not in allowed_statuses:
            raise serializers.ValidationError(f"Invalid status. Must be one of: {allowed_statuses}")
        return value
