from rest_framework import serializers

from experts.models import Expert

from .models import Dispute


class AdminExpertListSerializer(serializers.ModelSerializer):
    """
    Serializer for Compliance Admins to inspect expert applications and credential details.
    """

    user_phone = serializers.CharField(source="user.phone_number", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    license_document = serializers.FileField(read_only=True)

    class Meta:
        model = Expert
        fields = [
            "id",
            "user",
            "user_phone",
            "user_full_name",
            "user_email",
            "title",
            "bio",
            "license_number",
            "license_document",
            "specialty_tags",
            "rate_per_session",
            "verification_status",
            "wallet_provider",
            "wallet_account_number",
            "availability",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminExpertVerificationSerializer(serializers.ModelSerializer):
    """
    Serializer for updating an expert's verification status.
    """

    class Meta:
        model = Expert
        fields = ["verification_status"]

    def validate_verification_status(self, value):
        allowed_statuses = ["verified", "rejected", "pending", "unverified"]
        if value not in allowed_statuses:
            raise serializers.ValidationError(f"Invalid status. Must be one of: {allowed_statuses}")
        return value


class AdminDisputeListSerializer(serializers.ModelSerializer):
    client_phone = serializers.CharField(source="booking.client.phone_number", read_only=True)
    expert_title = serializers.CharField(source="booking.expert.title", read_only=True)

    class Meta:
        model = Dispute
        fields = [
            "id",
            "booking",
            "raised_by",
            "client_phone",
            "expert_title",
            "status",
            "reason",
            "call_drop_summary",
            "resolution_action",
            "admin_notes",
            "resolved_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "booking", "raised_by", "call_drop_summary", "created_at", "updated_at"]


class AdminDisputeResolutionSerializer(serializers.ModelSerializer):
    """
    Serializer for Compliance Admins to freeze, release, refund, or split escrow funds.
    """

    status = serializers.ChoiceField(choices=["frozen", "resolved", "rejected"])
    resolution_action = serializers.ChoiceField(
        choices=["full_refund", "full_release", "split_50_50"], required=False, allow_null=True
    )
    admin_notes = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Dispute
        fields = ["status", "resolution_action", "admin_notes"]

    def validate(self, data):
        if data.get("status") == "resolved" and not data.get("resolution_action"):
            raise serializers.ValidationError(
                {"resolution_action": "Resolution action is required when resolving a dispute."}
            )
        return data