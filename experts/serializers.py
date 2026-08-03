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


class ExpertListSerializer(serializers.ModelSerializer):
    """
    Public discovery serializer for expert marketplace listings.
    Only exposes non-sensitive verified information.
    """

    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Expert
        fields = [
            "id",
            "full_name",
            "title",
            "specialty_tags",
            "rate_per_session",
            "verification_status",
        ]


class ExpertDetailSerializer(serializers.ModelSerializer):
    """
    Detailed public profile serializer including bio and weekly schedule matrix.
    """

    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Expert
        fields = [
            "id",
            "full_name",
            "title",
            "bio",
            "specialty_tags",
            "rate_per_session",
            "verification_status",
            "availability",
        ]
