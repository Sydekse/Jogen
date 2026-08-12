from django.urls import path

from .views import AdminExpertListView, AdminExpertVerificationView

urlpatterns = [
    path("experts", AdminExpertListView.as_view(), name="admin_expert_list"),
    path("experts/<uuid:id>", AdminExpertVerificationView.as_view(), name="admin_expert_verify"),
]