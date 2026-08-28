import logging
import unicodedata
from enum import StrEnum

logger = logging.getLogger(__name__)

ALLOWED_CONTROLS = frozenset("\n\t")
BLOCKED_CATEGORIES = frozenset({"Cc", "Cf", "Cs", "Co", "Cn"})


class Drop(StrEnum):
    EMPTY = "empty"
    TOO_LONG = "too_long"
    UNSUPPORTED = "unsupported"


REFUSALS: dict[Drop, str] = {
    Drop.EMPTY: "Ask me something and I'll answer.",
    Drop.TOO_LONG: "That question is longer than I can take in — try trimming it down.",
    Drop.UNSUPPORTED: "That question has characters I can't read. Try typing it again.",
}


def screen(text: str, limit: int) -> Drop | None:
    if not text.strip():
        return _record(Drop.EMPTY, text)

    if len(text) > limit:
        return _record(Drop.TOO_LONG, text)

    offenders = [
        category
        for character in text
        if character not in ALLOWED_CONTROLS
        and (category := unicodedata.category(character)) in BLOCKED_CATEGORIES
    ]
    if offenders:
        return _record(Drop.UNSUPPORTED, text, offenders)

    return None


def _record(reason: Drop, text: str, offenders: list[str] | None = None) -> Drop:
    logger.warning(
        "dropped query: reason=%s categories=%s offenders=%d chars=%d",
        reason,
        ",".join(sorted(set(offenders))) if offenders else "-",
        len(offenders or ()),
        len(text),
    )
    return reason
