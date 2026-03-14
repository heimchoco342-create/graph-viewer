"""search_graph service: vector seed → recursive CTE traversal → vector ranking.

Architecture:
1. Embed query text → find seed nodes by cosine similarity (pgvector)
2. Recursive CTE: expand from seeds along edges, filtered by node type + depth
3. Rank results by vector similarity to query
4. Fallback: ILIKE keyword search when embeddings unavailable
"""
from __future__ import annotations

import uuid
import logging
from dataclasses import dataclass, field

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding import get_embedding_service

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    node_id: uuid.UUID
    name: str
    type: str
    properties: dict
    depth: int  # 0 = seed, 1 = 1-hop, ...
    score: float  # cosine similarity to query (1.0 = exact match)


@dataclass
class SearchResponse:
    query: str
    results: list[SearchResult] = field(default_factory=list)
    seed_count: int = 0
    total_traversed: int = 0


async def search_graph(
    db: AsyncSession,
    *,
    query: str,
    graph_id: uuid.UUID | None = None,
    max_depth: int = 3,
    seed_limit: int = 5,
    result_limit: int = 50,
    target_types: list[str] | None = None,
) -> SearchResponse:
    """Search the graph using vector similarity + recursive CTE traversal.

    Args:
        query: Natural language search query
        graph_id: Limit search to a specific graph namespace
        max_depth: Maximum traversal depth from seed nodes
        seed_limit: Number of seed nodes from vector search
        result_limit: Maximum results to return
        target_types: Filter results to these node types only
    """
    # Check if pgvector embedding column is available
    has_embeddings = await _has_embedding_column(db)

    if has_embeddings:
        return await _search_with_vectors(
            db,
            query=query,
            graph_id=graph_id,
            max_depth=max_depth,
            seed_limit=seed_limit,
            result_limit=result_limit,
            target_types=target_types,
        )
    else:
        return await _search_with_keywords(
            db,
            query=query,
            graph_id=graph_id,
            max_depth=max_depth,
            seed_limit=seed_limit,
            result_limit=result_limit,
            target_types=target_types,
        )


async def _has_embedding_column(db: AsyncSession) -> bool:
    """Check if the embedding column exists in the nodes table."""
    try:
        result = await db.execute(
            text("SELECT column_name FROM information_schema.columns "
                 "WHERE table_name = 'nodes' AND column_name = 'embedding'")
        )
        return result.scalar_one_or_none() is not None
    except Exception:
        logger.warning("Failed to check embedding column existence", exc_info=True)
        return False


async def _search_with_vectors(
    db: AsyncSession,
    *,
    query: str,
    graph_id: uuid.UUID | None,
    max_depth: int,
    seed_limit: int,
    result_limit: int,
    target_types: list[str] | None,
) -> SearchResponse:
    """Full vector + recursive CTE search."""
    embedding_svc = get_embedding_service()
    query_embedding = await embedding_svc.embed(query)

    # Build graph_id filter clause
    graph_filter = "AND n.graph_id = :graph_id" if graph_id else ""
    type_filter = "AND n.type = ANY(:target_types)" if target_types else ""

    sql = text(f"""
    WITH RECURSIVE seed_nodes AS (
        -- Step 1: Vector similarity search for seed nodes
        SELECT n.id, n.name, n.type, n.properties,
               0 AS depth,
               1 - (n.embedding <=> CAST(:query_vec AS vector)) AS score
        FROM nodes n
        WHERE n.embedding IS NOT NULL
        {graph_filter}
        ORDER BY n.embedding <=> CAST(:query_vec AS vector)
        LIMIT :seed_limit
    ),
    traversal AS (
        -- Step 2: Recursive CTE — expand from seeds
        SELECT s.id, s.name, s.type, s.properties, s.depth, s.score
        FROM seed_nodes s

        UNION ALL

        SELECT n.id, n.name, n.type, n.properties,
               t.depth + 1 AS depth,
               CASE WHEN n.embedding IS NOT NULL
                    THEN 1 - (n.embedding <=> CAST(:query_vec AS vector))
                    ELSE 0.0
               END AS score
        FROM traversal t
        JOIN edges e ON (e.source_id = t.id OR e.target_id = t.id)
            {"AND e.graph_id = :graph_id" if graph_id else ""}
        JOIN nodes n ON n.id = CASE
            WHEN e.source_id = t.id THEN e.target_id
            ELSE e.source_id
        END
        WHERE t.depth < :max_depth
          AND n.id NOT IN (SELECT id FROM seed_nodes)
          {graph_filter}
    ) CYCLE id SET is_cycle USING path
    SELECT * FROM (
        SELECT DISTINCT ON (id) id, name, type, properties, depth, score
        FROM traversal
        WHERE NOT is_cycle {type_filter}
        ORDER BY id, depth ASC, score DESC
    ) sub
    ORDER BY score DESC, depth ASC
    """)

    params: dict = {
        "query_vec": str(query_embedding),
        "seed_limit": seed_limit,
        "max_depth": max_depth,
    }
    if graph_id:
        params["graph_id"] = str(graph_id)
    if target_types:
        params["target_types"] = target_types

    result = await db.execute(sql, params)
    rows = result.fetchall()

    # Count seeds
    seed_count = sum(1 for r in rows if r.depth == 0)

    # Sort by score descending, limit
    sorted_rows = sorted(rows, key=lambda r: r.score, reverse=True)[:result_limit]

    results = [
        SearchResult(
            node_id=uuid.UUID(str(r.id)),
            name=r.name,
            type=r.type,
            properties=r.properties or {},
            depth=r.depth,
            score=round(r.score, 4),
        )
        for r in sorted_rows
    ]

    return SearchResponse(
        query=query,
        results=results,
        seed_count=seed_count,
        total_traversed=len(rows),
    )


async def _search_with_keywords(
    db: AsyncSession,
    *,
    query: str,
    graph_id: uuid.UUID | None,
    max_depth: int,
    seed_limit: int,
    result_limit: int,
    target_types: list[str] | None,
) -> SearchResponse:
    """Fallback: ILIKE keyword search + recursive CTE (no vector ranking). PostgreSQL only."""
    graph_filter = "AND n.graph_id = :graph_id" if graph_id else ""

    type_filter_clause = (
        "AND type = ANY(:target_types)" if target_types else ""
    )

    sql = text(f"""
    WITH RECURSIVE seed_nodes AS (
        SELECT n.id, n.name, n.type, n.properties,
               0 AS depth,
               CAST(1.0 AS REAL) AS score
        FROM nodes n
        WHERE (n.name ILIKE :pattern OR n.type ILIKE :pattern)
        {graph_filter}
        LIMIT :seed_limit
    ),
    traversal AS (
        SELECT s.id, s.name, s.type, s.properties, s.depth, s.score
        FROM seed_nodes s

        UNION ALL

        SELECT n.id, n.name, n.type, n.properties,
               t.depth + 1 AS depth,
               CAST(1.0 / (t.depth + 2) AS REAL) AS score
        FROM traversal t
        JOIN edges e ON (e.source_id = t.id OR e.target_id = t.id)
        JOIN nodes n ON n.id = CASE
            WHEN e.source_id = t.id THEN e.target_id
            ELSE e.source_id
        END
        WHERE t.depth < :max_depth
    ) CYCLE id SET is_cycle USING path
    SELECT * FROM (
        SELECT DISTINCT ON (id) id, name, type, properties, depth, score
        FROM traversal
        WHERE NOT is_cycle {type_filter_clause}
        ORDER BY id, depth ASC, score DESC
    ) sub
    ORDER BY score DESC, depth ASC
    LIMIT :result_limit
    """)

    params: dict = {
        "pattern": f"%{query}%",
        "seed_limit": seed_limit,
        "max_depth": max_depth,
        "result_limit": result_limit,
    }
    if graph_id:
        params["graph_id"] = str(graph_id)
    if target_types:
        params["target_types"] = target_types

    result = await db.execute(sql, params)
    rows = result.fetchall()

    seed_count = sum(1 for r in rows if r.depth == 0)

    results = [
        SearchResult(
            node_id=uuid.UUID(str(r.id)),
            name=r.name,
            type=r.type,
            properties=r.properties if isinstance(r.properties, dict) else {},
            depth=r.depth,
            score=round(float(r.score), 4),
        )
        for r in rows
    ]

    return SearchResponse(
        query=query,
        results=results,
        seed_count=seed_count,
        total_traversed=len(rows),
    )


async def embed_node(db: AsyncSession, node_id: uuid.UUID) -> bool:
    """Compute and store embedding for a single node."""
    from app.models.node import Node

    result = await db.execute(
        text("SELECT id, name, type, properties FROM nodes WHERE id = :id"),
        {"id": str(node_id)},
    )
    row = result.one_or_none()
    if row is None:
        return False

    # Build embedding text from node metadata
    embed_text = _node_to_text(row.name, row.type, row.properties)
    embedding_svc = get_embedding_service()
    vec = await embedding_svc.embed(embed_text)

    await db.execute(
        text("UPDATE nodes SET embedding = :vec WHERE id = :id"),
        {"vec": str(vec), "id": str(node_id)},
    )
    await db.commit()
    return True


async def embed_all_nodes(db: AsyncSession, graph_id: uuid.UUID | None = None) -> int:
    """Backfill embeddings for all nodes (optionally in a specific graph)."""
    graph_filter = "AND graph_id = :graph_id" if graph_id else ""
    result = await db.execute(
        text(f"SELECT id, name, type, properties FROM nodes WHERE embedding IS NULL {graph_filter}"),
        {"graph_id": str(graph_id)} if graph_id else {},
    )
    rows = result.fetchall()

    if not rows:
        return 0

    embedding_svc = get_embedding_service()
    texts = [_node_to_text(r.name, r.type, r.properties) for r in rows]
    vectors = await embedding_svc.embed_batch(texts)

    for row, vec in zip(rows, vectors):
        await db.execute(
            text("UPDATE nodes SET embedding = :vec WHERE id = :id"),
            {"vec": str(vec), "id": str(row.id)},
        )

    await db.commit()
    logger.info("Embedded %d nodes", len(rows))
    return len(rows)


def _node_to_text(name: str, node_type: str, properties: dict | None) -> str:
    """Build a rich text representation of a node for embedding."""
    parts = [f"{node_type}: {name}"]
    if properties:
        for k, v in properties.items():
            parts.append(f"{k}: {v}")
    return " | ".join(parts)
