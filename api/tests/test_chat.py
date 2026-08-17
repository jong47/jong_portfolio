import logging

import pytest
from fastapi.testclient import TestClient

from portfolio_api import main
from portfolio_api.config import Settings

LIMIT = 3
QUESTION = "What did you build at Tax Relief Advocates?"


@pytest.fixture
def client(settings: Settings) -> TestClient:
    """Overrides the shared fixture with a limit small enough to reach in a test.
    Function-scoped, so every test gets an app with an untouched limiter."""
    limited = settings.model_copy(update={"chat_rate_limit": LIMIT})
    return TestClient(main.create_app(limited))


@pytest.fixture
def embedded(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Captures what would have been embedded instead of embedding it."""
    calls: list[str] = []
    monkeypatch.setattr(main, "embed", calls.append)
    return calls


@pytest.fixture
def drops(caplog: pytest.LogCaptureFixture) -> pytest.LogCaptureFixture:
    caplog.set_level(logging.WARNING, logger="portfolio_api.chat")
    return caplog


def test_answers_a_question(client: TestClient, embedded: list[str]):
    response = client.post("/chat", json={"message": QUESTION})

    assert response.status_code == 200
    assert isinstance(response.json()["reply"], str)
    assert embedded == [QUESTION]


@pytest.mark.parametrize("message", ["", "   ", "\n\t"])
def test_drops_an_empty_question(
    client: TestClient, embedded: list[str], drops: pytest.LogCaptureFixture, message: str
):
    response = client.post("/chat", json={"message": message})

    assert response.status_code == 422
    assert embedded == []
    assert "reason=empty" in drops.text


def test_drops_an_oversized_question(
    client: TestClient, embedded: list[str], drops: pytest.LogCaptureFixture
):
    response = client.post("/chat", json={"message": "x" * 5000})

    assert response.status_code == 422
    assert embedded == []
    assert "reason=too_long client=testclient chars=5000" in drops.text


def test_refuses_past_the_limit_and_says_when_to_come_back(
    client: TestClient, embedded: list[str], drops: pytest.LogCaptureFixture
):
    for _ in range(LIMIT):
        assert client.post("/chat", json={"message": QUESTION}).status_code == 200

    refused = client.post("/chat", json={"message": QUESTION})

    assert refused.status_code == 429
    assert refused.headers["retry-after"] == "60"
    assert len(embedded) == LIMIT
    assert "reason=rate_limited" in drops.text


def test_never_logs_what_the_visitor_typed(
    client: TestClient, drops: pytest.LogCaptureFixture
):
    """
    The whole reason drops are logged as a shape and not as content: a visitor's
    words should not end up sitting in a log aggregator.
    """
    secret = "hunter2-correct-horse-battery-staple"

    client.post("/chat", json={"message": secret + "x" * 5000})
    for _ in range(LIMIT + 2):
        client.post("/chat", json={"message": secret})

    assert "reason=too_long" in drops.text
    assert "reason=rate_limited" in drops.text
    assert secret not in drops.text


def test_a_missing_message_is_still_a_422(client: TestClient, embedded: list[str]):
    """Pydantic catches the wrong shape before the pre-check ever sees it."""
    response = client.post("/chat", json={})

    assert response.status_code == 422
    assert embedded == []


def test_echoes_cors_only_back_to_an_allowed_origin(
    client: TestClient, origin: str, embedded: list[str]
):
    body = {"message": QUESTION}

    allowed = client.post("/chat", json=body, headers={"origin": origin})
    assert allowed.headers["access-control-allow-origin"] == origin

    stranger = client.post("/chat", json=body, headers={"origin": "https://evil.example"})
    assert "access-control-allow-origin" not in stranger.headers
