from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from bookings.models import Booking

from .calculator import PrecisionEscrowCalculator
from .chapa_service import ChapaService
from .models import EscrowTransaction


class EscrowService:
    """
    Orchestrates atomic escrow releases and refunds using precision pro-rata calculations.
    """

    @classmethod
    @transaction.atomic
    def process_session_settlement(
        cls, booking: Booking, duration_seconds: int | None = None
    ) -> dict:
        """
        Settles a consultation booking atomically upon session termination.
        Calculates duration from server timestamps if duration_seconds is not provided.
        """
        locked_booking = Booking.objects.select_for_update().get(id=booking.id)
        escrow_tx = EscrowTransaction.objects.select_for_update().get(
            booking=locked_booking
        )

        if escrow_tx.status == "initiated" and settings.DEBUG:
            escrow_tx.status = "held"
            escrow_tx.save(update_fields=["status", "updated_at"])
            if locked_booking.status == "pending_payment":
                locked_booking.status = "escrowed"
                locked_booking.save(update_fields=["status", "updated_at"])

        if escrow_tx.status != "held":
            raise ValueError(f"Escrow is in '{escrow_tx.status}' state and cannot be settled.")

        # Compute duration from server timestamps if not provided
        if duration_seconds is None:
            if not getattr(locked_booking, "actual_start", None):
                duration_seconds = 0
            else:
                elapsed = (timezone.now() - locked_booking.actual_start).total_seconds()
                duration_seconds = int(elapsed)

        scheduled_seconds = int(
            (locked_booking.scheduled_end - locked_booking.scheduled_start).total_seconds()
        )

        result = PrecisionEscrowCalculator.calculate(
            total_deposit=escrow_tx.amount,
            duration_seconds=duration_seconds,
            scheduled_seconds=scheduled_seconds,
        )

        chapa = ChapaService()

        # 1. Execute Client Refund if applicable
        if result.client_refund > Decimal("0.00"):
            chapa.refund_client(
                tx_ref=escrow_tx.tx_ref,
                amount=result.client_refund,
            )

        # 2. Execute Expert Payout Transfer if applicable & update wallet balance
        if result.expert_payout > Decimal("0.00"):
            chapa.transfer_to_expert(
                expert=locked_booking.expert,
                amount=result.expert_payout,
                tx_ref=escrow_tx.tx_ref,
            )
            locked_booking.expert.wallet_balance += result.expert_payout
            locked_booking.expert.save(update_fields=["wallet_balance", "updated_at"])

        # 3. Update Database State
        if result.decision == "grace_period_refund":
            escrow_tx.status = "refunded"
            locked_booking.status = "cancelled"
        else:
            escrow_tx.status = "released"
            locked_booking.status = "completed"

        escrow_tx.raw_provider_response = {
            "settlement": {
                "decision": result.decision,
                "duration_seconds": result.duration_seconds,
                "gross_earned": str(result.gross_earned),
                "client_refund": str(result.client_refund),
                "platform_fee": str(result.platform_fee),
                "expert_payout": str(result.expert_payout),
            }
        }
        escrow_tx.save()
        locked_booking.save()

        return {
            "decision": result.decision,
            "duration_seconds": result.duration_seconds,
            "total_deposit": str(result.total_deposit),
            "gross_earned": str(result.gross_earned),
            "client_refund": str(result.client_refund),
            "platform_fee": str(result.platform_fee),
            "expert_payout": str(result.expert_payout),
            "status": escrow_tx.status,
        }