import logging

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from .chat import REJECTIONS, Drop, precheck
from .config import Settings, get_settings
from .mail import send
from .ratelimit import SlidingWindow
from .retrieval import embed

PLACEHOLDER = (
    "Retrieval isn't wired up yet — for now this endpoint only checks the question "
    "and logs it."
)


class Message(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=4000)


class Query(BaseModel):
    # Deliberately unconstrained: a Field(max_length=...) would raise before the
    # handler runs, so the drop would never reach the pre-check log.
    message: str


class Reply(BaseModel):
    reply: str


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    # Uvicorn configures its own loggers and leaves the root logger bare, so
    # without this the drop warnings arrive unformatted and the INFO lines never
    # arrive at all. A no-op when a deployment supplies its own --log-config.
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    app = FastAPI(title="portfolio-api", docs_url=None, redoc_url=None)

    # Per app rather than per module: a global would carry counts between tests.
    limiter = SlidingWindow(settings.chat_rate_limit, settings.chat_rate_window)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["POST"],
        allow_headers=["content-type"],
        max_age=86400,
    )

    @app.post("/contact", status_code=204)
    async def contact(body: Message) -> Response:
        send(settings, body.name, body.email, body.message[: settings.max_message])
        return Response(status_code=204)

    @app.post("/chat")
    async def chat(body: Query, request: Request) -> Reply:
        client = request.client.host if request.client else "unknown"

        if reason := precheck(body.message, client, limiter, settings):
            status, detail = REJECTIONS[reason]
            headers = (
                {"Retry-After": str(settings.chat_rate_window)}
                if reason is Drop.RATE_LIMITED
                else None
            )
            raise HTTPException(status, detail, headers=headers)

        embed(body.message)
        return Reply(reply=PLACEHOLDER)

    return app


def serve() -> None:
    import uvicorn

    uvicorn.run("portfolio_api.main:create_app", factory=True, reload=True)
