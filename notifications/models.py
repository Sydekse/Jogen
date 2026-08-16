import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    CHANNEL_CHOICES = [
        ("sms", "SMS Gateway"),
        ("push", "Push Notification"),
        ("in_app", "In-App Drawer"),
    ]

    TYPE_CHOICES = [
        ("reminder_24h", "24-Hour Reminder"),
        ("reminder_1h", "1-Hour Reminder"),
        ("schedule_change", "Schedule Updated"),
        ("cancellation", "Booking Cancelled"),
        ("new_booking", "New Booking"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="sms")
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications_notification"
        ordering = ["-sent_at"]

    def __str__(self):
        return f"{self.user.phone_number} - {self.title} ({self.notification_type})"