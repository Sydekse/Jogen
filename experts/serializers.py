from rest_framework import serializers

from .models import Expert


class ExpertProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating expert onboarding & profile details."""

    class Meta:
        model = Expert
        fields = [
            "id",
            "title",
            "bio",
            "license_number",
            "specialty_tags",
            "rate_per_session",
            "verification_status",
            "wallet_provider",
            "wallet_account_number",
        ]
        read_only_fields = ["id", "verification_status"]


class ExpertAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for managing weekly availability schedule."""

    class Meta:
        model = Expert
        fields = ["availability"]

    def validate_availability(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Availability must be a dictionary object.")
        return value
