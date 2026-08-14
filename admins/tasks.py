from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from bookings.models import SessionFile

from .retention import AdminRetentionService


@shared_task
def purge_expired_verification_documents():
    """
    Celery background worker running daily to purge expert ID and credential files
    30 days post-verification.
    """
    cutoff_date = timezone.now() - timedelta(days=30)
    expired_files = SessionFile.objects.filter(
        s3_key__startswith="verification_docs/",
        created_at__lte=cutoff_date,
    )

    retention_service = AdminRetentionService()
    purged_count = 0

    for file_obj in expired_files:
        try:
            retention_service.s3_client.delete_object(
                Bucket=retention_service.bucket_name,
                Key=file_obj.s3_key,
            )
            file_obj.delete()
            purged_count += 1
        except Exception as e:
            print(f"Error purging verification file {file_obj.s3_key}: {e!s}")

    return f"Purged {purged_count} expired verification document(s)."
