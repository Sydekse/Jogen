import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking

from .chapa_service import ChapaService
from .escrow_service import EscrowService
from .models import EscrowTransaction, WalletTransaction
from .serializers import (
    EscrowInitializeSerializer,
    EscrowTransactionSerializer,
    SessionEndAdjustmentSerializer,
    UserWalletSerializer,
    WalletLinkingSerializer,
    WalletTopUpInitializeSerializer,
    WalletTransactionSerializer,
    WalletWithdrawalSerializer,
)
from .wallet_service import WalletService


class InitializeEscrowPaymentView(APIView):
    """
    POST /api/v1/payments/initialize
    Initializes escrow payment via Chapa and returns checkout_url.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EscrowInitializeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            base_rate = booking.rate_snapshot
            client_fee = (base_rate * Decimal("0.0125")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            amount = base_rate + client_fee

            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")

            chapa_service = ChapaService()
            init_res = chapa_service.initialize_payment(
                amount=amount,
                phone_number=request.user.phone_number,
                tx_ref=tx_ref,
                callback_url=f"{backend_url}/api/v1/payments/webhook/",
                return_url=return_url or f"{frontend_url}/bookings",
            )

            escrow_tx, _ = EscrowTransaction.objects.update_or_create(
                booking=booking,
                defaults={
                    "tx_ref": tx_ref,
                    "amount": amount,
                    "status": "held" if init_res.get("raw_response", {}).get("mocked") else "initiated",
                    "chapa_checkout_url": init_res["checkout_url"],
                    "raw_provider_response": init_res["raw_response"],
                },
            )

            if escrow_tx.status == "held":
                booking.status = "escrowed"
                booking.save(update_fields=["status", "updated_at"])

            return Response(
                {
                    "checkout_url": init_res["checkout_url"],
                    "transaction": EscrowTransactionSerializer(escrow_tx).data,
                },
                status=status.HTTP_201_CREATED,
            )


class WalletTopUpInitializeView(APIView):
    """
    POST /api/v1/payments/wallet/topup/
    Initializes Chapa checkout for topping up user's internal wallet balance.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = WalletTopUpInitializeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount = serializer.validated_data["amount"]
        return_url = serializer.validated_data.get("return_url")

        tx_ref = f"TOPUP-{uuid.uuid4().hex[:12].upper()}"
        wallet = WalletService.get_or_create_wallet(request.user)

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")

        chapa_service = ChapaService()
        phone_number = getattr(request.user, "phone_number", None) or "0911000000"
        init_res = chapa_service.initialize_payment(
            amount=amount,
            phone_number=phone_number,
            tx_ref=tx_ref,
            callback_url=f"{backend_url}/api/v1/payments/webhook/",
            return_url=return_url or f"{frontend_url}/wallet",
        )

        # Create pending WalletTransaction for webhook resolution
        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type="topup",
            amount=amount,
            running_balance=wallet.balance,
            reference=tx_ref,
            status="pending",
            raw_provider_response=init_res.get("raw_response", {}),
        )

        # Auto-credit only if initial request was explicitly mocked (e.g. dummy test key)
        is_mocked = init_res.get("raw_response", {}).get("mocked", False)
        if is_mocked:
            WalletService.top_up_wallet(
                user=request.user,
                amount=amount,
                tx_ref=tx_ref,
                raw_response=init_res.get("raw_response"),
            )

        return Response(
            {
                "tx_ref": tx_ref,
                "amount": str(amount),
                "checkout_url": init_res["checkout_url"],
                "mocked": is_mocked,
            },
            status=status.HTTP_201_CREATED,
        )




class WalletDetailView(APIView):
    """
    GET /api/v1/payments/wallet/
    Retrieves user wallet balance and ledger transaction history.
    Filter by role parameter: ?mode=client (spending) or ?mode=expert (earnings).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        WalletService.sync_expert_earnings(request.user)
        wallet = WalletService.sync_reserved_balance(request.user)

        # Auto-verify and credit any pending topup transactions
        pending_topups = WalletTransaction.objects.filter(
            wallet=wallet,
            transaction_type="topup",
            status="pending",
        )
        if pending_topups.exists():
            chapa_service = ChapaService()
            is_test_mode = settings.DEBUG or chapa_service.secret_key.startswith("CHASECK_TEST")
            for pending_tx in pending_topups:
                should_credit = is_test_mode
                if not should_credit:
                    verified = chapa_service.verify_transaction(pending_tx.reference)
                    if verified and verified.get("status") == "success":
                        should_credit = True

                if should_credit:
                    WalletService.top_up_wallet(
                        user=request.user,
                        amount=pending_tx.amount,
                        tx_ref=pending_tx.reference,
                    )
            wallet.refresh_from_db()

        mode = request.query_params.get("mode")

        transactions_qs = WalletTransaction.objects.filter(wallet=wallet)
        if mode == "expert":
            transactions_qs = transactions_qs.filter(
                transaction_type__in=["expert_payout", "withdrawal"]
            )
        elif mode == "client":
            transactions_qs = transactions_qs.filter(
                transaction_type__in=[
                    "topup",
                    "booking_hold",
                    "booking_charge",
                    "booking_refund_release",
                ]
            )

        wallet_data = UserWalletSerializer(wallet).data
        wallet_data["transactions"] = WalletTransactionSerializer(
            transactions_qs[:50], many=True
        ).data
        return Response(wallet_data, status=status.HTTP_200_OK)


class WalletWithdrawalView(APIView):
    """
    POST /api/v1/payments/wallet/withdraw/
    Requests balance withdrawal from wallet to external mobile money / bank account.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = WalletWithdrawalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount = serializer.validated_data["amount"]
        provider = serializer.validated_data.get("provider", "telebirr")
        account_number = serializer.validated_data.get("account_number", "")

        try:
            tx = WalletService.request_withdrawal(
                user=request.user,
                amount=amount,
                provider=provider,
                account_number=account_number,
            )
            return Response(
                {
                    "status": "withdrawal_completed",
                    "transaction": WalletTransactionSerializer(tx).data,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ChapaWebhookView(APIView):
    """
    POST /api/v1/payments/webhook
    Validates HMAC signature header and processes gateway payment confirmations.
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
            # Check for wallet top-up transaction
            pending_wallet_tx = (
                WalletTransaction.objects.select_for_update()
                .filter(reference=tx_ref, transaction_type="topup")
                .first()
            )
            if pending_wallet_tx:
                WalletService.top_up_wallet(
                    user=pending_wallet_tx.wallet.user,
                    amount=pending_wallet_tx.amount,
                    tx_ref=tx_ref,
                    raw_response=verification_data,
                )
                return Response({"status": "wallet_credited"}, status=status.HTTP_200_OK)

            # Check for legacy escrow transaction
            escrow_tx = EscrowTransaction.objects.select_for_update().filter(tx_ref=tx_ref).first()
            if not escrow_tx:
                return Response(
                    {"error": "Transaction record not found"}, status=status.HTTP_404_NOT_FOUND
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

            base_amount = (escrow_tx.amount / Decimal("1.0125")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            expert_fee = (base_amount * Decimal("0.0125")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            net_expert_payout = base_amount - expert_fee

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
    Applies precision pro-rata adjustments upon consultation completion using internal wallets.
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
            # Check if booking is wallet-funded or legacy escrow
            if hasattr(booking, "escrow_transaction"):
                settlement = EscrowService.process_session_settlement(
                    booking=booking,
                    duration_seconds=duration_seconds,
                )
            else:
                settlement = WalletService.settle_session_funds(
                    booking=booking,
                    duration_seconds=duration_seconds,
                )
            return Response(settlement, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_409_CONFLICT)