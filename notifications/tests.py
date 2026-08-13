from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from experts.models import Expert
from notifications.models import Notification
from notifications.tasks import (
    dispatch_1h_session_reminders,
    dispatch_24h_session_reminders,
    send_schedule_change_notification,
)

User = get_user_model()


@pytest.mark.django_db
class TestNotificationEngine:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone_number="+251911889900")
        self.expert_user = User.objects.create_user(phone_number="+251911445566")
        self.expert = Expert.objects.create(
            user=self.expert_user,
            title="Tax Advisor",
            rate_per_session=Decimal("1000.00"),
            wallet_provider="telebirr",
            wallet_account_number="+251911445566",
        )

    def test_24h_reminder_dispatcher_task(self):
        # Create booking scheduled 24 hours from now
        Booking.objects.create(
            client=self.user,
            expert=self.expert,
            channel="voice",
            scheduled_start=timezone.now() + timedelta(hours=24),
            scheduled_end=timezone.now() + timedelta(hours=24, minutes=30),
            rate_snapshot=Decimal("1000.00"),
            status="escrowed",
        )

        res = dispatch_24h_session_reminders()
        assert "1 24-hour reminder(s)" in res
        assert Notification.objects.filter(user=self.user, notification_type="reminder_24h").exists()

    def test_1h_reminder_dispatcher_task(self):
        # Create booking scheduled 1 hour from now
        Booking.objects.create(
            client=self.user,
            expert=self.expert,
            channel="voice",
            scheduled_start=timezone.now() + timedelta(hours=1),
            scheduled_end=timezone.now() + timedelta(hours=1, minutes=30),
            rate_snapshot=Decimal("1000.00"),
            status="escrowed",
        )

        res = dispatch_1h_session_reminders()
        assert "1 1-hour reminder(s)" in res
        assert Notification.objects.filter(user=self.user, notification_type="reminder_1h").exists()

    def test_schedule_change_task_dispatches_to_both_parties(self):
        booking = Booking.objects.create(
            client=self.user,
            expert=self.expert,
            channel="voice",
            scheduled_start=timezone.now() + timedelta(days=2),
            scheduled_end=timezone.now() + timedelta(days=2, minutes=30),
            rate_snapshot=Decimal("1000.00"),
            status="escrowed",
        )

        res = send_schedule_change_notification(str(booking.id), "rescheduled")
        assert "Dispatched rescheduled notifications" in res

        assert Notification.objects.filter(user=self.user, notification_type="schedule_change").exists()
        assert Notification.objects.filter(user=self.expert_user, notification_type="schedule_change").exists()

    def test_user_can_list_and_mark_notifications_as_read(self):
        notification = Notification.objects.create(
            user=self.user,
            title="Session Reminder",
            message="Test message",
            notification_type="reminder_1h",
        )

        self.client.force_authenticate(user=self.user)
        
        # 1. List notifications
        res_list = self.client.get("/api/v1/notifications/")
        assert res_list.status_code == status.HTTP_200_OK
        data = res_list.data["results"] if "results" in res_list.data else res_list.data
        assert len(data) == 1

        # 2. Mark as read
        res_read = self.client.patch(f"/api/v1/notifications/{notification.id}", {"is_read": True}, format="json")
        assert res_read.status_code == status.HTTP_200_OK
        assert res_read.data["is_read"] is True

        notification.refresh_from_db()
        assert notification.is_read is True