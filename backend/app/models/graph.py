from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import ForeignKey, String, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Graph(Base):
    """A namespace that groups nodes and edges.

    scope values:
      - 'org'       : visible to all users in the organisation
      - 'group'     : visible to members of the linked group
      - 'personal'  : visible only to the owner (and admins)
    """
    __tablename__ = "graphs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    scope: Mapped[str] = mapped_column(
        String(50), nullable=False, default="personal"
    )
    group_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class Group(Base):
    """Flexible grouping unit — can represent a team, department, org, or project."""
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class GroupMember(Base):
    """Association between users and groups with role."""
    __tablename__ = "group_members"

    group_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(
        String(50), nullable=False, default="member"
    )


class GraphPermission(Base):
    """Per-graph permission grant for a user or group."""
    __tablename__ = "graph_permissions"

    graph_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("graphs.id", ondelete="CASCADE"), primary_key=True
    )
    grantee_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    grantee_type: Mapped[str] = mapped_column(
        String(20), nullable=False  # 'user' | 'group'
    )
    permission: Mapped[str] = mapped_column(
        String(20), nullable=False  # 'read' | 'write' | 'admin'
    )
