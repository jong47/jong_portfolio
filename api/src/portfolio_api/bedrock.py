import logging
from collections.abc import AsyncIterator
from functools import lru_cache

import boto3

from .config import Settings
from .prompt import CORPUS, MATCH, STYLE

logger = logging.getLogger(__name__)


@lru_cache
def _client(region: str, key_id: str | None, secret: str | None, token: str | None):
    return boto3.client(
        "bedrock-runtime",
        region_name=region,
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
        aws_session_token=token,
    )


async def answer(
    message: str, posting: str | None, settings: Settings
) -> AsyncIterator[str]:
    system = [{"text": f"{STYLE}\n\n{MATCH}" if posting else STYLE}, {"text": CORPUS}]
    content = f"Job posting:\n{posting}\n\nQuestion: {message}" if posting else message

    request = {
        "modelId": settings.bedrock_model_id,
        "system": system,
        "messages": [{"role": "user", "content": [{"text": content}]}],
        "inferenceConfig": {"maxTokens": settings.max_output_tokens},
    }
    if settings.guardrail_id:
        request["guardrailConfig"] = {
            "guardrailIdentifier": settings.guardrail_id,
            "guardrailVersion": settings.guardrail_version,
        }

    client = _client(
        settings.bedrock_region,
        settings.aws_access_key_id,
        settings.aws_secret_access_key,
        settings.aws_session_token,
    )

    for event in client.converse_stream(**request)["stream"]:
        if delta := event.get("contentBlockDelta"):
            yield delta["delta"]["text"]
        elif metadata := event.get("metadata"):
            usage = metadata.get("usage", {})
            logger.info(
                "answered: input_tokens=%s output_tokens=%s latency_ms=%s posting=%s",
                usage.get("inputTokens"),
                usage.get("outputTokens"),
                metadata.get("metrics", {}).get("latencyMs"),
                posting is not None,
            )
