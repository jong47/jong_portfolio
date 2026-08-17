import time
from collections import defaultdict, deque
from collections.abc import Callable


class SlidingWindow:
    """
    Counts requests per client over a rolling window.

    In-process by design: the count resets on restart and is kept per worker, so
    two uvicorn workers means twice the effective limit. That is fine for a single
    process in front of a personal site and wrong for anything else — a shared
    store is what makes this real.
    """

    def __init__(
        self,
        limit: int,
        window: float,
        now: Callable[[], float] = time.monotonic,
    ) -> None:
        # monotonic, not wall clock: a clock adjustment must not hand out free
        # requests or lock somebody out until the hour catches up.
        self._limit = limit
        self._window = window
        self._now = now
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._next_sweep = now() + window

    def allow(self, client: str) -> bool:
        at = self._now()
        self._sweep(at)

        hits = self._hits[client]
        self._expire(hits, at)

        if len(hits) >= self._limit:
            return False

        hits.append(at)
        return True

    @property
    def tracked(self) -> int:
        """How many clients are held in memory. Only the sweep test cares."""
        return len(self._hits)

    def _expire(self, hits: deque[float], at: float) -> None:
        cutoff = at - self._window
        while hits and hits[0] <= cutoff:
            hits.popleft()

    def _sweep(self, at: float) -> None:
        """
        Expiring on access only touches clients who come back. Without this, one
        request each from many addresses grows the map forever, which is a leak
        any caller can reach.
        """
        if at < self._next_sweep:
            return

        self._next_sweep = at + self._window
        for client in list(self._hits):
            hits = self._hits[client]
            self._expire(hits, at)
            if not hits:
                del self._hits[client]
