import uuid

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager for User model where phone_number is the unique identifier."""

    def create_user(self, phone_number, preferred_language="am", **extra_fields):
        if not phone_number:
            raise ValueError("The Phone Number field must be set")
        user = self.model(
            phone_number=phone_number, preferred_language=preferred_language, **extra_fields
        )
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(phone_number, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    USER entity as specified in Tech Spec TSP-2026-001 §3.2
    """

    LANGUAGE_CHOICES = [
        ("am", "Amharic"),
        ("en", "English"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    full_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(max_length=254, unique=True, null=True, blank=True)
    profile_picture = models.ImageField(upload_to="profile_pics/", null=True, blank=True)
    preferred_language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default="am")
    created_at = models.DateTimeField(default=timezone.now)
    deleted_at = models.DateTimeField(null=True, blank=True)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = UserManager()

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users_user"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def soft_delete(self):
        """Perform soft delete by marking deleted_at timestamp."""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save()

    def __str__(self):
        return self.phone_number
