from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .logger import init_logging
from .routes import build_router


def create_app(settings: Settings | None = None) -> FastAPI:
    init_logging()
    settings = settings or Settings()

    app = FastAPI(docs_url=None, redoc_url=None)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["POST"],
        allow_headers=["content-type"],
        max_age=86400,
    )
    app.include_router(build_router(settings))

    return app


def serve() -> None:
    import uvicorn

    uvicorn.run("portfolio_api.app:create_app", factory=True, reload=True)
