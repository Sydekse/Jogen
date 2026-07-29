import pytest


def test_sanity_check():
    assert 1 + 1 == 2


@pytest.mark.django_db
def test_db_connection():
    from django.contrib.auth import get_user_model

    User = get_user_model()
    assert User.objects.count() == 0
