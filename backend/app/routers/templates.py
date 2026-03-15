"""Template CRUD API router."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_session
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse
from app.services import template_service

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=list[TemplateResponse])
async def list_templates(db: AsyncSession = Depends(get_async_session)):
    templates = await template_service.list_templates(db)
    return templates


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: uuid.UUID, db: AsyncSession = Depends(get_async_session)):
    template = await template_service.get_template(db, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(
    body: TemplateCreate,
    db: AsyncSession = Depends(get_async_session),
):
    template = await template_service.create_template(db, body)
    await db.commit()
    await db.refresh(template)
    return template


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    body: TemplateUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    template = await template_service.update_template(db, template_id, body)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
):
    deleted = await template_service.delete_template(db, template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.commit()


@router.get("/graph/{graph_id}", response_model=TemplateResponse)
async def get_graph_template(
    graph_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
):
    """Get the template associated with a specific graph."""
    from app.services import graph_service
    graph = await graph_service.get_graph(db, graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    if not graph.template_id:
        raise HTTPException(status_code=404, detail="Graph has no template")
    template = await template_service.get_template(db, graph.template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return template
