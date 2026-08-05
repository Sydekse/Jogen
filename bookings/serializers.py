from rest_framework import serializers

from .models import Booking, SessionFile


class BookingCreateSerializer(serializers.Serializer):
    expert_id = serializers.UUIDField(required=True)
    channel = serializers.ChoiceField(choices=Booking.CHANNEL_CHOICES, default="voice")
    scheduled_start = serializers.DateTimeField(required=True)
    scheduled_end = serializers.DateTimeField(required=True)


class BookingUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ["status", "cancellation_reason"]

    def validate_status(self, value):
        valid_transitions = ["cancelled", "completed", "escrowed"]
        if value not in valid_transitions:
            raise serializers.ValidationError(f"Invalid status transition to {value}.")
        return value


class BookingDetailSerializer(serializers.ModelSerializer):
    client_phone = serializers.CharField(source="client.phone_number", read_only=True)
    expert_title = serializers.CharField(source="expert.title", read_only=True)
    expert_name = serializers.CharField(source="expert.user.full_name", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "client_phone",
            "expert",
            "expert_name",
            "expert_title",
            "channel",
            "status",
            "scheduled_start",
            "scheduled_end",
            "rate_snapshot",
            "cancellation_reason",
            "created_at",
        ]


class PresignedUploadRequestSerializer(serializers.Serializer):
    file_name = serializers.CharField(max_length=255, required=True)
    file_size = serializers.IntegerField(min_value=1, required=True)
    mime_type = serializers.CharField(max_length=100, required=True)


class SessionFileSerializer(serializers.ModelSerializer):
    uploader_phone = serializers.CharField(source="uploader.phone_number", read_only=True)

    class Meta:
        model = SessionFile
        fields = [
            "id",
            "booking",
            "uploader",
            "uploader_phone",
            "file_name",
            "file_size",
            "mime_type",
            "s3_key",
            "created_at",
        ]
        read_only_fields = ["id", "booking", "uploader", "created_at"]
