from rest_framework import serializers

from .models import Review


class ReviewCreateSerializer(serializers.Serializer):
    booking_id = serializers.UUIDField(required=True)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=True)
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class ReviewUpdateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    comment = serializers.CharField(required=False, allow_blank=True)


class ReviewListSerializer(serializers.ModelSerializer):
    client_phone = serializers.CharField(source="client.phone_number", read_only=True)
    is_editable = serializers.BooleanField(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "booking",
            "client_phone",
            "expert",
            "rating",
            "comment",
            "edit_count",
            "is_editable",
            "lockout_until",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields