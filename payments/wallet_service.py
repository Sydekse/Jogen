import uuid
from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone

from bookings.models import Booking

from .calculator import PrecisionEscrowCalculator
from .chapa_service import ChapaService
from .models import UserWallet, WalletTransaction


class WalletService:
    """
    Orchestrates atomic internal user wallet operations: top-ups, booking pre-authorization holds,
    session settlement debits/credits, and balance withdrawals.
    """

    @classmethod
    def get_or_create_wallet(cls, user) -> UserWallet:
        wallet, _ = UserWallet.objects.get_or_create(user=user)
        return wallet

    @classmethod
    @transaction.atomic
    def sync_expert_earnings(cls, user) -> UserWallet:
        """
        Ensures all completed consultation earnings for an expert are credited to their UserWallet
        and recorded in the transaction history ledger.
        """
        wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=user)
        expert = getattr(user, "expert_profile", None)
        if not expert:
            return wallet

        completed_bookings = Booking.objects.filter(expert=expert, status="completed")

        for booking in completed_bookings:
            already_credited = WalletTransaction.objects.filter(
                wallet=wallet,
                booking=booking,
                transaction_type="expert_payout",
                status="completed",
            ).exists()

            if not already_credited:
                base = booking.rate_snapshot
                payout_amount = (base * Decimal("0.9875")).quantize(Decimal("0.01"))

                escrow = getattr(booking, "escrow_transaction", None)
                if escrow and escrow.raw_provider_response:
                    settlement = escrow.raw_provider_response.get("settlement", {})
                    payout_str = settlement.get("expert_payout")
                    if payout_str:
                        payout_amount = Decimal(str(payout_str))

                if payout_amount > Decimal("0.00"):
                    wallet.balance += payout_amount
                    wallet.save(update_fields=["balance", "updated_at"])

                    expert.wallet_balance += payout_amount
                    expert.save(update_fields=["wallet_balance", "updated_at"])

                    WalletTransaction.objects.create(
                        wallet=wallet,
                        transaction_type="expert_payout",
                        amount=payout_amount,
                        running_balance=wallet.balance,
                        booking=booking,
                        reference=f"PAYOUT-{booking.id}",
                        status="completed",
                    )

        return wallet

    @classmethod
    @transaction.atomic
    def sync_reserved_balance(cls, user) -> UserWallet:
        """
        Recalculates user's reserved_balance based on active held bookings to clear
        stale holds from previously cancelled or completed consultations.
        """
        wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=user)

        active_holds_sum = Booking.objects.filter(
            client=user,
            status__in=["escrowed", "reserved"],
            wallet_transactions__transaction_type="booking_hold"
        ).distinct().aggregate(total=models.Sum("rate_snapshot"))["total"] or Decimal("0.00")

        if wallet.reserved_balance != active_holds_sum:
            wallet.reserved_balance = active_holds_sum
            wallet.save(update_fields=["reserved_balance", "updated_at"])

        return wallet

    @classmethod
    @transaction.atomic
    def top_up_wallet(cls, user, amount: Decimal, tx_ref: str, raw_response: dict | None = None) -> WalletTransaction:
        """
        Atomically credits a user's wallet upon gateway payment confirmation.
        Prevents duplicate top-ups using idempotency checks on tx_ref.
        """
        wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=user)
        amount = Decimal(str(amount))

        # Check for existing transaction for this reference
        existing_tx = WalletTransaction.objects.filter(reference=tx_ref).first()
        if existing_tx:
            if existing_tx.status == "completed":
                return existing_tx

            # Upgrade pending transaction to completed and credit balance
            wallet.balance += amount
            wallet.save(update_fields=["balance", "updated_at"])

            existing_tx.status = "completed"
            existing_tx.amount = amount
            existing_tx.running_balance = wallet.balance
            existing_tx.raw_provider_response = raw_response or existing_tx.raw_provider_response
            existing_tx.save(update_fields=["status", "amount", "running_balance", "raw_provider_response"])
            return existing_tx

        # Create new completed transaction if no prior transaction record exists
        wallet.balance += amount
        wallet.save(update_fields=["balance", "updated_at"])

        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type="topup",
            amount=amount,
            running_balance=wallet.balance,
            reference=tx_ref,
            status="completed",
            raw_provider_response=raw_response or {},
        )
        return tx

    @classmethod
    @transaction.atomic
    def hold_booking_funds(cls, client, booking: Booking) -> WalletTransaction:
        """
        Locks/reserves booking.rate_snapshot from client's available balance.
        Raises ValueError if client has insufficient balance.
        """
        wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=client)
        hold_amount = booking.rate_snapshot

        if wallet.available_balance < hold_amount:
            raise ValueError(
                f"Insufficient wallet balance. Required: {hold_amount} ETB, Available: {wallet.available_balance} ETB."
            )

        wallet.reserved_balance += hold_amount
        wallet.save(update_fields=["reserved_balance", "updated_at"])

        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type="booking_hold",
            amount=hold_amount,
            running_balance=wallet.balance,
            booking=booking,
            reference=f"HOLD-{booking.id}",
            status="completed",
        )
        return tx

    @classmethod
    @transaction.atomic
    def release_booking_hold(cls, booking: Booking, reason: str = "Booking Cancellation") -> WalletTransaction | None:
        """
        Unreserves locked booking.rate_snapshot from client's wallet back to available balance upon cancellation.
        Prevents duplicate releases using idempotency checks.
        """
        client_wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=booking.client)
        hold_amount = booking.rate_snapshot

        # Idempotency check: if release already executed for this booking, return existing release
        existing_release = WalletTransaction.objects.filter(
            wallet=client_wallet,
            booking=booking,
            transaction_type="booking_refund_release",
        ).first()
        if existing_release:
            return existing_release

        # Decrease reserved_balance by hold_amount (returning funds to available_balance)
        client_wallet.reserved_balance = max(Decimal("0.00"), client_wallet.reserved_balance - hold_amount)
        client_wallet.save(update_fields=["reserved_balance", "updated_at"])

        tx = WalletTransaction.objects.create(
            wallet=client_wallet,
            transaction_type="booking_refund_release",
            amount=hold_amount,
            running_balance=client_wallet.balance,
            booking=booking,
            reference=f"RELEASE-{booking.id}",
            status="completed",
            raw_provider_response={"reason": reason},
        )
        return tx

    @classmethod
    @transaction.atomic
    def settle_session_funds(cls, booking: Booking, duration_seconds: int | None = None) -> dict:
        """
        Settles consultation session atomically using internal wallet balances and pro-rata calculation.
        Unreserves locked amount, debits gross cost from client, credits net payout to expert.
        """
        locked_booking = Booking.objects.select_for_update().get(id=booking.id)

        # Lock client and expert wallets
        client_wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=locked_booking.client)
        expert_wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=locked_booking.expert.user)

        if duration_seconds is None:
            if not getattr(locked_booking, "actual_start", None):
                duration_seconds = 0
            else:
                elapsed = (timezone.now() - locked_booking.actual_start).total_seconds()
                duration_seconds = int(elapsed)

        scheduled_seconds = int(
            (locked_booking.scheduled_end - locked_booking.scheduled_start).total_seconds()
        )

        total_deposit = locked_booking.rate_snapshot

        result = PrecisionEscrowCalculator.calculate(
            total_deposit=total_deposit,
            duration_seconds=duration_seconds,
            scheduled_seconds=scheduled_seconds,
        )

        # 1. Unreserve held funds from client wallet
        client_wallet.reserved_balance = max(Decimal("0.00"), client_wallet.reserved_balance - total_deposit)

        # 2. Debit actual gross earned cost from client balance
        client_wallet.balance -= result.gross_earned
        client_wallet.save(update_fields=["balance", "reserved_balance", "updated_at"])

        # Record client ledger transactions
        WalletTransaction.objects.create(
            wallet=client_wallet,
            transaction_type="booking_charge",
            amount=result.gross_earned,
            running_balance=client_wallet.balance,
            booking=locked_booking,
            reference=f"CHARGE-{locked_booking.id}",
            status="completed",
            raw_provider_response={
                "duration_seconds": result.duration_seconds,
                "decision": result.decision,
            },
        )

        if result.client_refund > Decimal("0.00"):
            WalletTransaction.objects.create(
                wallet=client_wallet,
                transaction_type="booking_refund_release",
                amount=result.client_refund,
                running_balance=client_wallet.balance,
                booking=locked_booking,
                reference=f"RELEASE-{locked_booking.id}",
                status="completed",
            )

        # 3. Credit net payout to expert wallet
        if result.expert_payout > Decimal("0.00"):
            expert_wallet.balance += result.expert_payout
            expert_wallet.save(update_fields=["balance", "updated_at"])

            # Also update expert profile wallet_balance for backward compatibility
            locked_booking.expert.wallet_balance += result.expert_payout
            locked_booking.expert.save(update_fields=["wallet_balance", "updated_at"])

            WalletTransaction.objects.create(
                wallet=expert_wallet,
                transaction_type="expert_payout",
                amount=result.expert_payout,
                running_balance=expert_wallet.balance,
                booking=locked_booking,
                reference=f"PAYOUT-{locked_booking.id}",
                status="completed",
            )

        # 4. Update booking state
        if result.decision == "grace_period_refund":
            locked_booking.status = "cancelled"
        else:
            locked_booking.status = "completed"

        locked_booking.save(update_fields=["status", "updated_at"])

        return {
            "decision": result.decision,
            "duration_seconds": result.duration_seconds,
            "total_deposit": str(result.total_deposit),
            "gross_earned": str(result.gross_earned),
            "client_refund": str(result.client_refund),
            "client_platform_fee": str(result.client_platform_fee),
            "expert_platform_fee": str(result.expert_platform_fee),
            "platform_fee": str(result.platform_fee),
            "expert_payout": str(result.expert_payout),
            "status": locked_booking.status,
            "client_available_balance": str(client_wallet.available_balance),
            "expert_wallet_balance": str(expert_wallet.balance),
        }

    @classmethod
    @transaction.atomic
    def request_withdrawal(
        cls, user, amount: Decimal, provider: str = "telebirr", account_number: str = ""
    ) -> WalletTransaction:
        """
        Deducts balance from user's wallet and triggers external gateway transfer/payout.
        """
        wallet, _ = UserWallet.objects.select_for_update().get_or_create(user=user)
        amount = Decimal(str(amount))

        if wallet.available_balance < amount:
            raise ValueError(
                f"Insufficient available balance for withdrawal. "
                f"Requested: {amount} ETB, Available: {wallet.available_balance} ETB."
            )

        wallet.balance -= amount
        wallet.save(update_fields=["balance", "updated_at"])

        ref = f"WD-{uuid.uuid4().hex[:12].upper()}"

        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type="withdrawal",
            amount=amount,
            running_balance=wallet.balance,
            reference=ref,
            status="pending",
        )

        # Call Chapa Service for payout transfer
        chapa = ChapaService()
        payout_res = chapa.transfer_to_expert(
            expert=getattr(user, "expert_profile", None),
            amount=amount,
            tx_ref=ref,
            account_number=account_number,
            provider=provider,
        )

        tx.status = "completed"
        tx.raw_provider_response = payout_res
        tx.save(update_fields=["status", "raw_provider_response"])

        return tx
