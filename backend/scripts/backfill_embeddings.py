"""Backfill embeddings for all nodes that don't have one yet.

Usage:
    python -m scripts.backfill_embeddings [--graph-id <uuid>]
"""
from __future__ import annotations

import argparse
import asyncio
import uuid
import sys

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.services.search_service import embed_all_nodes


async def main(graph_id: uuid.UUID | None = None) -> None:
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        count = await embed_all_nodes(db, graph_id=graph_id)
        print(f"Embedded {count} nodes")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill node embeddings")
    parser.add_argument("--graph-id", type=str, default=None, help="Limit to a specific graph UUID")
    args = parser.parse_args()

    gid = uuid.UUID(args.graph_id) if args.graph_id else None
    asyncio.run(main(gid))
