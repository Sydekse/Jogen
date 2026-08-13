from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "channel",
            "notification_type",
            "is_read",
            "sent_at",
        ]
        read_only_fields = ["id", "title", "message", "channel", "notification_type", "sent_at"]