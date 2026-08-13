import uuid
from datetime import timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from bookings.models import Booking
from experts.models import Expert


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="review",
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_reviews",
    )
    expert = models.ForeignKey(
        Expert,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1 to 5 star rating",
    )
    comment = models.TextField(blank=True)
    edit_count = models.PositiveIntegerField(default=0)
    lockout_until = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reviews_review"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        # Set 24-hour lockout_until timestamp on initial creation
        if not self.lockout_until:
            self.lockout_until = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_editable(self) -> bool:
        """Returns True if current time is within the 24-hour edit window."""
        if not self.lockout_until:
            return True
        return timezone.now() <= self.lockout_until

    def __str__(self):
        return f"Review {self.rating}★ by {self.client.phone_number} for {self.expert.id}"