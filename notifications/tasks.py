from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from bookings.models import Booking

from .services import NotificationService


@shared_task
def send_schedule_change_notification(booking_id: str, change_type: str):
    """
    Asynchronous worker dispatching immediate SMS/push notices when a session is updated or cancelled.
    """
    booking = Booking.objects.select_related("client", "expert", "expert__user").filter(id=booking_id).first()
    if not booking:
        return f"Booking {booking_id} not found."

    start_time = booking.scheduled_start.strftime("%Y-%m-%d %H:%M UTC")
    if change_type == "rescheduled":
        title = "Consultation Rescheduled"
        client_msg = f"Your consultation with {booking.expert.title} is rescheduled to {start_time}."
        expert_msg = f"Your consultation with {booking.client.phone_number} is rescheduled to {start_time}."
    elif change_type == "cancelled":
        title = "Consultation Cancelled"
        client_msg = f"Your consultation with {booking.expert.title} has been cancelled."
        expert_msg = f"Your consultation with {booking.client.phone_number} has been cancelled."
    else:
        title = "Consultation Schedule Update"
        client_msg = f"Schedule updated for your consultation with {booking.expert.title}."
        expert_msg = f"Schedule updated for consultation with {booking.client.phone_number}."

    # Dispatch to both Client and Expert
    NotificationService.create_and_dispatch(
        user=booking.client, title=title, message=client_msg, notification_type="schedule_change"
    )
    NotificationService.create_and_dispatch(
        user=booking.expert.user, title=title, message=expert_msg, notification_type="schedule_change"
    )

    return f"Dispatched {change_type} notifications for Booking {booking_id}."


@shared_task
def dispatch_24h_session_reminders():
    """
    Celery Beat task running every 15 mins to send 24-hour pre-session reminders.
    """
    now = timezone.now()
    window_start = now + timedelta(hours=23, minutes=45)
    window_end = now + timedelta(hours=24, minutes=15)

    upcoming_bookings = Booking.objects.filter(
        scheduled_start__gte=window_start,
        scheduled_start__lte=window_end,
        status="escrowed",
    ).select_related("client", "expert", "expert__user")

    dispatched_count = 0
    for booking in upcoming_bookings:
        start_time = booking.scheduled_start.strftime("%H:%M UTC")
        msg = f"Reminder: Your consultation with {booking.expert.title} starts in 24 hours ({start_time})."
        NotificationService.create_and_dispatch(
            user=booking.client,
            title="24-Hour Consultation Reminder",
            message=msg,
            notification_type="reminder_24h",
        )
        dispatched_count += 1

    return f"Dispatched {dispatched_count} 24-hour reminder(s)."


@shared_task
def dispatch_1h_session_reminders():
    """
    Celery Beat task running every 5 mins to send 1-hour pre-session reminders.
    """
    now = timezone.now()
    window_start = now + timedelta(minutes=55)
    window_end = now + timedelta(minutes=65)

    upcoming_bookings = Booking.objects.filter(
        scheduled_start__gte=window_start,
        scheduled_start__lte=window_end,
        status="escrowed",
    ).select_related("client", "expert", "expert__user")

    dispatched_count = 0
    for booking in upcoming_bookings:
        msg = f"Reminder: Your consultation starts in 1 hour ({booking.scheduled_start.strftime('%H:%M UTC')})."
        NotificationService.create_and_dispatch(
            user=booking.client,
            title="1-Hour Consultation Reminder",
            message=msg,
            notification_type="reminder_1h",
        )
        dispatched_count += 1

    return f"Dispatched {dispatched_count} 1-hour reminder(s)."