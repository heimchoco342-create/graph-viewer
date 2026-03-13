from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.node import NodeCreate, NodeUpdate, NodeResponse
from app.schemas.edge import EdgeCreate, EdgeUpdate, EdgeResponse
from app.schemas.graph import SearchResult
from app.services import graph_service

router = APIRouter(prefix="/api/graph", tags=["graph"])


# ── Nodes ──────────────────────────────────────────────────


@router.post("/nodes", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
    body: NodeCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    node = await graph_service.create_node(db, type=body.type, name=body.name, properties=body.properties)
    return node


@router.get("/nodes", response_model=list[NodeResponse])
async def list_nodes(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return await graph_service.list_nodes(db, skip=skip, limit=limit)


@router.get("/nodes/{node_id}", response_model=NodeResponse)
async def get_node(
    node_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    node = await graph_service.get_node(db, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.put("/nodes/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: uuid.UUID,
    body: NodeUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    node = await graph_service.update_node(
        db, node_id, type=body.type, name=body.name, properties=body.properties
    )
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.delete("/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ok = await graph_service.delete_node(db, node_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Node not found")


# ── Edges ──────────────────────────────────────────────────


@router.post("/edges", response_model=EdgeResponse, status_code=status.HTTP_201_CREATED)
async def create_edge(
    body: EdgeCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    edge = await graph_service.create_edge(
        db,
        source_id=body.source_id,
        target_id=body.target_id,
        type=body.type,
        properties=body.properties,
        weight=body.weight,
    )
    return edge


@router.get("/edges", response_model=list[EdgeResponse])
async def list_edges(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return await graph_service.list_edges(db, skip=skip, limit=limit)


@router.get("/edges/{edge_id}", response_model=EdgeResponse)
async def get_edge(
    edge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    edge = await graph_service.get_edge(db, edge_id)
    if edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")
    return edge


@router.put("/edges/{edge_id}", response_model=EdgeResponse)
async def update_edge(
    edge_id: uuid.UUID,
    body: EdgeUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    edge = await graph_service.update_edge(
        db, edge_id, type=body.type, properties=body.properties, weight=body.weight
    )
    if edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")
    return edge


@router.delete("/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_edge(
    edge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ok = await graph_service.delete_edge(db, edge_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Edge not found")


# ── Search ─────────────────────────────────────────────────


@router.get("/search", response_model=SearchResult)
async def search(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    nodes = await graph_service.search_nodes(db, q, limit=limit)
    return SearchResult(nodes=nodes, total=len(nodes))
