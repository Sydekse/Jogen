from django.urls import path

from .views import ConsultationDetailView, ConsultationListCreateView

urlpatterns = [
    path("", ConsultationListCreateView.as_view(), name="consultation_list_create"),
    path("<uuid:booking_id>", ConsultationDetailView.as_view(), name="consultation_detail"),
]
