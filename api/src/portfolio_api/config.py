import os
from typing import Annotated, Any

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

RUNTIME_ENV = "lambda"
APP_ENV = os.getenv("APP_ENV", "staging")
ENV_FILE = f".env.{APP_ENV}"

REQUIRED = (
    "contact_email",
    "ses_sender",
    "allowed_origins",
    "aws_region",
    "bedrock_region",
    "bedrock_model_id",
)
OPTIONAL_SECRETS = ("guardrail_id", "turnstile_secret")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    contact_email: str = Field(min_length=1)
    ses_sender: str = Field(min_length=1)
    allowed_origins: Annotated[list[str], NoDecode] = Field(min_length=1)

    aws_region: str = Field(min_length=1)
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_session_token: str | None = None

    bedrock_region: str = Field(min_length=1)
    bedrock_model_id: str = Field(min_length=1)
    guardrail_id: str | None = None
    guardrail_version: str = "DRAFT"

    turnstile_secret: str | None = None

    max_query: int = 1000
    max_posting: int = 6000
    max_message: int = 4000
    max_output_tokens: int = 3000

    @model_validator(mode="before")
    @classmethod
    def require_every_value(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        missing = [name for name in REQUIRED if not values.get(name)]
        if missing:
            raise ValueError(
                f"missing configuration: {', '.join(n.upper() for n in missing)}. "
                f"APP_ENV={APP_ENV} reads {ENV_FILE}; APP_ENV={RUNTIME_ENV} reads the "
                f"process environment instead."
            )
        return values

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_csv(cls, value: str | list[str]) -> list[str]:
        if not isinstance(value, str):
            return value
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @field_validator(*OPTIONAL_SECRETS, mode="before")
    @classmethod
    def reject_blank(cls, value: str | None) -> str | None:
        if isinstance(value, str) and not value.strip():
            raise ValueError(
                "blank is not a value: unset the variable entirely to disable it"
            )
        return value
