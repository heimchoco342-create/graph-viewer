from __future__ import annotations

"""AI Linker: find similar nodes using pgvector cosine similarity.

This module provides the interface for AI-powered node linking.
Actual pgvector queries require the pgvector extension and the
embedding column on the nodes table.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.node import Node


async def find_similar_nodes(
    db: AsyncSession,
    node_id: uuid.UUID,
    *,
    limit: int = 5,
    threshold: float = 0.8,
) -> list[dict]:
    """Find nodes similar to the given node using pgvector cosine similarity.

    TODO: This requires:
    1. The node to have an embedding (Vector(1536)) column populated
    2. The pgvector extension installed in PostgreSQL
    3. An index on the embedding column

    For now, returns an empty list as a stub.
    In production, the query would be:

        SELECT id, name, type,
               1 - (embedding <=> target_embedding) AS similarity
        FROM nodes
        WHERE id != :node_id
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> target_embedding) > :threshold
        ORDER BY embedding <=> target_embedding
        LIMIT :limit
    """
    # Stub: return empty list until pgvector is configured
    return []


async def compute_embedding(text_content: str) -> list[float] | None:
    """Compute embedding for given text using an LLM API.

    TODO: Call OpenAI/local embedding model API to generate
    1536-dimensional embedding vector.
    """
    return None
