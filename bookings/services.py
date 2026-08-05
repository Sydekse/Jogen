from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from experts.models import Expert

from .models import Booking


def reserve_consultation_slot(
    client, expert_id: str, scheduled_start, scheduled_end, channel: str = "voice"
) -> Booking:
    """
    Validates slot availability and creates a Booking inside a pessimistic lock transaction.
    Prevents double-bookings under concurrent requests.
    """
    if scheduled_start >= scheduled_end:
        raise ValidationError({"scheduled_end": "Scheduled end time must be after start time."})

    if scheduled_start < timezone.now():
        raise ValidationError({"scheduled_start": "Cannot book a time slot in the past."})

    with transaction.atomic():
        # 1. Acquire pessimistic row-level lock on Expert record to prevent race conditions
        try:
            expert = Expert.objects.select_for_update().get(
                id=expert_id, verification_status="verified"
            )
        except Expert.DoesNotExist:
            raise ValidationError({"expert": "Verified expert not found."})

        # 2. Check for overlapping active bookings (pending_payment, escrowed, or completed)
        overlapping_bookings = Booking.objects.filter(
            expert=expert,
            status__in=["pending_payment", "escrowed", "completed"],
            scheduled_start__lt=scheduled_end,
            scheduled_end__gt=scheduled_start,
        )

        if overlapping_bookings.exists():
            raise ValidationError(
                {"slot": "This expert slot has already been reserved or booked by another user."}
            )

        # 3. Create reservation with locked rate_snapshot
        booking = Booking.objects.create(
            client=client,
            expert=expert,
            channel=channel,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            rate_snapshot=expert.rate_per_session,
            status="pending_payment",
        )

        return booking
