"""Tests for graph access control service."""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base
from app.models.user import User
from app.models.graph import Graph, Group, GroupMember, GraphPermission
from app.services.graph_access import (
    has_graph_access,
    get_accessible_graphs,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
_Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    async with _Session() as session:
        yield session


@pytest_asyncio.fixture
async def user_alice(db: AsyncSession) -> User:
    user = User(id=uuid.uuid4(), email="alice@test.com", password_hash="x", name="Alice", role="user")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def user_bob(db: AsyncSession) -> User:
    user = User(id=uuid.uuid4(), email="bob@test.com", password_hash="x", name="Bob", role="user")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db: AsyncSession) -> User:
    user = User(id=uuid.uuid4(), email="admin@test.com", password_hash="x", name="Admin", role="admin")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ── Scope-based access tests ──


@pytest.mark.asyncio
async def test_org_scope_readable_by_anyone(db: AsyncSession, user_alice: User, user_bob: User):
    graph = Graph(name="Company Graph", owner_id=user_alice.id, scope="org")
    db.add(graph)
    await db.commit()

    assert await has_graph_access(db, user_bob, graph.id, "read") is True
    assert await has_graph_access(db, user_bob, graph.id, "write") is False


@pytest.mark.asyncio
async def test_personal_scope_owner_only(db: AsyncSession, user_alice: User, user_bob: User):
    graph = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    db.add(graph)
    await db.commit()

    assert await has_graph_access(db, user_alice, graph.id, "read") is True
    assert await has_graph_access(db, user_alice, graph.id, "write") is True
    assert await has_graph_access(db, user_bob, graph.id, "read") is False


@pytest.mark.asyncio
async def test_admin_accesses_all_scopes(db: AsyncSession, user_alice: User, admin_user: User):
    personal = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    db.add(personal)
    await db.commit()

    assert await has_graph_access(db, admin_user, personal.id, "read") is True
    assert await has_graph_access(db, admin_user, personal.id, "write") is True


# ── Group-based access tests ──


@pytest.mark.asyncio
async def test_group_scope_member_can_read(db: AsyncSession, user_alice: User, user_bob: User):
    group = Group(name="DevOps Team")
    db.add(group)
    await db.flush()

    db.add(GroupMember(group_id=group.id, user_id=user_bob.id, role="member"))
    graph = Graph(name="DevOps Graph", owner_id=user_alice.id, scope="group", group_id=group.id)
    db.add(graph)
    await db.commit()

    assert await has_graph_access(db, user_bob, graph.id, "read") is True
    assert await has_graph_access(db, user_bob, graph.id, "write") is False


@pytest.mark.asyncio
async def test_group_hierarchy_access(db: AsyncSession, user_alice: User, user_bob: User):
    """Members of a child group can access parent group's graphs."""
    parent = Group(name="Engineering")
    db.add(parent)
    await db.flush()

    child = Group(name="Backend Team", parent_id=parent.id)
    db.add(child)
    await db.flush()

    # Bob is in child group
    db.add(GroupMember(group_id=child.id, user_id=user_bob.id, role="member"))
    # Graph is scoped to parent group
    graph = Graph(name="Eng Graph", owner_id=user_alice.id, scope="group", group_id=parent.id)
    db.add(graph)
    await db.commit()

    # Bob can access via child → parent hierarchy
    assert await has_graph_access(db, user_bob, graph.id, "read") is True


@pytest.mark.asyncio
async def test_non_member_cannot_access_group_graph(db: AsyncSession, user_alice: User, user_bob: User):
    group = Group(name="Private Team")
    db.add(group)
    await db.flush()

    graph = Graph(name="Private Graph", owner_id=user_alice.id, scope="group", group_id=group.id)
    db.add(graph)
    await db.commit()

    # Bob is NOT a member
    assert await has_graph_access(db, user_bob, graph.id, "read") is False


# ── Explicit permission tests ──


@pytest.mark.asyncio
async def test_explicit_user_permission(db: AsyncSession, user_alice: User, user_bob: User):
    graph = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    db.add(graph)
    await db.flush()

    db.add(GraphPermission(
        graph_id=graph.id, grantee_id=user_bob.id, grantee_type="user", permission="write"
    ))
    await db.commit()

    assert await has_graph_access(db, user_bob, graph.id, "read") is True
    assert await has_graph_access(db, user_bob, graph.id, "write") is True
    assert await has_graph_access(db, user_bob, graph.id, "admin") is False


@pytest.mark.asyncio
async def test_explicit_group_permission(db: AsyncSession, user_alice: User, user_bob: User):
    group = Group(name="Reviewers")
    db.add(group)
    await db.flush()

    db.add(GroupMember(group_id=group.id, user_id=user_bob.id, role="member"))

    graph = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    db.add(graph)
    await db.flush()

    db.add(GraphPermission(
        graph_id=graph.id, grantee_id=group.id, grantee_type="group", permission="read"
    ))
    await db.commit()

    assert await has_graph_access(db, user_bob, graph.id, "read") is True
    assert await has_graph_access(db, user_bob, graph.id, "write") is False


# ── Utility function tests ──


@pytest.mark.asyncio
async def test_get_accessible_graphs(db: AsyncSession, user_alice: User, user_bob: User):
    org = Graph(name="Org", owner_id=user_alice.id, scope="org")
    personal = Graph(name="Alice Personal", owner_id=user_alice.id, scope="personal")
    bob_personal = Graph(name="Bob Personal", owner_id=user_bob.id, scope="personal")
    db.add_all([org, personal, bob_personal])
    await db.commit()

    alice_graphs = await get_accessible_graphs(db, user_alice)
    alice_names = {g.name for g in alice_graphs}
    assert "Org" in alice_names
    assert "Alice Personal" in alice_names
    assert "Bob Personal" not in alice_names

    bob_graphs = await get_accessible_graphs(db, user_bob)
    bob_names = {g.name for g in bob_graphs}
    assert "Org" in bob_names
    assert "Bob Personal" in bob_names
    assert "Alice Personal" not in bob_names


@pytest.mark.asyncio
async def test_nonexistent_graph_returns_false(db: AsyncSession, user_alice: User):
    assert await has_graph_access(db, user_alice, uuid.uuid4(), "read") is False
