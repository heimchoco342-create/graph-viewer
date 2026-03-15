"""Workspace template CRUD service."""
from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.template import WorkspaceTemplate
from app.schemas.template import TemplateCreate, TemplateUpdate

logger = logging.getLogger(__name__)

DOMAINS_DIR = Path(__file__).resolve().parent.parent.parent / "domains"


async def list_templates(db: AsyncSession) -> list[WorkspaceTemplate]:
    result = await db.execute(select(WorkspaceTemplate).order_by(WorkspaceTemplate.name))
    return list(result.scalars().all())


async def get_template(db: AsyncSession, template_id: uuid.UUID) -> Optional[WorkspaceTemplate]:
    return await db.get(WorkspaceTemplate, template_id)


async def create_template(
    db: AsyncSession, data: TemplateCreate, created_by: Optional[uuid.UUID] = None
) -> WorkspaceTemplate:
    template = WorkspaceTemplate(
        name=data.name,
        description=data.description,
        levels=[lvl.model_dump() for lvl in data.levels],
        edge_rules=[rule.model_dump() for rule in data.edge_rules],
        created_by=created_by,
    )
    db.add(template)
    await db.flush()
    return template


async def update_template(
    db: AsyncSession, template_id: uuid.UUID, data: TemplateUpdate
) -> Optional[WorkspaceTemplate]:
    template = await db.get(WorkspaceTemplate, template_id)
    if template is None:
        return None
    if data.name is not None:
        template.name = data.name
    if data.description is not None:
        template.description = data.description
    if data.levels is not None:
        template.levels = [lvl.model_dump() for lvl in data.levels]
    if data.edge_rules is not None:
        template.edge_rules = [rule.model_dump() for rule in data.edge_rules]
    await db.flush()
    return template


async def delete_template(db: AsyncSession, template_id: uuid.UUID) -> bool:
    template = await db.get(WorkspaceTemplate, template_id)
    if template is None:
        return False
    await db.delete(template)
    await db.flush()
    return True


async def seed_default_templates(db: AsyncSession) -> list[WorkspaceTemplate]:
    """Seed default templates from JSON files if no templates exist."""
    result = await db.execute(select(WorkspaceTemplate).limit(1))
    if result.scalars().first() is not None:
        logger.info("Templates already exist, skipping seed")
        return []

    seeded = []
    for json_file in sorted(DOMAINS_DIR.glob("*.json")):
        if json_file.name == "default.json":
            continue
        with open(json_file, encoding="utf-8") as f:
            raw = json.load(f)
        data = TemplateCreate.model_validate(raw)
        template = await create_template(db, data)
        seeded.append(template)
        logger.info("Seeded template: %s (%d levels)", template.name, len(template.levels))

    if seeded:
        await db.commit()
    return seeded
