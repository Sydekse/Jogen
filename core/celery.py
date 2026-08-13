import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("jogen")

# Load configuration from Django settings using the CELERY namespace
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all registered INSTALLED_APPS
app.autodiscover_tasks()

# Celery Beat Periodic Schedule
app.conf.beat_schedule = {
    "dispatch-24h-session-reminders": {
        "task": "notifications.tasks.dispatch_24h_session_reminders",
        "schedule": crontab(minute="*/15"),  # Runs every 15 minutes
    },
    "dispatch-1h-session-reminders": {
        "task": "notifications.tasks.dispatch_1h_session_reminders",
        "schedule": crontab(minute="*/5"),  # Runs every 5 minutes
    },
}