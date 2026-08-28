import pytest
from pydantic import ValidationError

from portfolio_api.config import OPTIONAL_SECRETS, REQUIRED, Settings

COMPLETE = {
    "contact_email": "inbox@example.com",
    "ses_sender": "site@example.com",
    "allowed_origins": ["https://example.com"],
    "aws_region": "us-west-1",
    "bedrock_region": "us-west-2",
    "bedrock_model_id": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
}

ENV_NAMES = [name.upper() for name in (*REQUIRED, *OPTIONAL_SECRETS)]


@pytest.fixture(autouse=True)
def no_ambient_config(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ENV_NAMES:
        monkeypatch.delenv(name, raising=False)


def build(values: dict) -> Settings:
    return Settings(_env_file=None, **values)


def test_a_complete_configuration_loads():
    assert build(COMPLETE).bedrock_region == "us-west-2"


@pytest.mark.parametrize("name", REQUIRED)
def test_a_required_value_fails_loudly_when_absent(name: str):
    with pytest.raises(ValidationError, match=name.upper()):
        build({k: v for k, v in COMPLETE.items() if k != name})


@pytest.mark.parametrize("name", REQUIRED)
def test_a_required_value_fails_loudly_when_blank(name: str):
    blank: str | list[str] = [] if name == "allowed_origins" else ""
    with pytest.raises(ValidationError, match=name.upper()):
        build({**COMPLETE, name: blank})


def test_the_error_names_every_missing_value_at_once():
    with pytest.raises(ValidationError) as caught:
        build({"contact_email": "inbox@example.com"})

    message = str(caught.value)
    assert "SES_SENDER" in message
    assert "BEDROCK_REGION" in message
    assert "ALLOWED_ORIGINS" in message
    assert "CONTACT_EMAIL" not in message


def test_the_error_says_where_the_values_should_come_from():
    with pytest.raises(ValidationError, match="APP_ENV"):
        build({})


@pytest.mark.parametrize("name", OPTIONAL_SECRETS)
def test_a_blank_optional_secret_is_rejected_not_read_as_disabled(name: str):
    with pytest.raises(ValidationError, match="blank is not a value"):
        build({**COMPLETE, name: ""})


@pytest.mark.parametrize("name", OPTIONAL_SECRETS)
def test_an_absent_optional_secret_disables_it(name: str):
    assert getattr(build(COMPLETE), name) is None


def test_an_all_whitespace_origin_list_is_rejected():
    with pytest.raises(ValidationError, match="(?i)allowed_origins"):
        build({**COMPLETE, "allowed_origins": "  ,  "})


def test_a_comma_separated_origin_list_splits():
    settings = build({**COMPLETE, "allowed_origins": "https://a.dev, https://b.dev"})

    assert settings.allowed_origins == ["https://a.dev", "https://b.dev"]
