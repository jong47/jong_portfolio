from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from .config import Settings, get_settings
from .mail import send


class Message(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=4000)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="portfolio-api", docs_url=None, redoc_url=None)

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

    return app


def serve() -> None:
    import uvicorn

    uvicorn.run("portfolio_api.main:create_app", factory=True, reload=True)
