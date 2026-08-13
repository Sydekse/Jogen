import os

import requests
from django.conf import settings

from .models import Notification


class NotificationService:
    """
    Unified service for dispatching SMS, Push, and In-App notifications.
    """

    @classmethod
    def send_sms(cls, phone_number: str, message: str) -> bool:
        """
        Integration client for local Ethiopian SMS Gateway.
        """
        sms_api_key = os.getenv("SMS_GATEWAY_API_KEY", "dummy-sms-key")
        # In development / test environment: mock successful delivery
        if settings.DEBUG or sms_api_key == "dummy-sms-key":
            print(f"[SMS MOCK Dispatch] To: {phone_number} | Body: {message}")
            return True

        url = "https://api.sms-gateway.et/v1/send"
        payload = {"to": phone_number, "message": message, "key": sms_api_key}
        try:
            res = requests.post(url, json=payload, timeout=5)
            return res.status_code == 200
        except requests.RequestException:
            return False

    @classmethod
    def create_and_dispatch(
        cls, user, title: str, message: str, notification_type: str, channel: str = "sms"
    ) -> Notification:
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            channel=channel,
            notification_type=notification_type,
        )

        if channel == "sms":
            cls.send_sms(phone_number=user.phone_number, message=message)

        return notification