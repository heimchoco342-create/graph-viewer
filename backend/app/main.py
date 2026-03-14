from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.db import Base, engine, async_session_factory

logger = logging.getLogger(__name__)
from app.models import Node, Edge, User, Graph, Group, GroupMember, GraphPermission  # noqa: F401 — ensure models registered
from app.routers.viewer import router as viewer_router
from app.routers.logs import router as logs_router, install_log_handler

settings = get_settings()

app = FastAPI(title="WNG API", version="0.1.0")

install_log_handler()


@app.on_event("startup")
async def _init_db() -> None:
    async with engine.begin() as conn:
        # Enable pgvector extension if running on PostgreSQL
        if conn.dialect.name == "postgresql":
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            # Ensure embedding column exists (create_all won't add to existing table)
            await conn.execute(text(
                "ALTER TABLE nodes ADD COLUMN IF NOT EXISTS embedding vector(1024)"
            ))
        await conn.run_sync(Base.metadata.create_all)

    # Backfill embeddings for nodes that don't have them yet
    try:
        from app.services.search_service import embed_all_nodes
        async with async_session_factory() as session:
            count = await embed_all_nodes(session)
            if count > 0:
                logger.info("Startup: backfilled embeddings for %d nodes", count)
    except Exception as e:
        logger.warning("Startup embedding backfill skipped: %s", e)

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
