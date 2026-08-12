import os

import boto3
from botocore.exceptions import BotoCoreError, ClientError


class AdminRetentionService:
    """
    Manages automated S3 retention and document purging policies for Compliance Admins.
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

    def apply_s3_verification_docs_lifecycle_rule(self, days: int = 30):
        """
        Configures an S3 Bucket Lifecycle Policy to expire objects under
        the 'verification_docs/' prefix after 30 days.
        """
        try:
            lifecycle_policy = {
                "Rules": [
                    {
                        "ID": "PurgeExpertVerificationDocsAfter30Days",
                        "Filter": {"Prefix": "verification_docs/"},
                        "Status": "Enabled",
                        "Expiration": {"Days": days},
                    }
                ]
            }
            self.s3_client.put_bucket_lifecycle_configuration(
                Bucket=self.bucket_name,
                LifecycleConfiguration=lifecycle_policy,
            )
            return True
        except (BotoCoreError, ClientError) as e:
            raise RuntimeError(f"Failed to apply S3 lifecycle retention policy: {e!s}")