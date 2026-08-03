from django.urls import path

from .views import ExpertAvailabilityView, ExpertProfileView

urlpatterns = [
    path("profile", ExpertProfileView.as_view(), name="expert_profile"),
    path("availability", ExpertAvailabilityView.as_view(), name="expert_availability"),
]
