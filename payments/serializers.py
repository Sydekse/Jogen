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
