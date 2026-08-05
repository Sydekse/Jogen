import os

import boto3
from botocore.exceptions import BotoCoreError, ClientError


class S3StorageService:
    """
    Manages secure S3 object storage operations using presigned URLs.
    """

    def __init__(self):
        self.bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "jogen-session-files-dev")
        self.region_name = os.getenv("AWS_S3_REGION_NAME", "us-east-1")

        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "dummy-access-key"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "dummy-secret-key"),
            region_name=self.region_name,
        )

    def generate_presigned_upload_url(
        self, s3_key: str, mime_type: str, expiration: int = 900
    ) -> str:
        """Generates a secure presigned PUT URL for uploading directly to S3 (valid for 15 mins)."""
        try:
            url = self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": s3_key,
                    "ContentType": mime_type,
                },
                ExpiresIn=expiration,
            )
            return url
        except (BotoCoreError, ClientError) as e:
            raise RuntimeError(f"Could not generate presigned upload URL: {e!s}")

    def generate_presigned_download_url(self, s3_key: str, expiration: int = 3600) -> str:
        """Generates a secure presigned GET URL for downloading files from S3 (valid for 1 hour)."""
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": s3_key,
                },
                ExpiresIn=expiration,
            )
            return url
        except (BotoCoreError, ClientError) as e:
            raise RuntimeError(f"Could not generate presigned download URL: {e!s}")
