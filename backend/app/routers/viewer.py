"""Minimal REST API for the web viewer (frontend).

All graph mutations go through MCP tools.
This router only provides read endpoints + auth for the web UI.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_async_session
from app.models.user import User
from app.models.node import Node
from app.models.edge import Edge
from app.services import graph_service
from app.services.auth_service import hash_password, verify_password

router = APIRouter(prefix="/api")
settings = get_settings()


# ── Auth ─────────────────────────────────────────────────────


class AuthPayload(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


def _create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/auth/login")
async def login(body: AuthPayload, db: AsyncSession = Depends(get_async_session)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": _create_token(str(user.id)), "token_type": "bearer"}


@router.post("/auth/register")
async def register(body: AuthPayload, db: AsyncSession = Depends(get_async_session)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name or body.email.split("@")[0],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"access_token": _create_token(str(user.id)), "token_type": "bearer"}


@router.get("/auth/me")
async def get_me(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_session),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    user_id = _decode_token(token)
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "created_at": str(user.created_at),
    }


# ── Graphs ───────────────────────────────────────────────────


def _node_dict(n: Node) -> dict:
    return {
        "id": str(n.id),
        "type": n.type,
        "name": n.name,
        "properties": n.properties,
        "created_at": str(n.created_at),
        "updated_at": str(n.updated_at),
    }


def _edge_dict(e: Edge) -> dict:
    return {
        "id": str(e.id),
        "source_id": str(e.source_id),
        "target_id": str(e.target_id),
        "type": e.type,
        "properties": e.properties,
        "weight": e.weight,
        "created_at": str(e.created_at),
    }


@router.get("/graph/graphs")
async def list_graphs(db: AsyncSession = Depends(get_async_session)):
    graphs = await graph_service.list_graphs(db)
    return [
        {
            "id": str(g.id),
            "name": g.name,
            "owner_id": str(g.owner_id) if g.owner_id else None,
            "scope": g.scope,
            "created_at": str(g.created_at),
        }
        for g in graphs
    ]


@router.get("/graph/graphs/{graph_id}")
async def get_graph_detail(graph_id: str, db: AsyncSession = Depends(get_async_session)):
    gid = uuid.UUID(graph_id)
    graph = await graph_service.get_graph(db, gid)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    nodes = await graph_service.list_nodes_by_graph(db, gid)
    edges = await graph_service.list_edges_by_graph(db, gid)
    return {
        "graph": {
            "id": str(graph.id),
            "name": graph.name,
            "owner_id": str(graph.owner_id) if graph.owner_id else None,
            "scope": graph.scope,
            "created_at": str(graph.created_at),
        },
        "nodes": [_node_dict(n) for n in nodes],
        "edges": [_edge_dict(e) for e in edges],
    }


# ── Nodes (read-only) ───────────────────────────────────────


@router.get("/graph/nodes")
async def list_nodes(db: AsyncSession = Depends(get_async_session)):
    nodes = await graph_service.list_nodes(db, limit=settings.DEFAULT_LIST_LIMIT)
    return [_node_dict(n) for n in nodes]


# ── Edges (read-only) ───────────────────────────────────────


@router.get("/graph/edges")
async def list_edges(db: AsyncSession = Depends(get_async_session)):
    edges = await graph_service.list_edges(db, limit=settings.DEFAULT_LIST_LIMIT)
    return [_edge_dict(e) for e in edges]


# ── Search ───────────────────────────────────────────────────


@router.get("/graph/search")
async def search_nodes(q: str = "", db: AsyncSession = Depends(get_async_session)):
    if not q.strip():
        return {"nodes": [], "total": 0}
    nodes = await graph_service.search_nodes(db, q)
    result = [_node_dict(n) for n in nodes]
    return {"nodes": result, "total": len(result)}


# ── Traverse (recursive CTE search) ─────────────────────────


@router.get("/graph/traverse")
async def traverse_graph(
    q: str = "",
    graph_id: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
):
    """Search graph using recursive CTE + vector similarity (same as read_memory MCP tool)."""
    if not q.strip():
        return {"query": q, "seed_count": 0, "total_traversed": 0, "results": []}
    from app.services.search_service import search_graph
    gid = uuid.UUID(graph_id) if graph_id else None
    response = await search_graph(db, query=q, graph_id=gid)
    return {
        "query": response.query,
        "seed_count": response.seed_count,
        "total_traversed": response.total_traversed,
        "results": [
            {
                "node_id": str(r.node_id),
                "name": r.name,
                "type": r.type,
                "properties": r.properties,
                "depth": r.depth,
                "score": r.score,
            }
            for r in response.results
        ],
    }


# ── Embeddings ───────────────────────────────────────────────


@router.post("/graph/embed")
async def embed_nodes(
    graph_id: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
):
    """Generate embeddings for all nodes missing them (optionally scoped to a graph)."""
    from app.services.search_service import embed_all_nodes
    gid = uuid.UUID(graph_id) if graph_id else None
    count = await embed_all_nodes(db, graph_id=gid)
    return {"embedded": count}


@router.get("/graph/embed/status")
async def embed_status(
    graph_id: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
):
    """Check how many nodes have/lack embeddings."""
    from sqlalchemy import text as sa_text
    graph_filter = "AND graph_id = :graph_id" if graph_id else ""
    params: dict = {}
    if graph_id:
        params["graph_id"] = graph_id

    total_result = await db.execute(
        sa_text(f"SELECT COUNT(*) FROM nodes WHERE 1=1 {graph_filter}"), params
    )
    total = total_result.scalar() or 0

    # Check if embedding column exists
    from app.services.search_service import _has_embedding_column
    has_col = await _has_embedding_column(db)
    if not has_col:
        return {"total": total, "embedded": 0, "pending": total, "has_embedding_column": False}

    embedded_result = await db.execute(
        sa_text(f"SELECT COUNT(*) FROM nodes WHERE embedding IS NOT NULL {graph_filter}"), params
    )
    embedded = embedded_result.scalar() or 0

    return {
        "total": total,
        "embedded": embedded,
        "pending": total - embedded,
        "has_embedding_column": True,
    }
