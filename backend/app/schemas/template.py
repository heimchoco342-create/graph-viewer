"""Workspace template schemas.

Defines hierarchical level definitions and edge rules for workspace templates.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class LevelDefinition(BaseModel):
    level: int = Field(..., ge=0, description="Level depth (0=user, 1=group, 2+=custom)")
    node_type: str = Field(..., min_length=1, max_length=50, description="Node type identifier")
    label: str = Field(..., min_length=1, max_length=100, description="Display label")
    color: str = Field(..., pattern=r"^#[0-9a-fA-F]{6}$", description="Hex color for graph")
    badge_color: str = Field(..., min_length=1, description="Badge color (hex or CSS class)")
    fixed: bool = Field(default=False, description="True for system-fixed levels (user, group)")


class EdgeRule(BaseModel):
    source_type: str = Field(..., min_length=1, description="Source node type")
    target_type: str = Field(..., min_length=1, description="Target node type")


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    levels: List[LevelDefinition] = Field(..., min_length=2)
    edge_rules: List[EdgeRule] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_levels(self) -> "TemplateCreate":
        levels = self.levels
        # level 0 must be user
        if levels[0].level != 0 or levels[0].node_type != "user":
            raise ValueError("Level 0 must be node_type='user'")
        if not levels[0].fixed:
            raise ValueError("Level 0 (user) must be fixed=true")
        # level 1 must be group
        if len(levels) < 2 or levels[1].level != 1 or levels[1].node_type != "group":
            raise ValueError("Level 1 must be node_type='group'")
        if not levels[1].fixed:
            raise ValueError("Level 1 (group) must be fixed=true")
        # level numbers must be consecutive
        for i, lvl in enumerate(levels):
            if lvl.level != i:
                raise ValueError(f"Level numbers must be consecutive: expected {i}, got {lvl.level}")
        # node_type must be unique
        node_types = [lvl.node_type for lvl in levels]
        if len(node_types) != len(set(node_types)):
            raise ValueError("node_type values must be unique across levels")
        # edge_rules source/target must reference defined node_types
        valid_types = set(node_types)
        for rule in self.edge_rules:
            if rule.source_type not in valid_types:
                raise ValueError(f"edge_rules source_type '{rule.source_type}' not in defined levels")
            if rule.target_type not in valid_types:
                raise ValueError(f"edge_rules target_type '{rule.target_type}' not in defined levels")
        return self


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    levels: Optional[List[LevelDefinition]] = Field(None, min_length=2)
    edge_rules: Optional[List[EdgeRule]] = None

    @model_validator(mode="after")
    def validate_levels(self) -> "TemplateUpdate":
        if self.levels is not None:
            # Reuse TemplateCreate validation
            TemplateCreate(
                name="__validate__",
                levels=self.levels,
                edge_rules=self.edge_rules or [],
            )
        return self


class TemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    levels: List[LevelDefinition]
    edge_rules: List[EdgeRule]
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @property
    def node_type_colors(self) -> Dict[str, str]:
        """Flat mapping: node type → hex color (backward compat)."""
        return {lvl.node_type: lvl.color for lvl in self.levels}

    @property
    def node_type_badge_colors(self) -> Dict[str, str]:
        """Flat mapping: node type → badge color (backward compat)."""
        return {lvl.node_type: lvl.badge_color for lvl in self.levels}

    @property
    def all_node_types(self) -> List[str]:
        """All valid node type identifiers."""
        return [lvl.node_type for lvl in self.levels]
