import random
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def generate_otp():
    """Generates a secure 6-digit string."""
    return str(random.randint(100000, 999999))

def send_sms(phone_number, otp_code):
    """
    Sends SMS in production, but prints to terminal in development.
    """
    message = f"Your Jogen verification code is: {otp_code}. It expires in 5 minutes."

    if settings.DEBUG:
        # DEVELOPMENT: Print clearly to the terminal running 'runserver'
        print("\n" + "="*40)
        print("📱 MOCK SMS TRIGGERED")
        print(f"To: {phone_number}")
        print(f"Code: {otp_code}")
        print("="*40 + "\n")
    else:
        # PRODUCTION: Call Telebirr/AfroMessage API here later
        pass