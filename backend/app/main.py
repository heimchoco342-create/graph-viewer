from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import Base, engine
from app.models import Node, Edge, User, Graph, Group, GroupMember, GraphPermission  # noqa: F401 — ensure models registered
from app.routers.viewer import router as viewer_router
from app.routers.logs import router as logs_router, install_log_handler

settings = get_settings()

app = FastAPI(title="WNG API", version="0.1.0")

install_log_handler()


@app.on_event("startup")
async def _init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(viewer_router)
app.include_router(logs_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
