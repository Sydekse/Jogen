from django.urls import path

from .views import (
    ConsultationDetailView,
    ConsultationListCreateView,
    SessionFileDownloadUrlView,
    SessionFileListCreateView,
    SessionFileUploadUrlView,
)

urlpatterns = [
    path("", ConsultationListCreateView.as_view(), name="consultation_list_create"),
    path("<uuid:booking_id>/", ConsultationDetailView.as_view(), name="consultation_detail"),
    # Session File Endpoints
    path(
        "<uuid:booking_id>/files/upload-url/",
        SessionFileUploadUrlView.as_view(),
        name="session_file_upload_url",
    ),
    path(
        "<uuid:booking_id>/files/",
        SessionFileListCreateView.as_view(),
        name="session_file_list_create",
    ),
    path(
        "<uuid:booking_id>/files/<uuid:file_id>/download-url/",
        SessionFileDownloadUrlView.as_view(),
        name="session_file_download_url",
    ),
]
