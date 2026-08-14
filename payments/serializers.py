import re

from rest_framework import serializers

from .models import EscrowTransaction


class EscrowInitializeSerializer(serializers.Serializer):
    booking_id = serializers.UUIDField(required=True)
    return_url = serializers.URLField(required=False)


class EscrowTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscrowTransaction
        fields = [
            "id",
            "booking",
            "tx_ref",
            "amount",
            "currency",
            "status",
            "chapa_checkout_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class WalletLinkingSerializer(serializers.Serializer):
    """
    Validates wallet provider and account details prior to verification.
    """

    wallet_provider = serializers.ChoiceField(
        choices=[("telebirr", "Telebirr"), ("cbe_birr", "CBE Birr"), ("mpesa", "M-Pesa")]
    )
    wallet_account_number = serializers.CharField(max_length=100)

    def validate(self, data):
        provider = data.get("wallet_provider")
        account = data.get("wallet_account_number", "").strip()

        if provider in ["telebirr", "mpesa"]:
            # Telebirr / M-Pesa phone format: +2519... or 09...
            if not re.match(r"^(\+2519\d{8}|\+2517\d{8}|09\d{8}|07\d{8})$", account):
                raise serializers.ValidationError(
                    {"wallet_account_number": f"Invalid mobile money format for {provider}."}
                )
        elif provider == "cbe_birr":
            # CBE Account numeric string 1000...
            if not re.match(r"^\d{10,16}$", account):
                raise serializers.ValidationError(
                    {"wallet_account_number": "Invalid CBE account format. Expected 10-16 numeric digits."}
                )

        data["wallet_account_number"] = account
        return data


class SessionEndAdjustmentSerializer(serializers.Serializer):
    """
    Captures duration of call in seconds to calculate automated drop-call refunds.
    """

    duration_seconds = serializers.IntegerField(min_value=0, required=True)