import uuid
from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking

from .chapa_service import ChapaService
from .escrow_service import EscrowService
from .models import EscrowTransaction
from .serializers import (
    EscrowInitializeSerializer,
    EscrowTransactionSerializer,
    SessionEndAdjustmentSerializer,
    WalletLinkingSerializer,
)


class InitializeEscrowPaymentView(APIView):
    """
    POST /api/v1/payments/initialize
    Pessimistically locks booking and generates Chapa Checkout URL.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EscrowInitializeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking_id = serializer.validated_data["booking_id"]
        return_url = serializer.validated_data.get("return_url")

        with transaction.atomic():
            booking = get_object_or_404(
                Booking.objects.select_for_update(),
                id=booking_id,
                client=request.user,
            )

            if booking.status not in ["pending_payment", "reserved"]:
                return Response(
                    {
                        "error": f"Booking status '{booking.status}' cannot be initialized for payment."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            tx_ref = f"JOGEN-ESCROW-{uuid.uuid4().hex[:12].upper()}"
            amount = booking.rate_snapshot

            chapa_service = ChapaService()
            init_res = chapa_service.initialize_payment(
                amount=amount,
                phone_number=request.user.phone_number,
                tx_ref=tx_ref,
                callback_url="https://api.jogen.et/api/v1/payments/webhook",
                return_url=return_url or "http://localhost:3000/bookings",
            )

            escrow_tx, _ = EscrowTransaction.objects.update_or_create(
                booking=booking,
                defaults={
                    "tx_ref": tx_ref,
                    "amount": amount,
                    "status": "initiated",
                    "chapa_checkout_url": init_res["checkout_url"],
                    "raw_provider_response": init_res["raw_response"],
                },
            )

            return Response(
                {
                    "checkout_url": init_res["checkout_url"],
                    "transaction": EscrowTransactionSerializer(escrow_tx).data,
                },
                status=status.HTTP_201_CREATED,
            )


class ChapaWebhookView(APIView):
    """
    POST /api/v1/payments/webhook
    Validates HMAC signature header and updates booking status to 'escrowed'.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        chapa_service = ChapaService()

        # 1. Verify cryptographic HMAC signature header if signature header exists
        sig_header = request.headers.get("x-chapa-signature") or request.headers.get(
            "Chapa-Signature"
        )
        if sig_header and not chapa_service.verify_webhook_signature(request.body, sig_header):
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        tx_ref = request.data.get("tx_ref") or request.data.get("trx_ref")
        if not tx_ref:
            return Response(
                {"error": "Missing transaction reference"}, status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Re-verify directly with Chapa API
        verification_data = chapa_service.verify_transaction(tx_ref)
        if not verification_data or verification_data.get("status") != "success":
            return Response({"status": "unverified"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            escrow_tx = EscrowTransaction.objects.select_for_update().filter(tx_ref=tx_ref).first()
            if not escrow_tx:
                return Response(
                    {"error": "Escrow record not found"}, status=status.HTTP_404_NOT_FOUND
                )

            if escrow_tx.status == "initiated":
                escrow_tx.status = "held"
                escrow_tx.raw_provider_response = verification_data
                escrow_tx.save()

                booking = escrow_tx.booking
                booking.status = "escrowed"
                booking.save()

        return Response({"status": "held_in_escrow"}, status=status.HTTP_200_OK)


class AtomicEscrowReleaseView(APIView):
    """
    POST /api/v1/payments/{booking_id}/release
    Atomic transaction releasing 90% net payout to expert upon session completion.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        with transaction.atomic():
            booking = get_object_or_404(
                Booking.objects.select_for_update(),
                id=booking_id,
            )

            escrow_tx = EscrowTransaction.objects.select_for_update().get(booking=booking)

            if escrow_tx.status != "held":
                return Response(
                    {"error": f"Cannot release escrow in status '{escrow_tx.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            net_expert_payout = escrow_tx.amount * Decimal("0.90")

            chapa_service = ChapaService()
            payout_res = chapa_service.transfer_to_expert(
                expert=booking.expert,
                amount=net_expert_payout,
                tx_ref=escrow_tx.tx_ref,
            )

            escrow_tx.status = "released"
            escrow_tx.save()

            booking.status = "completed"
            booking.save()

        return Response(
            {
                "status": "released",
                "net_expert_payout": str(net_expert_payout),
                "payout_response": payout_res,
            },
            status=status.HTTP_200_OK,
        )


class WalletLinkingView(APIView):
    """
    POST /api/v1/payments/wallet
    Validates ownership of wallet with Chapa prior to locking it to Expert profile.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, "expert_profile"):
            return Response(
                {"error": "Only registered experts can link payout wallets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = WalletLinkingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data["wallet_provider"]
        account_number = serializer.validated_data["wallet_account_number"]

        # 1. Verify account validity with Chapa API
        chapa_service = ChapaService()
        verification_result = chapa_service.verify_account_ownership(
            provider=provider, account_number=account_number
        )

        if not verification_result.get("valid"):
            return Response(
                {
                    "error": "Wallet verification failed. Please ensure the account details are valid.",
                    "details": verification_result.get("message"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Persist verified wallet to Expert Profile
        expert = request.user.expert_profile
        expert.wallet_provider = provider
        expert.wallet_account_number = account_number
        expert.save()

        return Response(
            {
                "status": "verified_and_linked",
                "wallet_provider": provider,
                "wallet_account_number": account_number,
                "account_name": verification_result.get("account_name"),
            },
            status=status.HTTP_200_OK,
        )


class SessionEndEscrowAdjustmentView(APIView):
    """
    POST /api/v1/payments/<booking_id>/session-end
    Applies precision pro-rata escrow adjustments upon consultation completion.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)

        # Authorize: Only session participants (client/expert) can end the session
        if request.user != booking.client and request.user != booking.expert.user:
            return Response(
                {"error": "You do not have permission to settle this consultation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SessionEndAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        duration_seconds = serializer.validated_data.get("duration_seconds")

        try:
            settlement = EscrowService.process_session_settlement(
                booking=booking,
                duration_seconds=duration_seconds,
            )
            return Response(settlement, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)