import logging
import os
import random

import requests

logger = logging.getLogger(__name__)


def generate_otp():
    """Generates a secure 6-digit string."""
    return str(random.randint(100000, 999999))


def send_sms(phone_number, otp_code):
    """
    Sends SMS via provider if configured, and logs to output/server logs for verification.
    """
    message = f"Your Jogen verification code is: {otp_code}. It expires in 5 minutes."
    api_key = os.getenv("SMS_GATEWAY_API_KEY")

    try:
        response = requests.post(
            "https://smsethiopia.com/api/sms/send",
            json={
                "msisdn": phone_number,
                "text": message,
            },
            headers={
                "KEY": api_key,
            }
        )
        response.raise_for_status()
        logger.info("SMS gateway sent successfully: %s", response.text)
    except requests.RequestException as exc:
        logger.error("Failed to send SMS to %s via gateway: %s", phone_number, exc)
    
    # Log to server stdout/logs (visible on Render Logs tab)
    print("\n" + "=" * 40)
    print("📱 OTP CODE GENERATED")
    print(f"To: {phone_number}")
    print(f"Code: {otp_code}")
    print("=" * 40 + "\n", flush=True)
    logger.info("OTP sent to %s: %s", phone_number, otp_code)
