from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from experts.models import Expert
from reviews.models import Review

User = get_user_model()


@pytest.mark.django_db
class TestReviewsEngine:

    def setup_method(self):
        self.client = APIClient()
        self.client_user = User.objects.create_user(phone_number="+251911889900")
        self.expert_user = User.objects.create_user(phone_number="+251911445566")
        self.expert = Expert.objects.create(
            user=self.expert_user,
            title="Legal Consultant",
            rate_per_session=Decimal("1000.00"),
            wallet_provider="telebirr",
            wallet_account_number="+251911445566",
        )
        self.booking = Booking.objects.create(
            client=self.client_user,
            expert=self.expert,
            channel="voice",
            scheduled_start=timezone.now(),
            scheduled_end=timezone.now() + timezone.timedelta(minutes=30),
            rate_snapshot=Decimal("1000.00"),
            status="completed",
        )

    def test_client_can_submit_review_for_completed_booking(self):
        self.client.force_authenticate(user=self.client_user)
        payload = {
            "booking_id": str(self.booking.id),
            "rating": 5,
            "comment": "Excellent advice on Ethiopian foreign exchange regulations!",
        }
        res = self.client.post("/api/v1/reviews/", payload, format="json")

        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["rating"] == 5
        assert res.data["is_editable"] is True
        assert Review.objects.filter(booking=self.booking).exists()

    def test_cannot_review_uncompleted_booking(self):
        uncompleted = Booking.objects.create(
            client=self.client_user,
            expert=self.expert,
            channel="voice",
            scheduled_start=timezone.now(),
            scheduled_end=timezone.now() + timezone.timedelta(minutes=30),
            rate_snapshot=Decimal("1000.00"),
            status="escrowed",
        )
        self.client.force_authenticate(user=self.client_user)
        payload = {"booking_id": str(uncompleted.id), "rating": 4}
        res = self.client.post("/api/v1/reviews/", payload, format="json")

        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_24_hour_edit_lockout_enforcement(self):
        self.client.force_authenticate(user=self.client_user)
        review = Review.objects.create(
            booking=self.booking,
            client=self.client_user,
            expert=self.expert,
            rating=4,
            comment="Initial review",
            lockout_until=timezone.now() - timedelta(hours=1),  # Expired lockout
        )

        res = self.client.patch(
            f"/api/v1/reviews/{review.id}/",
            {"rating": 5, "comment": "Updated comment"},
            format="json",
        )

        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "24-hour edit lockout window" in res.data["error"]

    def test_public_can_list_expert_reviews(self):
        Review.objects.create(
            booking=self.booking,
            client=self.client_user,
            expert=self.expert,
            rating=5,
            comment="Great consultation",
        )

        # Unauthenticated request
        res = self.client.get(f"/api/v1/reviews/expert/{self.expert.id}/")

        assert res.status_code == status.HTTP_200_OK
        data = res.data["results"] if "results" in res.data else res.data
        assert len(data) == 1
        assert data[0]["rating"] == 5