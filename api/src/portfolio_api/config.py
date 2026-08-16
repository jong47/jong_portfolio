import os
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Mirrors --mode on the web side. Exactly one file, named explicitly: reading
# several and letting the last win would let a stray .env.prod quietly outrank
# local config. Deployments set real process env and read no file at all.
APP_ENV = os.getenv("APP_ENV", "staging")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=f".env.{APP_ENV}", extra="ignore")

    turnstile_secret: str

    # Where messages land, and the SES-verified identity they are sent from. In the
    # SES sandbox both must be verified, which is fine when they are the same person.
    contact_email: str = Field(min_length=1)
    ses_sender: str = Field(min_length=1)

    # NoDecode: without it pydantic-settings json-parses the value before the
    # validator below ever sees the comma-separated form.
    allowed_origins: Annotated[list[str], NoDecode] = []

    aws_region: str = "us-west-1"
    # Left unset in production, where an instance role supplies them instead.
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    # Long enough to say something real, short enough to bound an abusive payload.
    max_message: int = 4000

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_csv(cls, value: str | list[str]) -> list[str]:
        if not isinstance(value, str):
            return value
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # pyright: ignore[reportCallIssue] - values come from the env
