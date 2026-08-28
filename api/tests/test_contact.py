import pytest
from fastapi.testclient import TestClient

from portfolio_api import routes as module

BODY = {
    "name": "Dana",
    "email": "dana@example.com",
    "message": "Are you free to talk next week?",
}


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str, str]]:
    calls: list[tuple[str, str, str]] = []

    def record(_settings: object, name: str, sender: str, message: str) -> None:
        calls.append((name, sender, message))

    monkeypatch.setattr(module, "send_mail", record)
    return calls


def test_accepts_a_message(client: TestClient, sent: list[tuple[str, str, str]]):
    response = client.post("/contact", json=BODY)

    assert response.status_code == 204
    assert sent == [("Dana", "dana@example.com", "Are you free to talk next week?")]


def test_returns_no_body(client: TestClient, sent: list[tuple[str, str, str]]):
    assert client.post("/contact", json=BODY).text == ""


def test_rejects_a_malformed_address(
    client: TestClient, sent: list[tuple[str, str, str]]
):
    response = client.post("/contact", json={**BODY, "email": "not-an-address"})

    assert response.status_code == 422
    assert sent == []


@pytest.mark.parametrize("field", ["name", "message"])
def test_rejects_an_empty_field(
    client: TestClient, sent: list[tuple[str, str, str]], field: str
):
    response = client.post("/contact", json={**BODY, field: ""})

    assert response.status_code == 422
    assert sent == []


def test_rejects_an_oversized_message(
    client: TestClient, sent: list[tuple[str, str, str]]
):
    response = client.post("/contact", json={**BODY, "message": "x" * 9000})

    assert response.status_code == 422
    assert sent == []


def test_ignores_an_unexpected_field(
    client: TestClient, sent: list[tuple[str, str, str]]
):
    response = client.post("/contact", json={**BODY, "token": "leftover"})

    assert response.status_code == 204
    assert len(sent) == 1


def test_never_discloses_the_destination(
    client: TestClient, sent: list[tuple[str, str, str]]
):
    response = client.post("/contact", json=BODY)

    assert "inbox@example.com" not in response.text


def test_echoes_cors_only_back_to_an_allowed_origin(
    client: TestClient, origin: str, sent: list[tuple[str, str, str]]
):
    allowed = client.post("/contact", json=BODY, headers={"origin": origin})
    assert allowed.headers["access-control-allow-origin"] == origin

    stranger = client.post(
        "/contact", json=BODY, headers={"origin": "https://evil.example"}
    )
    assert "access-control-allow-origin" not in stranger.headers
