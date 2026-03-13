from __future__ import annotations

import uuid

from sqlalchemy import select, or_, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.edge import Edge


# ── Node CRUD ──────────────────────────────────────────────


async def create_node(db: AsyncSession, *, type: str, name: str, properties: dict | None = None) -> Node:
    node = Node(type=type, name=name, properties=properties or {})
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


async def get_node(db: AsyncSession, node_id: uuid.UUID) -> Node | None:
    result = await db.execute(select(Node).where(Node.id == node_id))
    return result.scalar_one_or_none()


async def list_nodes(db: AsyncSession, *, skip: int = 0, limit: int = 100) -> list[Node]:
    result = await db.execute(select(Node).offset(skip).limit(limit))
    return list(result.scalars().all())


async def update_node(db: AsyncSession, node_id: uuid.UUID, **kwargs) -> Node | None:
    node = await get_node(db, node_id)
    if node is None:
        return None
    for key, value in kwargs.items():
        if value is not None:
            setattr(node, key, value)
    await db.commit()
    await db.refresh(node)
    return node


async def delete_node(db: AsyncSession, node_id: uuid.UUID) -> bool:
    node = await get_node(db, node_id)
    if node is None:
        return False
    await db.delete(node)
    await db.commit()
    return True


# ── Edge CRUD ──────────────────────────────────────────────


async def create_edge(
    db: AsyncSession,
    *,
    source_id: uuid.UUID,
    target_id: uuid.UUID,
    type: str,
    properties: dict | None = None,
    weight: float = 1.0,
) -> Edge:
    edge = Edge(
        source_id=source_id,
        target_id=target_id,
        type=type,
        properties=properties or {},
        weight=weight,
    )
    db.add(edge)
    await db.commit()
    await db.refresh(edge)
    return edge


async def get_edge(db: AsyncSession, edge_id: uuid.UUID) -> Edge | None:
    result = await db.execute(select(Edge).where(Edge.id == edge_id))
    return result.scalar_one_or_none()


async def list_edges(db: AsyncSession, *, skip: int = 0, limit: int = 100) -> list[Edge]:
    result = await db.execute(select(Edge).offset(skip).limit(limit))
    return list(result.scalars().all())


async def update_edge(db: AsyncSession, edge_id: uuid.UUID, **kwargs) -> Edge | None:
    edge = await get_edge(db, edge_id)
    if edge is None:
        return None
    for key, value in kwargs.items():
        if value is not None:
            setattr(edge, key, value)
    await db.commit()
    await db.refresh(edge)
    return edge


async def delete_edge(db: AsyncSession, edge_id: uuid.UUID) -> bool:
    edge = await get_edge(db, edge_id)
    if edge is None:
        return False
    await db.delete(edge)
    await db.commit()
    return True


# ── Search (trigram-like for SQLite compat, real trigram on PG) ─────


async def search_nodes(db: AsyncSession, query: str, *, limit: int = 20) -> list[Node]:
    """Simple LIKE-based search; on PostgreSQL use gin_trgm_ops index."""
    pattern = f"%{query}%"
    result = await db.execute(
        select(Node).where(
            or_(
                Node.name.ilike(pattern),
                Node.type.ilike(pattern),
            )
        ).limit(limit)
    )
    return list(result.scalars().all())
