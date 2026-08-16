from functools import lru_cache

import boto3

from .config import Settings


@lru_cache
def _client(region: str, key_id: str | None, secret: str | None):
    """Passing None for both falls back to the ambient credential chain, which is
    what an instance role or AWS_PROFILE provides in production."""
    return boto3.client(
        "ses",
        region_name=region,
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
    )


def send(settings: Settings, name: str, sender: str, message: str) -> None:
    """
    Sends from the verified SES identity, never from the visitor's address — SES
    would reject that, and it would be a spoof besides. Reply-To carries the
    visitor instead, so replying from the inbox reaches the right person.
    """
    client = _client(
        settings.aws_region,
        settings.aws_access_key_id,
        settings.aws_secret_access_key,
    )

    client.send_email(
        Source=settings.ses_sender,
        Destination={"ToAddresses": [settings.contact_email]},
        ReplyToAddresses=[sender],
        Message={
            "Subject": {"Data": f"Portfolio contact from {name}"},
            "Body": {"Text": {"Data": f"From: {name} <{sender}>\n\n{message}"}},
        },
    )
