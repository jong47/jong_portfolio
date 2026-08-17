import logging

logger = logging.getLogger(__name__)


def embed(message: str) -> None:
    """
    Stands in for the embedding call and the corpus lookup behind it.

    It logs rather than returns so the pipeline is observable before there is
    anything to observe, and so the shape of the call is already in place when a
    real provider goes in behind it.
    """
    logger.info("embed: chars=%d", len(message))
