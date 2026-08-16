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
            "license_document",
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
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = Expert
        fields = [
            "id",
            "full_name",
            "profile_picture",
            "title",
            "specialty_tags",
            "rate_per_session",
            "verification_status",
        ]

    def get_profile_picture(self, obj):
        request = self.context.get("request")
        if obj.user.profile_picture:
            return request.build_absolute_uri(obj.user.profile_picture.url) if request else obj.user.profile_picture.url
        return None


class ExpertDetailSerializer(serializers.ModelSerializer):
    """
    Detailed public profile serializer including bio and weekly schedule matrix.
    """

    full_name = serializers.CharField(source="user.full_name", read_only=True)
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = Expert
        fields = [
            "id",
            "full_name",
            "profile_picture",
            "title",
            "bio",
            "specialty_tags",
            "rate_per_session",
            "availability",
        ]

    def get_profile_picture(self, obj):
        request = self.context.get("request")
        if obj.user.profile_picture:
            return request.build_absolute_uri(obj.user.profile_picture.url) if request else obj.user.profile_picture.url
        return None
