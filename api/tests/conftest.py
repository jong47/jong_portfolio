import pytest
from fastapi.testclient import TestClient

from portfolio_api.config import Settings
from portfolio_api.main import create_app


@pytest.fixture
def origin() -> str:
    return "https://example.com"


@pytest.fixture
def settings(origin: str) -> Settings:
    return Settings(
        turnstile_secret="secret",
        contact_email="inbox@example.com",
        ses_sender="site@example.com",
        allowed_origins=[origin],
        # No test reaches SES, so these never authenticate anything.
        aws_access_key_id="test-key",
        aws_secret_access_key="test-secret",
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))
