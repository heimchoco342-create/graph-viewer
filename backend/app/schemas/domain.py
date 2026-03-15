"""Domain configuration schema.

Defines node types, edge types, colors, and badge styles per domain.
Loaded from JSON files and validated with Pydantic.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class NodeTypeOption(BaseModel):
    value: str = Field(..., description="Node type identifier (e.g. 'person', 'k8s-pod')")
    label: str = Field(..., description="Display label (e.g. 'Person', 'Pod')")
    color: str = Field(..., description="Hex color for graph visualization (e.g. '#3b82f6')")
    badge_color: str = Field(..., description="Tailwind CSS class for badge (e.g. 'bg-blue-500')")


class NodeTypeGroup(BaseModel):
    label: str = Field(..., description="Group display name (e.g. 'Organization', 'Kubernetes')")
    options: List[NodeTypeOption] = Field(..., min_length=1)


class EdgeTypeOption(BaseModel):
    value: str = Field(..., description="Edge type identifier (e.g. 'works_on', 'owns')")
    label: str = Field(..., description="Display label (e.g. 'Works On', 'Owns')")


class EdgeTypeGroup(BaseModel):
    label: str = Field(..., description="Group display name")
    options: List[EdgeTypeOption] = Field(..., min_length=1)


class DomainConfig(BaseModel):
    """Full domain configuration loaded from JSON."""

    name: str = Field(..., description="Domain name (e.g. 'default', 'hr', 'infra')")
    description: Optional[str] = Field(None, description="Domain description")
    node_type_groups: List[NodeTypeGroup] = Field(..., min_length=1)
    edge_type_groups: List[EdgeTypeGroup] = Field(default_factory=list)

    @property
    def node_type_colors(self) -> Dict[str, str]:
        """Flat mapping: node type value → hex color."""
        return {
            opt.value: opt.color
            for group in self.node_type_groups
            for opt in group.options
        }

    @property
    def node_type_badge_colors(self) -> Dict[str, str]:
        """Flat mapping: node type value → Tailwind badge class."""
        return {
            opt.value: opt.badge_color
            for group in self.node_type_groups
            for opt in group.options
        }

    @property
    def all_node_type_values(self) -> List[str]:
        """All valid node type identifiers."""
        return [
            opt.value
            for group in self.node_type_groups
            for opt in group.options
        ]

    @property
    def all_edge_type_values(self) -> List[str]:
        """All valid edge type identifiers."""
        return [
            opt.value
            for group in self.edge_type_groups
            for opt in group.options
        ]


class DomainConfigResponse(BaseModel):
    """API response for domain configuration."""

    name: str
    description: Optional[str] = None
    node_type_groups: List[NodeTypeGroup]
    edge_type_groups: List[EdgeTypeGroup]
    node_type_colors: Dict[str, str]
    node_type_badge_colors: Dict[str, str]
