import pytest
from fastapi.testclient import TestClient

from portfolio_api.app import create_app
from portfolio_api.config import Settings


@pytest.fixture
def origin() -> str:
    return "https://example.com"


@pytest.fixture
def settings(origin: str) -> Settings:
    return Settings(
        contact_email="inbox@example.com",
        ses_sender="site@example.com",
        allowed_origins=[origin],
        aws_region="us-west-1",
        aws_access_key_id="test-key",
        aws_secret_access_key="test-secret",
        bedrock_region="us-west-2",
        bedrock_model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))
