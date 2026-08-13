from django.utils import timezone


class DisputeTelemetryGenerator:
    """
    Auto-generates timestamped call drop summaries and session telemetry logs
    for administrative auditing during disputes.
    """

    @staticmethod
    def generate_summary(booking) -> dict:
        scheduled_duration = (booking.scheduled_end - booking.scheduled_start).total_seconds()
        actual_start = booking.scheduled_start
        now = timezone.now()
        active_duration = (now - actual_start).total_seconds()

        return {
            "booking_id": str(booking.id),
            "channel": booking.channel,
            "scheduled_start": booking.scheduled_start.isoformat(),
            "scheduled_end": booking.scheduled_end.isoformat(),
            "actual_start": actual_start.isoformat(),
            "calculated_duration_seconds": max(0, int(active_duration)),
            "scheduled_duration_seconds": int(scheduled_duration),
            "drop_detected": active_duration < scheduled_duration,
            "client_phone": booking.client.phone_number,
            "expert_phone": booking.expert.user.phone_number,
            "audit_timestamp": now.isoformat(),
            "telemetry_events": [
                {"timestamp": actual_start.isoformat(), "event": "SESSION_INITIATED"},
                {"timestamp": now.isoformat(), "event": "DISPUTE_RAISED_BY_PARTICIPANT"},
            ],
        }