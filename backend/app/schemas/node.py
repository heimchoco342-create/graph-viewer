from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class NodeCreate(BaseModel):
    type: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    properties: Dict[str, Any] = Field(default_factory=dict)
    graph_id: Optional[uuid.UUID] = None


class NodeUpdate(BaseModel):
    type: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=255)
    properties: Optional[Dict[str, Any]] = None


class NodeResponse(BaseModel):
    id: uuid.UUID
    type: str
    name: str
    properties: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
