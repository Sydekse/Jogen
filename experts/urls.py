from django.urls import path

from .views import (
    ExpertAvailabilityView,
    ExpertDetailView,
    ExpertListView,
    ExpertProfileView,
    ExpertPublicAvailabilityView,
)

urlpatterns = [
    path("", ExpertListView.as_view(), name="expert_list"),
    path("profile", ExpertProfileView.as_view(), name="expert_profile"),
    path("profile/", ExpertProfileView.as_view()),
    path("availability", ExpertAvailabilityView.as_view(), name="expert_availability"),
    path("availability/", ExpertAvailabilityView.as_view()),
    path("<uuid:expert_id>", ExpertDetailView.as_view(), name="expert_detail"),
    path("<uuid:expert_id>/", ExpertDetailView.as_view()),
    path(
        "<uuid:expert_id>/availability",
        ExpertPublicAvailabilityView.as_view(),
        name="expert_public_availability",
    ),
    path(
        "<uuid:expert_id>/availability/",
        ExpertPublicAvailabilityView.as_view(),
    ),
]
