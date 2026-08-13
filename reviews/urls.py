from django.urls import path

from .views import ExpertReviewListView, ReviewCreateView, ReviewDetailView

urlpatterns = [
    path("", ReviewCreateView.as_view(), name="review_create"),
    path("<uuid:id>", ReviewDetailView.as_view(), name="review_detail"),
    path("expert/<uuid:expert_id>", ExpertReviewListView.as_view(), name="expert_reviews"),
]