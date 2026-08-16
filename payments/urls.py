from django.urls import path

from .views import (
    AtomicEscrowReleaseView,
    ChapaWebhookView,
    InitializeEscrowPaymentView,
    SessionEndEscrowAdjustmentView,
    WalletLinkingView,
)

urlpatterns = [
    path("initialize/", InitializeEscrowPaymentView.as_view(), name="initialize"),
    path("webhook/", ChapaWebhookView.as_view(), name="webhook"),
    path("<uuid:booking_id>/release/", AtomicEscrowReleaseView.as_view(), name="release"),
    path("wallet/", WalletLinkingView.as_view(), name="wallet_linking"),
    path(
        "<uuid:booking_id>/session-end/",
        SessionEndEscrowAdjustmentView.as_view(),
        name="session_end_adjustment",
    ),
]
