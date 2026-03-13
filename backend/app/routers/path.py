from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.graph import PathResult
from app.services.path_service import find_path

router = APIRouter(prefix="/api/path", tags=["path"])


@router.get("/find", response_model=PathResult)
async def find(
    source_id: uuid.UUID = Query(...),
    target_id: uuid.UUID = Query(...),
    weighted: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await find_path(db, source_id, target_id, weighted=weighted)
    if result is None:
        return PathResult(nodes=[], edges=[], total_weight=0.0, found=False)
    nodes, edges, total_weight = result
    return PathResult(nodes=nodes, edges=edges, total_weight=total_weight, found=True)
