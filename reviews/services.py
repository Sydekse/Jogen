from datetime import timedelta

from django.db import models, transaction
from django.utils import timezone
from rest_framework import serializers

from bookings.models import Booking
from experts.models import Expert
from payments.models import EscrowTransaction

from .models import Review


class ReviewService:
    """
    Service layer for review submission, edits with 24-hour lockout, and aggregate rating recalculation.
    """

    @classmethod
    @transaction.atomic
    def create_review(cls, client, booking_id, rating: int, comment: str = "") -> Review:
        booking = Booking.objects.select_for_update().filter(id=booking_id).first()
        if not booking:
            raise serializers.ValidationError({"booking_id": "Booking record not found."})

        if booking.client != client:
            raise serializers.ValidationError(
                {"booking_id": "You can only review consultations you participated in."}
            )

        if booking.status == "escrowed" and booking.scheduled_end <= timezone.now():
            booking.status = "completed"
            booking.save(update_fields=["status", "updated_at"])

        refund_settlement = (
            booking.status == "cancelled"
            and EscrowTransaction.objects.filter(
                booking=booking,
                status="refunded",
                raw_provider_response__settlement__decision="grace_period_refund",
            ).exists()
        )

        if booking.status != "completed" and not refund_settlement:
            raise serializers.ValidationError(
                {"booking_id": "Reviews can only be submitted for completed consultations."}
            )

        if hasattr(booking, "review"):
            raise serializers.ValidationError(
                {"booking_id": "A review has already been submitted for this consultation."}
            )

        review = Review.objects.create(
            booking=booking,
            client=client,
            expert=booking.expert,
            rating=rating,
            comment=comment,
            lockout_until=timezone.now() + timedelta(hours=24),
        )

        cls.recalculate_expert_rating(booking.expert)
        return review

    @classmethod
    @transaction.atomic
    def update_review(cls, review: Review, client, rating: int | None = None, comment: str | None = None) -> Review:
        if review.client != client:
            raise serializers.ValidationError({"error": "You do not have permission to edit this review."})

        if not review.is_editable:
            raise serializers.ValidationError(
                {"error": "The 24-hour edit lockout window for this review has expired."}
            )

        if rating is not None:
            review.rating = rating
        if comment is not None:
            review.comment = comment

        review.edit_count += 1
        review.save()

        cls.recalculate_expert_rating(review.expert)
        return review

    @classmethod
    def recalculate_expert_rating(cls, expert: Expert):
        """
        Recalculates and updates the aggregate average rating for an expert.
        """
        stats = expert.reviews.aggregate(
            avg_rating=models.Avg("rating"),
            total_count=models.Count("id"),
        )
        avg_rating = round(stats["avg_rating"] or 0.0, 2)
        return {"average_rating": avg_rating, "total_reviews": stats["total_count"]}