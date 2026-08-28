import logging
from collections.abc import AsyncIterator

import pytest
from fastapi.testclient import TestClient

from portfolio_api import routes as module
from portfolio_api.app import create_app
from portfolio_api.config import Settings
from portfolio_api.screen import REFUSALS, Drop, screen

QUESTION = "What did you build at Tax Relief Advocates?"
POSTING = "Senior Platform Engineer. You will own our Kubernetes estate."
ZERO_WIDTH = "Tell me​about your work"


@pytest.fixture
def drops(caplog: pytest.LogCaptureFixture) -> pytest.LogCaptureFixture:
    caplog.set_level(logging.WARNING, logger="portfolio_api.screen")
    return caplog


@pytest.fixture
def asked(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str | None]]:
    calls: list[tuple[str, str | None]] = []

    async def fake_answer(
        message: str, posting: str | None, settings: Settings
    ) -> AsyncIterator[str]:
        calls.append((message, posting))
        for word in ("Built ", "a ", "document ", "platform."):
            yield word

    monkeypatch.setattr(module, "answer", fake_answer)
    return calls


def collect(client: TestClient, body: dict, headers: dict | None = None):
    with client.stream("POST", "/chat", json=body, headers=headers or {}) as response:
        return response, "".join(response.iter_text())


def test_passes_an_ordinary_question():
    assert screen(QUESTION, 1000) is None


@pytest.mark.parametrize("text", ["", "   ", "\n\t"])
def test_drops_an_empty_question(text: str):
    assert screen(text, 1000) is Drop.EMPTY


def test_drops_an_oversized_question():
    assert screen("x" * 1001, 1000) is Drop.TOO_LONG


def test_allows_a_question_at_exactly_the_cap():
    assert screen("x" * 1000, 1000) is None


@pytest.mark.parametrize(
    ("name", "text"),
    [
        ("zero width space", "Tell me​about your work"),
        ("zero width non joiner", "Tell me‌about your work"),
        ("zero width joiner", "Tell me‍about your work"),
        ("left to right override", "Tell me‭about your work"),
        ("right to left override", "Tell me‮about your work"),
        ("word joiner", "Tell me⁠about your work"),
        ("unicode tag character", "Tell me\U000e0041about your work"),
        ("byte order mark", "﻿Tell me about your work"),
        ("soft hyphen", "Tell me­about your work"),
        ("null byte", "Tell me\x00about your work"),
        ("escape", "Tell me\x1babout your work"),
        ("carriage return", "Tell me\rabout your work"),
        ("private use", "Tell meabout your work"),
        ("unassigned", "Tell me͸about your work"),
    ],
)
def test_drops_invisible_and_control_characters(name: str, text: str):
    assert screen(text, 1000) is Drop.UNSUPPORTED


@pytest.mark.parametrize(
    ("name", "text"),
    [
        ("newline", "Tell me\nabout your work"),
        ("tab", "Tell me\tabout your work"),
        ("accents", "Café résumé naïve"),
        ("cjk", "税務についての質問"),
        ("cyrillic", "Расскажите"),
        ("emoji", "Nice work \U0001f389"),
        ("smart quotes", "It's a “quote” — really?"),
        ("math symbols", "Is 1 + 1 ≤ 3?"),
    ],
)
def test_allows_legitimate_text(name: str, text: str):
    assert screen(text, 1000) is None


def test_logs_the_shape_of_a_rejected_query(drops: pytest.LogCaptureFixture):
    screen("Tell me​​about your work", 1000)

    assert "reason=unsupported" in drops.text
    assert "categories=Cf" in drops.text
    assert "offenders=2" in drops.text


def test_never_logs_what_the_visitor_typed(drops: pytest.LogCaptureFixture):
    secret = "hunter2-correct-horse-battery-staple"

    screen(secret + "​", 1000)
    screen(secret + "x" * 5000, 1000)
    screen("", 1000)

    assert secret not in drops.text
    assert "​" not in drops.text


def test_streams_an_answer(client: TestClient, asked: list[tuple[str, str | None]]):
    response, text = collect(client, {"message": QUESTION})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert text == "Built a document platform."
    assert asked == [(QUESTION, None)]


def test_passes_a_posting_through_to_the_model(
    client: TestClient, asked: list[tuple[str, str | None]]
):
    _, text = collect(client, {"message": QUESTION, "posting": POSTING})

    assert text == "Built a document platform."
    assert asked == [(QUESTION, POSTING)]


@pytest.mark.parametrize(
    ("body", "reason"),
    [
        ({"message": ""}, Drop.EMPTY),
        ({"message": "   "}, Drop.EMPTY),
        ({"message": "x" * 1001}, Drop.TOO_LONG),
        ({"message": ZERO_WIDTH}, Drop.UNSUPPORTED),
    ],
)
def test_streams_a_refusal_instead_of_calling_the_model(
    client: TestClient,
    asked: list[tuple[str, str | None]],
    body: dict,
    reason: Drop,
):
    response, text = collect(client, body)

    assert response.status_code == 200
    assert text == REFUSALS[reason]
    assert asked == []


def test_refuses_an_oversized_posting(
    client: TestClient, asked: list[tuple[str, str | None]]
):
    response, text = collect(client, {"message": QUESTION, "posting": "x" * 6001})

    assert response.status_code == 200
    assert text == REFUSALS[Drop.TOO_LONG]
    assert asked == []


def test_a_refusal_is_still_logged(
    client: TestClient,
    asked: list[tuple[str, str | None]],
    drops: pytest.LogCaptureFixture,
):
    collect(client, {"message": ZERO_WIDTH})

    assert "reason=unsupported" in drops.text


def test_recovers_when_the_model_stream_breaks(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    async def exploding(
        message: str, posting: str | None, settings: Settings
    ) -> AsyncIterator[str]:
        yield "Built "
        raise RuntimeError("bedrock went away")

    monkeypatch.setattr(module, "answer", exploding)
    response, text = collect(client, {"message": QUESTION})

    assert response.status_code == 200
    assert text == "Built " + module.FAILED_MIDWAY
    assert "bedrock went away" not in text


def test_recovers_when_the_model_never_starts(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    async def dead(
        message: str, posting: str | None, settings: Settings
    ) -> AsyncIterator[str]:
        raise RuntimeError("no bedrock access for this account")
        yield ""

    monkeypatch.setattr(module, "answer", dead)
    response, text = collect(client, {"message": QUESTION})

    assert response.status_code == 200
    assert text == module.FAILED
    assert not text.startswith("\n")
    assert "bedrock access" not in text


def test_a_missing_message_is_a_422(
    client: TestClient, asked: list[tuple[str, str | None]]
):
    response = client.post("/chat", json={})

    assert response.status_code == 422
    assert asked == []


def test_echoes_cors_only_back_to_an_allowed_origin(
    client: TestClient, origin: str, asked: list[tuple[str, str | None]]
):
    body = {"message": QUESTION}

    allowed, _ = collect(client, body, {"origin": origin})
    assert allowed.headers["access-control-allow-origin"] == origin

    stranger, _ = collect(client, body, {"origin": "https://evil.example"})
    assert "access-control-allow-origin" not in stranger.headers


@pytest.fixture
def guarded_client(origin: str) -> TestClient:
    return TestClient(
        create_app(
            Settings(
                contact_email="inbox@example.com",
                ses_sender="site@example.com",
                allowed_origins=[origin],
                aws_region="us-west-1",
                bedrock_region="us-west-2",
                bedrock_model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
                turnstile_secret="a-secret",
            )
        )
    )


def test_skips_the_captcha_when_no_secret_is_configured(
    client: TestClient, asked: list[tuple[str, str | None]]
):
    collect(client, {"message": QUESTION})

    assert asked == [(QUESTION, None)]


def test_rejects_a_failed_captcha(
    guarded_client: TestClient,
    asked: list[tuple[str, str | None]],
    monkeypatch: pytest.MonkeyPatch,
):
    async def failed(token: str | None, settings: Settings) -> bool:
        return False

    monkeypatch.setattr(module, "verify", failed)
    response = guarded_client.post("/chat", json={"message": QUESTION, "token": "bad"})

    assert response.status_code == 403
    assert asked == []


def test_answers_when_the_captcha_passes(
    guarded_client: TestClient,
    asked: list[tuple[str, str | None]],
    monkeypatch: pytest.MonkeyPatch,
):
    async def passed(token: str | None, settings: Settings) -> bool:
        return True

    monkeypatch.setattr(module, "verify", passed)
    _, text = collect(guarded_client, {"message": QUESTION, "token": "good"})

    assert text == "Built a document platform."
    assert asked == [(QUESTION, None)]


def test_checks_the_captcha_before_spending_anything(
    guarded_client: TestClient,
    asked: list[tuple[str, str | None]],
    monkeypatch: pytest.MonkeyPatch,
):
    async def failed(token: str | None, settings: Settings) -> bool:
        return False

    monkeypatch.setattr(module, "verify", failed)
    response = guarded_client.post("/chat", json={"message": "x" * 5000})

    assert response.status_code == 403
    assert asked == []
