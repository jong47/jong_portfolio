from functools import lru_cache

import boto3

from .config import Settings


@lru_cache
def _ses(region: str, key_id: str | None, secret: str | None, token: str | None):
    return boto3.client(
        "ses",
        region_name=region,
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
        aws_session_token=token,
    )


def send_mail(settings: Settings, name: str, sender: str, message: str) -> None:
    _ses(
        settings.aws_region,
        settings.aws_access_key_id,
        settings.aws_secret_access_key,
        settings.aws_session_token,
    ).send_email(
        Source=settings.ses_sender,
        Destination={"ToAddresses": [settings.contact_email]},
        ReplyToAddresses=[sender],
        Message={
            "Subject": {"Data": f"Portfolio contact from {name}"},
            "Body": {"Text": {"Data": f"From: {name} <{sender}>\n\n{message}"}},
        },
    )
