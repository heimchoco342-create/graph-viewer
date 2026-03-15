"""search_nodes service: vector seed → level-based drill-down.

Architecture:
1. Scope: user_id → groups → accessible graphs
2. Level 2+ drill-down: at each level, vector similarity selects relevant nodes
3. Connected nodes at next level via edges → continue drill-down
4. Stop when: no matching nodes at current level, or leaf level reached
5. Fallback: ILIKE keyword search when embeddings unavailable
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
    depth: int  # 0 = direct match, 1+ = drill-down hops
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
    user_id: uuid.UUID | None = None,
    seed_limit: int = 10,
    result_limit: int = 50,
    similarity_threshold: float = 0.3,
) -> SearchResponse:
    """Search using vector similarity + 1-hop edge drill-down per level.

    Args:
        query: Natural language search query
        graph_id: Limit search to a specific graph
        user_id: Scope search to graphs accessible by this user
        seed_limit: Number of seed nodes from vector search
        result_limit: Maximum results to return
        similarity_threshold: Minimum cosine similarity to include a node
    """
    has_embeddings = await _has_embedding_column(db)

    if has_embeddings:
        return await _search_with_vectors(
            db,
            query=query,
            graph_id=graph_id,
            user_id=user_id,
            seed_limit=seed_limit,
            result_limit=result_limit,
            similarity_threshold=similarity_threshold,
        )
    else:
        return await _search_with_keywords(
            db,
            query=query,
            graph_id=graph_id,
            result_limit=result_limit,
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


async def _resolve_graph_scope(
    db: AsyncSession,
    user_id: uuid.UUID | None,
    graph_id: uuid.UUID | None,
) -> list[str] | None:
    """Resolve the set of graph IDs accessible to the user.

    Returns None if no scope filtering needed (all graphs accessible).
    """
    if graph_id:
        return [str(graph_id)]
    if not user_id:
        return None

    # user_id → group memberships → graphs owned or group-scoped
    result = await db.execute(
        text("""
        SELECT DISTINCT g.id::text FROM graphs g
        WHERE g.owner_id = :user_id
        UNION
        SELECT DISTINCT g.id::text FROM graphs g
        JOIN group_members gm ON gm.group_id = g.group_id
        WHERE gm.user_id = :user_id
        """),
        {"user_id": str(user_id)},
    )
    return [row[0] for row in result.fetchall()]


async def _search_with_vectors(
    db: AsyncSession,
    *,
    query: str,
    graph_id: uuid.UUID | None,
    user_id: uuid.UUID | None,
    seed_limit: int,
    result_limit: int,
    similarity_threshold: float,
) -> SearchResponse:
    """Vector similarity seed + 1-hop edge expansion."""
    embedding_svc = get_embedding_service()
    query_embedding = await embedding_svc.embed(query)

    graph_ids = await _resolve_graph_scope(db, user_id, graph_id)
    graph_filter = "AND n.graph_id = ANY(:graph_ids)" if graph_ids else ""

    # Step 1: Vector similarity seed nodes
    seed_sql = text(f"""
    SELECT n.id, n.name, n.type, n.properties,
           1 - (n.embedding <=> CAST(:query_vec AS vector)) AS score
    FROM nodes n
    WHERE n.embedding IS NOT NULL
    {graph_filter}
    ORDER BY n.embedding <=> CAST(:query_vec AS vector)
    LIMIT :seed_limit
    """)

    params: dict = {
        "query_vec": str(query_embedding),
        "seed_limit": seed_limit,
    }
    if graph_ids:
        params["graph_ids"] = graph_ids

    result = await db.execute(seed_sql, params)
    seed_rows = result.fetchall()

    all_results: list[SearchResult] = []
    seen_ids: set[str] = set()

    # Collect seeds above threshold
    seed_ids = []
    for r in seed_rows:
        score = float(r.score)
        if score < similarity_threshold:
            continue
        node_id_str = str(r.id)
        if node_id_str not in seen_ids:
            seen_ids.add(node_id_str)
            seed_ids.append(node_id_str)
            all_results.append(SearchResult(
                node_id=uuid.UUID(node_id_str),
                name=r.name,
                type=r.type,
                properties=r.properties or {},
                depth=0,
                score=round(score, 4),
            ))

    seed_count = len(all_results)

    # Step 2: 1-hop edge expansion from seeds
    if seed_ids:
        edge_graph_filter = "AND e.graph_id = ANY(:graph_ids)" if graph_ids else ""
        expand_sql = text(f"""
        SELECT DISTINCT n.id, n.name, n.type, n.properties,
               CASE WHEN n.embedding IS NOT NULL
                    THEN 1 - (n.embedding <=> CAST(:query_vec AS vector))
                    ELSE 0.0
               END AS score
        FROM edges e
        JOIN nodes n ON n.id = CASE
            WHEN e.source_id = ANY(:seed_ids::uuid[]) THEN e.target_id
            ELSE e.source_id
        END
        WHERE (e.source_id = ANY(:seed_ids::uuid[]) OR e.target_id = ANY(:seed_ids::uuid[]))
          AND n.id != ALL(:seed_ids::uuid[])
          {edge_graph_filter}
        ORDER BY score DESC
        """)

        expand_params: dict = {
            "seed_ids": seed_ids,
            "query_vec": str(query_embedding),
        }
        if graph_ids:
            expand_params["graph_ids"] = graph_ids

        result = await db.execute(expand_sql, expand_params)
        for r in result.fetchall():
            node_id_str = str(r.id)
            score = float(r.score)
            if node_id_str not in seen_ids and score >= similarity_threshold:
                seen_ids.add(node_id_str)
                all_results.append(SearchResult(
                    node_id=uuid.UUID(node_id_str),
                    name=r.name,
                    type=r.type,
                    properties=r.properties or {},
                    depth=1,
                    score=round(score, 4),
                ))

    # Sort by score, limit
    all_results.sort(key=lambda r: r.score, reverse=True)
    all_results = all_results[:result_limit]

    return SearchResponse(
        query=query,
        results=all_results,
        seed_count=seed_count,
        total_traversed=len(seen_ids),
    )


async def _search_with_keywords(
    db: AsyncSession,
    *,
    query: str,
    graph_id: uuid.UUID | None,
    result_limit: int,
) -> SearchResponse:
    """Fallback: ILIKE keyword search + 1-hop expansion (PostgreSQL)."""
    graph_filter = "AND n.graph_id = :graph_id" if graph_id else ""

    seed_sql = text(f"""
    SELECT n.id, n.name, n.type, n.properties, 1.0 AS score
    FROM nodes n
    WHERE (n.name ILIKE :pattern OR n.type ILIKE :pattern)
    {graph_filter}
    LIMIT :seed_limit
    """)

    params: dict = {"pattern": f"%{query}%", "seed_limit": 10}
    if graph_id:
        params["graph_id"] = str(graph_id)

    result = await db.execute(seed_sql, params)
    seed_rows = result.fetchall()

    all_results: list[SearchResult] = []
    seen_ids: set[str] = set()
    seed_ids: list[str] = []

    for r in seed_rows:
        node_id_str = str(r.id)
        seen_ids.add(node_id_str)
        seed_ids.append(node_id_str)
        all_results.append(SearchResult(
            node_id=uuid.UUID(node_id_str),
            name=r.name,
            type=r.type,
            properties=r.properties if isinstance(r.properties, dict) else {},
            depth=0,
            score=1.0,
        ))

    # 1-hop expansion — batch fetch neighbors using ANY()
    if seed_ids:
        edge_graph_filter = "AND e.graph_id = :graph_id" if graph_id else ""
        expand_sql = text(f"""
        SELECT DISTINCT n.id, n.name, n.type, n.properties
        FROM edges e
        JOIN nodes n ON n.id = CASE
            WHEN e.source_id = ANY(:seed_ids::uuid[]) THEN e.target_id
            ELSE e.source_id
        END
        WHERE (e.source_id = ANY(:seed_ids::uuid[]) OR e.target_id = ANY(:seed_ids::uuid[]))
          AND n.id != ALL(:seed_ids::uuid[])
          {edge_graph_filter}
        """)

        expand_params: dict = {"seed_ids": seed_ids}
        if graph_id:
            expand_params["graph_id"] = str(graph_id)

        result = await db.execute(expand_sql, expand_params)
        for r in result.fetchall():
            node_id_str = str(r.id)
            if node_id_str not in seen_ids:
                seen_ids.add(node_id_str)
                all_results.append(SearchResult(
                    node_id=uuid.UUID(node_id_str),
                    name=r.name,
                    type=r.type,
                    properties=r.properties if isinstance(r.properties, dict) else {},
                    depth=1,
                    score=0.5,
                ))

    return SearchResponse(
        query=query,
        results=all_results[:result_limit],
        seed_count=len(seed_ids),
        total_traversed=len(seen_ids),
    )


async def embed_node(db: AsyncSession, node_id: uuid.UUID) -> bool:
    """Compute and store embedding for a single node."""
    result = await db.execute(
        text("SELECT id, name, type, properties FROM nodes WHERE id = :id"),
        {"id": str(node_id)},
    )
    row = result.one_or_none()
    if row is None:
        return False

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
