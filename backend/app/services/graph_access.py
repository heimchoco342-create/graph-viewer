from __future__ import annotations

"""Graph access control service.

Determines whether a user can access a specific graph based on:
  - graph scope (org, group, personal)
  - graph_permissions table
  - group membership hierarchy
"""

import uuid

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.graph import Graph, GraphPermission, Group, GroupMember
from app.models.user import User


PERMISSION_HIERARCHY = {"admin": 3, "write": 2, "read": 1}


async def has_graph_access(
    session: AsyncSession,
    user: User,
    graph_id: uuid.UUID,
    required: str = "read",
) -> bool:
    """Check if *user* has at least *required* permission on *graph_id*.

    Returns True/False.  Raises no exceptions.
    """
    result = await session.execute(select(Graph).where(Graph.id == graph_id))
    graph = result.scalar_one_or_none()
    if graph is None:
        return False

    return await _check_graph_access(session, user, graph, required)


async def _check_graph_access(
    session: AsyncSession,
    user: User,
    graph: Graph,
    required: str,
) -> bool:
    # org scope: everyone can read, only explicit permissions for write/admin
    if graph.scope == "org" and required == "read":
        return True

    # owner always has full access
    if graph.owner_id == user.id:
        return True

    # system admin has full access
    if user.role == "admin":
        return True

    # Check explicit permissions
    if await _check_explicit_permission(session, user, graph.id, required):
        return True

    # group scope: check group membership
    if graph.scope == "group" and graph.group_id:
        if await _is_group_member(session, user.id, graph.group_id):
            return _meets_requirement("read", required)

    return False


async def _check_explicit_permission(
    session: AsyncSession,
    user: User,
    graph_id: uuid.UUID,
    required: str,
) -> bool:
    """Check graph_permissions for direct user grant or group-based grant."""
    # Direct user permission
    result = await session.execute(
        select(GraphPermission).where(
            GraphPermission.graph_id == graph_id,
            GraphPermission.grantee_id == user.id,
            GraphPermission.grantee_type == "user",
        )
    )
    perm = result.scalar_one_or_none()
    if perm and _meets_requirement(perm.permission, required):
        return True

    # Group-based permissions: find all groups the user belongs to
    user_group_ids = await _get_user_group_ids(session, user.id)
    if not user_group_ids:
        return False

    result = await session.execute(
        select(GraphPermission).where(
            GraphPermission.graph_id == graph_id,
            GraphPermission.grantee_type == "group",
            GraphPermission.grantee_id.in_(user_group_ids),
        )
    )
    for perm in result.scalars().all():
        if _meets_requirement(perm.permission, required):
            return True

    return False


async def _is_group_member(
    session: AsyncSession,
    user_id: uuid.UUID,
    group_id: uuid.UUID,
) -> bool:
    """Check membership in a group or any of its ancestor groups."""
    user_group_ids = await _get_user_group_ids(session, user_id)
    return group_id in user_group_ids


async def _get_user_group_ids(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> set[uuid.UUID]:
    """Return all group IDs the user belongs to, including ancestor groups."""
    result = await session.execute(
        select(GroupMember.group_id).where(GroupMember.user_id == user_id)
    )
    direct_ids = {row[0] for row in result.all()}
    if not direct_ids:
        return set()

    # Walk up the group hierarchy to include parent groups
    all_ids = set(direct_ids)
    to_check = list(direct_ids)
    while to_check:
        result = await session.execute(
            select(Group.parent_id).where(
                Group.id.in_(to_check),
                Group.parent_id.isnot(None),
            )
        )
        parent_ids = {row[0] for row in result.all()} - all_ids
        all_ids |= parent_ids
        to_check = list(parent_ids)

    return all_ids


def _meets_requirement(granted: str, required: str) -> bool:
    return PERMISSION_HIERARCHY.get(granted, 0) >= PERMISSION_HIERARCHY.get(required, 0)


async def get_accessible_graphs(
    session: AsyncSession,
    user: User,
) -> list[Graph]:
    """Return all graphs the user can access (for sidebar listing)."""
    result = await session.execute(select(Graph))
    all_graphs = result.scalars().all()

    accessible = []
    for graph in all_graphs:
        if await _check_graph_access(session, user, graph, "read"):
            accessible.append(graph)
    return accessible


