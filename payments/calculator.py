from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal


@dataclass(frozen=True)
class EscrowCalculationResult:
    duration_seconds: int
    total_deposit: Decimal
    gross_earned: Decimal
    client_refund: Decimal
    platform_fee: Decimal
    expert_payout: Decimal
    decision: str  # 'grace_period_refund' | 'prorated_adjustment' | 'full_completion'


class PrecisionEscrowCalculator:
    """
    Precision pro-rata billing engine for consultation sessions.
    Guarantees zero penny slippage using Decimal arithmetic.
    """

    SESSION_STANDARD_SECONDS = 1800  # 30 Minutes
    GRACE_PERIOD_SECONDS = 120       # 2 Minutes (Connection Drop Grace)
    COMPLETION_THRESHOLD_SECONDS = 1620  # 27 Minutes (90% completion = 100% payout)
    PLATFORM_FEE_RATE = Decimal("0.025")  # 2.5% Platform Fee

    @classmethod
    def calculate(
        cls, total_deposit: Decimal, duration_seconds: int, scheduled_seconds: int = 1800
    ) -> EscrowCalculationResult:
        """
        Computes the exact escrow split with penny-level precision.
        Prorates based on scheduled_seconds for non-standard duration sessions.
        """
        deposit = Decimal(str(total_deposit))
        duration = max(0, duration_seconds)
        target_scheduled = max(60, scheduled_seconds)
        completion_threshold = int(0.9 * target_scheduled)

        # 1. Tier 1: Immediate Drop / Grace Period (0 - 120s)
        if duration < cls.GRACE_PERIOD_SECONDS:
            return EscrowCalculationResult(
                duration_seconds=duration,
                total_deposit=deposit,
                gross_earned=Decimal("0.00"),
                client_refund=deposit,
                platform_fee=Decimal("0.00"),
                expert_payout=Decimal("0.00"),
                decision="grace_period_refund",
            )

        # 2. Tier 3: Full Completion Threshold (90%+ of scheduled duration)
        if duration >= completion_threshold:
            platform_fee = (deposit * cls.PLATFORM_FEE_RATE).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            expert_payout = deposit - platform_fee
            return EscrowCalculationResult(
                duration_seconds=duration,
                total_deposit=deposit,
                gross_earned=deposit,
                client_refund=Decimal("0.00"),
                platform_fee=platform_fee,
                expert_payout=expert_payout,
                decision="full_completion",
            )

        # 3. Tier 2: Linear Pro-Rata Fractional Billing
        duration_ratio = min(Decimal("1.0"), Decimal(duration) / Decimal(target_scheduled))
        gross_earned = (deposit * duration_ratio).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        client_refund = deposit - gross_earned

        platform_fee = (gross_earned * cls.PLATFORM_FEE_RATE).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        expert_payout = gross_earned - platform_fee

        return EscrowCalculationResult(
            duration_seconds=duration,
            total_deposit=deposit,
            gross_earned=gross_earned,
            client_refund=client_refund,
            platform_fee=platform_fee,
            expert_payout=expert_payout,
            decision="prorated_adjustment",
        )