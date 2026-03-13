from __future__ import annotations

import uuid
from typing import Any, List

from pydantic import BaseModel

from app.schemas.node import NodeResponse
from app.schemas.edge import EdgeResponse


class SearchResult(BaseModel):
    nodes: List[NodeResponse]
    total: int


class PathResult(BaseModel):
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]
    total_weight: float
    found: bool
