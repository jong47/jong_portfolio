import pytest
from fastapi.testclient import TestClient

from portfolio_api import main

BODY = {
    "name": "Dana",
    "email": "dana@example.com",
    "message": "Are you free to talk next week?",
    "token": "good",
}


@pytest.fixture
def human(monkeypatch: pytest.MonkeyPatch):
    """Stands in for a passing Turnstile check, so no route test touches the network."""

    async def always(*_args: object, **_kwargs: object) -> bool:
        return True

    monkeypatch.setattr(main, "passed", always)


@pytest.fixture
def bot(monkeypatch: pytest.MonkeyPatch):
    async def never(*_args: object, **_kwargs: object) -> bool:
        return False

    monkeypatch.setattr(main, "passed", never)


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str, str]]:
    """Captures what would have gone to SES instead of sending it."""
    calls: list[tuple[str, str, str]] = []

    def record(_settings: object, name: str, sender: str, message: str) -> None:
        calls.append((name, sender, message))

    monkeypatch.setattr(main, "send", record)
    return calls


@pytest.mark.usefixtures("human")
def test_accepts_a_verified_message(client: TestClient, sent: list[tuple[str, str, str]]):
    response = client.post("/contact", json=BODY)

    assert response.status_code == 204
    assert sent == [("Dana", "dana@example.com", "Are you free to talk next week?")]


@pytest.mark.usefixtures("bot")
def test_refuses_when_the_check_fails(
    client: TestClient, sent: list[tuple[str, str, str]]
):
    response = client.post("/contact", json=BODY)

    assert response.status_code == 403
    assert sent == []


@pytest.mark.usefixtures("human")
def test_rejects_a_malformed_address(
    client: TestClient, sent: list[tuple[str, str, str]]
):
    response = client.post("/contact", json={**BODY, "email": "not-an-address"})

    assert response.status_code == 422
    assert sent == []


@pytest.mark.usefixtures("human")
@pytest.mark.parametrize("field", ["name", "message"])
def test_rejects_an_empty_field(
    client: TestClient, sent: list[tuple[str, str, str]], field: str
):
    response = client.post("/contact", json={**BODY, field: ""})

    assert response.status_code == 422
    assert sent == []


@pytest.mark.usefixtures("human")
def test_caps_an_oversized_message(client: TestClient, sent: list[tuple[str, str, str]]):
    response = client.post("/contact", json={**BODY, "message": "x" * 9000})

    assert response.status_code == 422
    assert sent == []


@pytest.mark.usefixtures("human")
def test_never_discloses_the_destination(
    client: TestClient, sent: list[tuple[str, str, str]]
):
    """The whole point of the form: the address is a destination, never a response."""
    response = client.post("/contact", json=BODY)

    assert "inbox@example.com" not in response.text


@pytest.mark.usefixtures("human")
def test_echoes_cors_only_back_to_an_allowed_origin(
    client: TestClient, origin: str, sent: list[tuple[str, str, str]]
):
    allowed = client.post("/contact", json=BODY, headers={"origin": origin})
    assert allowed.headers["access-control-allow-origin"] == origin

    stranger = client.post(
        "/contact", json=BODY, headers={"origin": "https://evil.example"}
    )
    assert "access-control-allow-origin" not in stranger.headers


@pytest.mark.usefixtures("human")
def test_ignores_a_spoofed_forwarded_for(client: TestClient):
    """
    Cloudflare appends to X-Forwarded-For instead of replacing it, so a caller can
    seed the left-most entry. Only the edge-written header may reach siteverify.
    """
    request = main.Request(
        {
            "type": "http",
            "headers": [
                (b"x-forwarded-for", b"1.2.3.4, 172.16.0.1"),
                (b"cf-connecting-ip", b"9.9.9.9"),
            ],
            "client": ("172.16.0.1", 50000),
        }
    )

    assert main.client_ip(request) == "9.9.9.9"

    without_edge = main.Request(
        {
            "type": "http",
            "headers": [(b"x-forwarded-for", b"1.2.3.4")],
            "client": ("172.16.0.1", 50000),
        }
    )

    assert main.client_ip(without_edge) == "172.16.0.1"
