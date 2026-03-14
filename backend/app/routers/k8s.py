from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.k8s_connector import import_k8s_yaml

router = APIRouter(prefix="/api/k8s", tags=["kubernetes"])


@router.post("/import")
async def import_k8s_resources(
    file: UploadFile = File(...),
    namespace: Optional[str] = Query(None, description="Filter by namespace"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Import Kubernetes resources from a YAML manifest file."""
    content = await file.read()
    yaml_content = content.decode("utf-8")

    result = await import_k8s_yaml(db, yaml_content, namespace_filter=namespace)
    return result
