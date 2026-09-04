from django.db import models
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
            "wallet_balance",
            "verification_status",
            "wallet_provider",
            "wallet_account_number",
        ]
        read_only_fields = ["id", "wallet_balance", "verification_status"]


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
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()

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
            "average_rating",
            "total_reviews",
        ]

    def get_profile_picture(self, obj):
        request = self.context.get("request")
        if obj.user.profile_picture:
            return request.build_absolute_uri(obj.user.profile_picture.url) if request else obj.user.profile_picture.url
        return None

    def get_average_rating(self, obj):
        stats = obj.reviews.aggregate(avg=models.Avg("rating"))
        return round(stats["avg"] or 0.0, 1)

    def get_total_reviews(self, obj):
        return obj.reviews.count()


class ExpertDetailSerializer(serializers.ModelSerializer):
    """
    Detailed public profile serializer including bio and weekly schedule matrix.
    """

    full_name = serializers.CharField(source="user.full_name", read_only=True)
    profile_picture = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    booked_slots = serializers.SerializerMethodField()

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
            "booked_slots",
            "average_rating",
            "total_reviews",
        ]

    def get_profile_picture(self, obj):
        request = self.context.get("request")
        if obj.user.profile_picture:
            return request.build_absolute_uri(obj.user.profile_picture.url) if request else obj.user.profile_picture.url
        return None

    def get_average_rating(self, obj):
        stats = obj.reviews.aggregate(avg=models.Avg("rating"))
        return round(stats["avg"] or 0.0, 1)

    def get_total_reviews(self, obj):
        return obj.reviews.count()

    def get_booked_slots(self, obj):
        from datetime import timedelta
        from django.utils import timezone
        from bookings.models import Booking

        # Filter active reservations (pending, escrowed, completed) that haven't expired
        bookings = Booking.objects.filter(
            expert=obj,
            status__in=["pending_payment", "escrowed", "completed"],
            scheduled_end__gte=timezone.now() - timedelta(hours=1),
        ).values_list("scheduled_start", "scheduled_end")

        return [
            {
                "start": start.isoformat(),
                "end": end.isoformat(),
            }
            for start, end in bookings
        ]

