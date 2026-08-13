from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from experts.models import Expert

from .models import Review
from .serializers import (
    ReviewCreateSerializer,
    ReviewListSerializer,
    ReviewUpdateSerializer,
)
from .services import ReviewService


class ReviewCreateView(APIView):
    """
    POST /api/v1/reviews
    Submits a new 1-5 star review for a completed consultation booking.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = ReviewService.create_review(
            client=request.user,
            booking_id=serializer.validated_data["booking_id"],
            rating=serializer.validated_data["rating"],
            comment=serializer.validated_data.get("comment", ""),
        )

        return Response(ReviewListSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewDetailView(APIView):
    """
    PATCH /api/v1/reviews/{id}
    Edits an existing review within the 24-hour lockout window.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, id):
        review = get_object_or_404(Review, id=id)
        serializer = ReviewUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_review = ReviewService.update_review(
            review=review,
            client=request.user,
            rating=serializer.validated_data.get("rating"),
            comment=serializer.validated_data.get("comment"),
        )

        return Response(ReviewListSerializer(updated_review).data, status=status.HTTP_200_OK)


class ExpertReviewListView(ListAPIView):
    """
    GET /api/v1/reviews/{expert_id}
    Public endpoint listing all reviews for a specific expert profile.
    """

    permission_classes = [AllowAny]
    serializer_class = ReviewListSerializer

    def get_queryset(self):
        expert_id = self.kwargs.get("expert_id")
        get_object_or_404(Expert, id=expert_id)
        return Review.objects.filter(expert_id=expert_id).select_related("client").order_by("-created_at")