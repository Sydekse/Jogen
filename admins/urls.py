from django.urls import path

from .views import (
    AdminDisputeDetailView,
    AdminDisputeListView,
    AdminExpertListView,
    AdminExpertVerificationView,
)

urlpatterns = [
    path("experts", AdminExpertListView.as_view(), name="admin_expert_list"),
    path("experts/<uuid:id>", AdminExpertVerificationView.as_view(), name="admin_expert_verify"),
    path("disputes", AdminDisputeListView.as_view(), name="admin_dispute_list"),
    path("disputes/<uuid:id>", AdminDisputeDetailView.as_view(), name="admin_dispute_detail"),
]
