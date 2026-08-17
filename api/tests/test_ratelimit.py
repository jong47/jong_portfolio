from portfolio_api.ratelimit import SlidingWindow


class Clock:
    """A hand-cranked monotonic clock, so window expiry is tested without sleeping."""

    def __init__(self) -> None:
        self.at = 1000.0

    def __call__(self) -> float:
        return self.at

    def advance(self, seconds: float) -> None:
        self.at += seconds


def test_allows_exactly_the_limit():
    limiter = SlidingWindow(limit=3, window=60, now=Clock())

    assert [limiter.allow("a") for _ in range(4)] == [True, True, True, False]


def test_the_window_rolling_past_frees_the_client():
    clock = Clock()
    limiter = SlidingWindow(limit=2, window=60, now=clock)

    assert limiter.allow("a")
    assert limiter.allow("a")
    assert not limiter.allow("a")

    clock.advance(61)
    assert limiter.allow("a")


def test_the_window_slides_rather_than_resetting():
    """A fixed window would let 2 through at 0:59 and 2 more at 1:00."""
    clock = Clock()
    limiter = SlidingWindow(limit=2, window=60, now=clock)

    assert limiter.allow("a")
    clock.advance(59)
    assert limiter.allow("a")

    clock.advance(2)  # the first hit has aged out, the second has not
    assert limiter.allow("a")
    assert not limiter.allow("a")


def test_clients_do_not_share_a_budget():
    limiter = SlidingWindow(limit=1, window=60, now=Clock())

    assert limiter.allow("a")
    assert not limiter.allow("a")
    assert limiter.allow("b")


def test_an_idle_client_is_swept_rather_than_held_forever():
    """One request each from many addresses must not grow the map without bound."""
    clock = Clock()
    limiter = SlidingWindow(limit=5, window=60, now=clock)

    for n in range(100):
        limiter.allow(f"client-{n}")
    assert limiter.tracked == 100

    clock.advance(61)
    limiter.allow("someone-else")

    assert limiter.tracked == 1
