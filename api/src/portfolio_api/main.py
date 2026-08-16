from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from .config import Settings, get_settings
from .mail import send
from .turnstile import passed


class Message(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=4000)
    token: str | None = None


def client_ip(request: Request) -> str | None:
    """
    CF-Connecting-IP first, and X-Forwarded-For is never read. Cloudflare appends
    to an inbound X-Forwarded-For rather than replacing it, so the left-most entry
    is whatever the caller typed there — and this value goes to siteverify as
    `remoteip`, where a wrong answer either means nothing or refuses a real
    visitor. CF-Connecting-IP is written by the edge and holds exactly one address.
    """
    edge = request.headers.get("cf-connecting-ip")
    if edge:
        return edge.strip()
    return request.client.host if request.client else None


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
    async def contact(request: Request, body: Message) -> Response:
        if not await passed(body.token, client_ip(request), settings.turnstile_secret):
            raise HTTPException(status_code=403, detail="unverified")

        send(settings, body.name, body.email, body.message[: settings.max_message])
        return Response(status_code=204)

    return app


def serve() -> None:
    import uvicorn

    uvicorn.run("portfolio_api.main:create_app", factory=True, reload=True)
