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

    def validate(self, data):
        status_val = data.get("status")
        reason = data.get("cancellation_reason", "")
        if status_val == "cancelled" and (not reason or not str(reason).strip()):
            raise serializers.ValidationError({"cancellation_reason": "A reason is required to cancel this consultation."})
        return data


class BookingDetailSerializer(serializers.ModelSerializer):
    client_id = serializers.CharField(source="client.id", read_only=True)
    client_phone = serializers.CharField(source="client.phone_number", read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_email = serializers.CharField(source="client.email", read_only=True)
    expert_user_id = serializers.CharField(source="expert.user.id", read_only=True)
    expert_title = serializers.CharField(source="expert.title", read_only=True)
    expert_name = serializers.CharField(source="expert.user.full_name", read_only=True)
    has_review = serializers.SerializerMethodField()
    settlement = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "client_id",
            "client_phone",
            "client_name",
            "client_email",
            "expert",
            "expert_user_id",
            "expert_name",
            "expert_title",
            "channel",
            "status",
            "scheduled_start",
            "scheduled_end",
            "rate_snapshot",
            "cancellation_reason",
            "has_review",
            "settlement",
            "created_at",
        ]

    def get_has_review(self, obj):
        return hasattr(obj, "review")

    def get_settlement(self, obj):
        from decimal import Decimal

        if (
            hasattr(obj, "escrow_transaction")
            and obj.escrow_transaction
            and obj.escrow_transaction.raw_provider_response
        ):
            settlement = obj.escrow_transaction.raw_provider_response.get("settlement")
            if settlement:
                return settlement

        charge_tx = obj.wallet_transactions.filter(transaction_type="booking_charge").first()
        refund_tx = obj.wallet_transactions.filter(transaction_type="booking_refund_release").first()
        payout_tx = obj.wallet_transactions.filter(transaction_type="expert_payout").first()

        if charge_tx or refund_tx or payout_tx:
            total_deposit = obj.rate_snapshot
            gross_earned = charge_tx.amount if charge_tx else Decimal("0.00")
            client_refund = refund_tx.amount if refund_tx else Decimal("0.00")

            client_fee = (total_deposit * Decimal("0.0125")).quantize(Decimal("0.01"))
            expert_fee = (gross_earned * Decimal("0.0125")).quantize(Decimal("0.01"))
            expert_payout = payout_tx.amount if payout_tx else (gross_earned - expert_fee)
            platform_fee = client_fee + expert_fee

            decision = "prorated_adjustment" if client_refund > Decimal("0.00") else "full_completion"

            duration_seconds = None
            if charge_tx and charge_tx.raw_provider_response and "duration_seconds" in charge_tx.raw_provider_response:
                duration_seconds = charge_tx.raw_provider_response["duration_seconds"]
            elif total_deposit > Decimal("0.00") and gross_earned > Decimal("0.00"):
                scheduled_seconds = int((obj.scheduled_end - obj.scheduled_start).total_seconds())
                duration_seconds = int((gross_earned / total_deposit) * scheduled_seconds)

            return {
                "decision": decision,
                "duration_seconds": duration_seconds,
                "total_deposit": str(total_deposit),
                "gross_earned": str(gross_earned),
                "client_refund": str(client_refund),
                "client_platform_fee": str(client_fee),
                "expert_platform_fee": str(expert_fee),
                "platform_fee": str(platform_fee),
                "expert_payout": str(expert_payout),
            }

        return None


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
