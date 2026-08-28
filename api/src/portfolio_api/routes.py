import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field

from .bedrock import answer
from .config import Settings
from .mail import send_mail
from .screen import REFUSALS, screen
from .turnstile import verify

logger = logging.getLogger(__name__)

FAILED = "Something broke on my end. Try asking again."
FAILED_MIDWAY = "\n\nSomething broke on my end mid-answer. Try asking again."


class Message(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=4000)


class Query(BaseModel):
    message: str
    posting: str | None = None
    token: str | None = None


def build_router(settings: Settings) -> APIRouter:
    router = APIRouter()

    @router.post("/contact", status_code=204)
    async def contact(body: Message) -> Response:
        send_mail(settings, body.name, body.email, body.message[: settings.max_message])
        return Response(status_code=204)

    @router.post("/chat")
    async def chat(body: Query) -> StreamingResponse:
        if not await verify(body.token, settings):
            raise HTTPException(403, "Captcha check failed.")

        refusal = screen(body.message, settings.max_query)
        if refusal is None and body.posting is not None:
            refusal = screen(body.posting, settings.max_posting)

        stream = (
            _refuse(REFUSALS[refusal])
            if refusal
            else _guard(answer(body.message, body.posting, settings))
        )
        return StreamingResponse(stream, media_type="text/plain; charset=utf-8")

    return router


async def _refuse(text: str) -> AsyncIterator[str]:
    yield text


async def _guard(stream: AsyncIterator[str]) -> AsyncIterator[str]:
    started = False
    try:
        async for chunk in stream:
            started = True
            yield chunk
    except Exception:
        logger.exception("stream failed")
        yield FAILED_MIDWAY if started else FAILED
