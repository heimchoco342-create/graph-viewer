from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field

from app.schemas.node import NodeResponse
from app.schemas.edge import EdgeResponse


class GraphCreate(BaseModel):
    name: str = Field(..., max_length=255)
    scope: str = Field(default="org", max_length=50)
    template_id: Optional[uuid.UUID] = None


class GraphResponse(BaseModel):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    scope: str
    template_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GraphDetail(BaseModel):
    graph: GraphResponse
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]


class SearchResult(BaseModel):
    nodes: List[NodeResponse]
    total: int


class PathResult(BaseModel):
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]
    total_weight: float
    found: bool
