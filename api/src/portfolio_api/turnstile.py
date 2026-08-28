import asyncio
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from .config import Settings

logger = logging.getLogger(__name__)

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
TIMEOUT_SECONDS = 5


async def verify(token: str | None, settings: Settings) -> bool:
    if not settings.turnstile_secret:
        return True

    if not token:
        logger.warning("turnstile: missing token")
        return False

    return await asyncio.to_thread(_siteverify, token, settings.turnstile_secret)


def _siteverify(token: str, secret: str) -> bool:
    request = urllib.request.Request(
        SITEVERIFY_URL,
        data=urllib.parse.urlencode({"secret": secret, "response": token}).encode(),
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            outcome = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        logger.warning("turnstile: verification unreachable")
        return False

    if not outcome.get("success"):
        logger.warning(
            "turnstile: rejected codes=%s",
            ",".join(outcome.get("error-codes") or ()) or "-",
        )
        return False

    return True
