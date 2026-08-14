import hashlib
import hmac
import os

import requests
from rest_framework import serializers


class ChapaService:
    """
    Chapa Payment Gateway Service for initialization, webhook validation,
    wallet verification, refunds, and payouts.
    """

    BASE_URL = "https://api.chapa.co/v1"

    def __init__(self):
        self.secret_key = os.getenv("CHAPA_SECRET_KEY", "CHASECK_TEST-dummykey")
        self.webhook_secret = os.getenv("CHAPA_WEBHOOK_SECRET", "dummy-webhook-secret")
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    def verify_webhook_signature(self, raw_body: bytes, signature_header: str) -> bool:
        """
        Validates HMAC SHA256 signature sent in Chapa webhook headers.
        """
        if not signature_header or not self.webhook_secret:
            return False

        computed_signature = hmac.new(
            self.webhook_secret.encode("utf-8"),
            msg=raw_body,
            digestmod=hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(computed_signature, signature_header)

    def initialize_payment(self, amount, phone_number, tx_ref, callback_url=None, return_url=None):
        """
        Calls POST /v1/transaction/initialize with minimal parameters plus callbacks.
        """
        url = f"{self.BASE_URL}/transaction/initialize"

        payload = {
            "amount": str(amount),
            "currency": "ETB",
            "tx_ref": tx_ref,
            "phone_number": phone_number,
            "callback_url": callback_url or "https://api.jogen.et/api/v1/payments/webhook",
            "return_url": return_url or "https://jogen.et/consultations",
        }

        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            data = response.json()
            if response.status_code == 200 and data.get("status") == "success":
                return {
                    "checkout_url": data["data"]["checkout_url"],
                    "raw_response": data,
                }
            raise serializers.ValidationError(
                f"Chapa Error: {data.get('message', 'Initialization failed')}"
            )
        except requests.RequestException as e:
            raise serializers.ValidationError(f"Chapa API Connection Failure: {e!s}")

    def verify_transaction(self, tx_ref: str):
        """
        Calls GET /v1/transaction/verify/{tx_ref} to confirm payment completion with Chapa.
        """
        url = f"{self.BASE_URL}/transaction/verify/{tx_ref}"
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            data = response.json()
            if response.status_code == 200 and data.get("status") == "success":
                return data["data"]
            return None
        except requests.RequestException:
            return None

    def verify_account_ownership(self, provider: str, account_number: str) -> dict:
        """
        Validates the expert's bank/mobile wallet with Chapa before linking (§4.0).
        """
        # If running in test mode with mock/dummy keys, validate format:
        if self.secret_key.startswith("CHASECK_TEST"):
            if provider in ["telebirr", "mpesa"] and len(account_number) < 9:
                return {"valid": False, "message": "Invalid mobile phone format"}
            return {"valid": True, "account_name": "Verified Advisor Account"}

        url = f"{self.BASE_URL}/banks/verify"
        payload = {"bank_code": provider, "account_number": account_number}
        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            data = response.json()
            if response.status_code == 200 and data.get("status") == "success":
                return {"valid": True, "account_name": data.get("data", {}).get("account_name")}
            return {"valid": False, "message": data.get("message", "Account verification failed")}
        except requests.RequestException as e:
            return {"valid": False, "message": str(e)}

    def transfer_to_expert(self, expert, amount, tx_ref: str):
        """
        Calls POST /v1/transfers to payout expert earnings upon session completion.
        """
        url = f"{self.BASE_URL}/transfers"
        payload = {
            "account_name": expert.title or "Expert Advisor",
            "account_number": expert.wallet_account_number,
            "amount": str(amount),
            "currency": "ETB",
            "reference": f"PAYOUT-{tx_ref}",
            "bank_code": expert.wallet_provider,
        }

        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            return response.json()
        except requests.RequestException as e:
            return {"status": "failed", "message": str(e)}

    def refund_client(self, tx_ref: str, amount):
        """
        Refunds client deposit in full or prorated amount in case of early drop-call.
        """
        url = f"{self.BASE_URL}/refund"
        payload = {
            "trx_ref": tx_ref,
            "amount": str(amount),
            "reason": "Drop-call early disconnection prorated adjustment",
        }
        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            return response.json()
        except requests.RequestException as e:
            return {"status": "failed", "message": str(e)}