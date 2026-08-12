from django.urls import path

from .views import (
    AtomicEscrowReleaseView,
    ChapaWebhookView,
    InitializeEscrowPaymentView,
)

urlpatterns = [
    path("initialize", InitializeEscrowPaymentView.as_view(), name="initialize"),
    path("webhook", ChapaWebhookView.as_view(), name="webhook"),
    path("<uuid:booking_id>/release", AtomicEscrowReleaseView.as_view(), name="release"),
]
