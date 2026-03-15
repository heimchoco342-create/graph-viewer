"""Tests for graph access control service."""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.graph import Graph, Group, GroupMember, GraphPermission
from app.services.graph_access import (
    has_graph_access,
    get_accessible_graphs,
)


@pytest_asyncio.fixture
async def user_alice(db_session: AsyncSession) -> User:
    user = User(id=uuid.uuid4(), email="alice@test.com", password_hash="x", name="Alice", role="user")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def user_bob(db_session: AsyncSession) -> User:
    user = User(id=uuid.uuid4(), email="bob@test.com", password_hash="x", name="Bob", role="user")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(id=uuid.uuid4(), email="admin@test.com", password_hash="x", name="Admin", role="admin")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# ── Scope-based access tests ──


@pytest.mark.asyncio
async def test_org_scope_readable_by_anyone(db_session: AsyncSession, user_alice: User, user_bob: User):
    graph = Graph(name="Company Graph", owner_id=user_alice.id, scope="org")
    db_session.add(graph)
    await db_session.commit()

    assert await has_graph_access(db_session, user_bob, graph.id, "read") is True
    assert await has_graph_access(db_session, user_bob, graph.id, "write") is False


@pytest.mark.asyncio
async def test_personal_scope_owner_only(db_session: AsyncSession, user_alice: User, user_bob: User):
    graph = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    db_session.add(graph)
    await db_session.commit()

    assert await has_graph_access(db_session, user_alice, graph.id, "read") is True
    assert await has_graph_access(db_session, user_alice, graph.id, "write") is True
    assert await has_graph_access(db_session, user_bob, graph.id, "read") is False


@pytest.mark.asyncio
async def test_admin_accesses_all_scopes(db_session: AsyncSession, user_alice: User, admin_user: User):
    personal = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    db_session.add(personal)
    await db_session.commit()

    assert await has_graph_access(db_session, admin_user, personal.id, "read") is True
    assert await has_graph_access(db_session, admin_user, personal.id, "write") is True


# ── Group-based access tests ──


@pytest.mark.asyncio
async def test_group_scope_member_can_read(db_session: AsyncSession, user_alice: User, user_bob: User):
    group = Group(name="DevOps Team")
    db_session.add(group)
    await db_session.flush()

    db_session.add(GroupMember(group_id=group.id, user_id=user_bob.id, role="member"))
    graph = Graph(name="DevOps Graph", owner_id=user_alice.id, scope="group", group_id=group.id)
    db_session.add(graph)
    await db_session.commit()

    assert await has_graph_access(db_session, user_bob, graph.id, "read") is True
    assert await has_graph_access(db_session, user_bob, graph.id, "write") is False


@pytest.mark.asyncio
async def test_group_hierarchy_access(db_session: AsyncSession, user_alice: User, user_bob: User):
    """Members of a child group can access parent group's graphs."""
    parent = Group(name="Engineering")
    db_session.add(parent)
    await db_session.flush()

    child = Group(name="Backend Team", parent_id=parent.id)
    db_session.add(child)
    await db_session.flush()

    # Bob is in child group
    db_session.add(GroupMember(group_id=child.id, user_id=user_bob.id, role="member"))
    # Graph is scoped to parent group
    graph = Graph(name="Eng Graph", owner_id=user_alice.id, scope="group", group_id=parent.id)
    db_session.add(graph)
    await db_session.commit()

    # Bob can access via child → parent hierarchy
    assert await has_graph_access(db_session, user_bob, graph.id, "read") is True


@pytest.mark.asyncio
async def test_non_member_cannot_access_group_graph(db_session: AsyncSession, user_alice: User, user_bob: User):
    group = Group(name="Private Team")
    db_session.add(group)
    await db_session.flush()

    graph = Graph(name="Private Graph", owner_id=user_alice.id, scope="group", group_id=group.id)
    db_session.add(graph)
    await db_session.commit()

    # Bob is NOT a member
    assert await has_graph_access(db_session, user_bob, graph.id, "read") is False


# ── Explicit permission tests ──


@pytest.mark.asyncio
async def test_explicit_user_permission(db_session: AsyncSession, user_alice: User, user_bob: User):
    graph = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    db_session.add(graph)
    await db_session.flush()

    db_session.add(GraphPermission(
        graph_id=graph.id, grantee_id=user_bob.id, grantee_type="user", permission="write"
    ))
    await db_session.commit()

    assert await has_graph_access(db_session, user_bob, graph.id, "read") is True
    assert await has_graph_access(db_session, user_bob, graph.id, "write") is True
    assert await has_graph_access(db_session, user_bob, graph.id, "admin") is False


@pytest.mark.asyncio
async def test_explicit_group_permission(db_session: AsyncSession, user_alice: User, user_bob: User):
    group = Group(name="Reviewers")
    db_session.add(group)
    await db_session.flush()

    db_session.add(GroupMember(group_id=group.id, user_id=user_bob.id, role="member"))

    graph = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    db_session.add(graph)
    await db_session.flush()

    db_session.add(GraphPermission(
        graph_id=graph.id, grantee_id=group.id, grantee_type="group", permission="read"
    ))
    await db_session.commit()

    assert await has_graph_access(db_session, user_bob, graph.id, "read") is True
    assert await has_graph_access(db_session, user_bob, graph.id, "write") is False


# ── Utility function tests ──


@pytest.mark.asyncio
async def test_get_accessible_graphs(db_session: AsyncSession, user_alice: User, user_bob: User):
    org = Graph(name="Org", owner_id=user_alice.id, scope="org")
    personal = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    bob_personal = Graph(name="Bob Personal", owner_id=user_bob.id, scope="personal")
    db_session.add_all([org, personal, bob_personal])
    await db_session.commit()

    alice_graphs = await get_accessible_graphs(db_session, user_alice)
    alice_names = {g.name for g in alice_graphs}
    assert "Org" in alice_names
    assert "Alice Personal" in alice_names
    assert "Bob Personal" not in alice_names

    bob_graphs = await get_accessible_graphs(db_session, user_bob)
    bob_names = {g.name for g in bob_graphs}
    assert "Org" in bob_names
    assert "Bob Personal" in bob_names
    assert "Alice Personal" not in bob_names


@pytest.mark.asyncio
async def test_nonexistent_graph_returns_false(db_session: AsyncSession, user_alice: User):
    assert await has_graph_access(db_session, user_alice, uuid.uuid4(), "read") is False
