from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class EdgeCreate(BaseModel):
    source_id: uuid.UUID
    target_id: uuid.UUID
    type: str = Field(..., max_length=100)
    properties: Dict[str, Any] = Field(default_factory=dict)
    weight: float = 1.0


class EdgeUpdate(BaseModel):
    type: Optional[str] = Field(None, max_length=100)
    properties: Optional[Dict[str, Any]] = None
    weight: Optional[float] = None


class EdgeResponse(BaseModel):
    id: uuid.UUID
    source_id: uuid.UUID
    target_id: uuid.UUID
    type: str
    properties: Dict[str, Any]
    weight: float
    created_at: datetime

    model_config = {"from_attributes": True}
