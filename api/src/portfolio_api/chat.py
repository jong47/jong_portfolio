import logging
from enum import StrEnum
from typing import NamedTuple

from .config import Settings
from .ratelimit import SlidingWindow

logger = logging.getLogger(__name__)


class Drop(StrEnum):
    RATE_LIMITED = "rate_limited"
    EMPTY = "empty"
    TOO_LONG = "too_long"


class Rejection(NamedTuple):
    status: int
    detail: str


REJECTIONS: dict[Drop, Rejection] = {
    Drop.RATE_LIMITED: Rejection(429, "Too many questions at once. Give it a moment."),
    Drop.EMPTY: Rejection(422, "Ask something first."),
    Drop.TOO_LONG: Rejection(422, "That question is too long."),
}


def precheck(
    message: str,
    client: str,
    limiter: SlidingWindow,
    settings: Settings,
) -> Drop | None:
    """
    The one place a query is refused before it costs anything. Constraints live
    here rather than on the request model because pydantic raises before the
    handler runs, and a rejection nothing logged is a rejection nobody can see.

    The limiter goes first and spends a slot even on a malformed body, so a flood
    of junk is still a flood.
    """
    if not limiter.allow(client):
        return _dropped(Drop.RATE_LIMITED, client, message)

    if not message.strip():
        return _dropped(Drop.EMPTY, client, message)

    if len(message) > settings.max_query:
        return _dropped(Drop.TOO_LONG, client, message)

    return None


def _dropped(reason: Drop, client: str, message: str) -> Drop:
    """Records the shape of what was thrown away, never the text of it — a visitor's
    words should not end up sitting in a log aggregator."""
    logger.warning(
        "dropped query: reason=%s client=%s chars=%d", reason, client, len(message)
    )
    return reason
