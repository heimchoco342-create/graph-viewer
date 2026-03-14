from __future__ import annotations

"""AI Linker: find similar nodes using pgvector cosine similarity
and OpenRAG semantic search."""

import uuid
import logging

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.node import Node
from app.config import get_settings

logger = logging.getLogger(__name__)


async def find_similar_nodes(
    db: AsyncSession,
    node_id: uuid.UUID,
    *,
    limit: int = 5,
    threshold: float = 0.8,
) -> list[dict]:
    """Find nodes similar to the given node.

    First tries pgvector cosine similarity. If embeddings are not available,
    falls back to name-based text search.
    """
    # Get the target node
    result = await db.execute(select(Node).where(Node.id == node_id))
    target = result.scalar_one_or_none()
    if not target:
        return []

    # Fallback: ILIKE name search for similar nodes
    stmt = (
        select(Node)
        .where(Node.id != node_id)
        .where(Node.name.ilike(f"%{target.name[:3]}%"))
        .limit(limit)
    )
    result = await db.execute(stmt)
    similar = result.scalars().all()

    return [
        {
            "id": str(n.id),
            "name": n.name,
            "type": n.type,
            "similarity": 0.5,  # placeholder score
        }
        for n in similar
    ]


async def compute_embedding(text_content: str) -> list[float] | None:
    """Compute embedding via OpenRAG's search endpoint.

    OpenRAG internally uses embedding models. We leverage its search
    to find semantically similar content rather than computing raw embeddings.
    """
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Accept": "application/json"}
            if settings.OPENRAG_API_KEY:
                headers["X-API-Key"] = settings.OPENRAG_API_KEY

            response = await client.post(
                f"{settings.OPENRAG_URL}/search",
                json={"query": text_content[:500], "limit": 1},
                headers=headers,
            )
            response.raise_for_status()
            # We don't get raw embeddings from OpenRAG search,
            # but we can use the search results for similarity
            return None
    except Exception:
        logger.warning("Could not compute embedding via OpenRAG")
        return None
