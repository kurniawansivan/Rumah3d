from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from generation_engine.api.v1 import designs, health, templates
from generation_engine.config import get_settings

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("generation_engine.startup", engine_version=get_settings().engine_version)
    yield
    log.info("generation_engine.shutdown")


app = FastAPI(
    title="Rumah3d Generation Engine",
    version=get_settings().engine_version,
    lifespan=lifespan,
)

app.include_router(health.router, prefix="/v1")
app.include_router(templates.router, prefix="/v1")
app.include_router(designs.router, prefix="/v1")
