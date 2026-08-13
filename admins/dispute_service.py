from decimal import Decimal

from django.db import transaction

from payments.chapa_service import ChapaService
from payments.models import EscrowTransaction


class DisputeResolutionService:
    """
    Service Layer encapsulating dispute workflow transitions and financial escrow execution.
    """

    @classmethod
    @transaction.atomic
    def resolve_dispute(
        cls, dispute, status: str, action: str | None = None, admin_user=None, notes: str = ""
    ):
        dispute.status = status
        dispute.admin_notes = notes
        dispute.resolved_by = admin_user

        booking = dispute.booking
        escrow_tx = EscrowTransaction.objects.select_for_update().filter(booking=booking).first()

        if status == "frozen" and escrow_tx:
            # Ensure escrow remains locked in held state
            escrow_tx.status = "held"
            escrow_tx.save()

        elif status == "resolved" and action:
            if not escrow_tx or escrow_tx.status not in ["held", "released"]:
                raise ValueError(f"Escrow status '{getattr(escrow_tx, 'status', None)}' cannot be resolved.")

            dispute.resolution_action = action
            chapa = ChapaService()
            total_amount = escrow_tx.amount

            if action == "full_refund":
                chapa.refund_client(tx_ref=escrow_tx.tx_ref, amount=total_amount)
                escrow_tx.status = "refunded"
                booking.status = "cancelled"

            elif action == "full_release":
                net_payout = total_amount * Decimal("0.90")
                chapa.transfer_to_expert(
                    expert=booking.expert, amount=net_payout, tx_ref=escrow_tx.tx_ref
                )
                escrow_tx.status = "released"
                booking.status = "completed"

            elif action == "split_50_50":
                client_refund = total_amount * Decimal("0.50")
                expert_payout = total_amount * Decimal("0.50") * Decimal("0.90")

                chapa.refund_client(tx_ref=escrow_tx.tx_ref, amount=client_refund)
                chapa.transfer_to_expert(
                    expert=booking.expert, amount=expert_payout, tx_ref=escrow_tx.tx_ref
                )
                escrow_tx.status = "released"
                booking.status = "completed"

            escrow_tx.save()
            booking.save()

        dispute.save()
        return dispute