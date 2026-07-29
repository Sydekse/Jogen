import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_user_success():
    user = User.objects.create_user(
        phone_number="+251911223344", full_name="Abebe Bikila", preferred_language="am"
    )
    assert user.phone_number == "+251911223344"
    assert user.preferred_language == "am"
    assert user.deleted_at is None
    assert user.is_active is True


@pytest.mark.django_db
def test_user_soft_delete():
    user = User.objects.create_user(phone_number="+251911000000")
    user.soft_delete()

    user.refresh_from_db()
    assert user.deleted_at is not None
    assert user.is_active is False
