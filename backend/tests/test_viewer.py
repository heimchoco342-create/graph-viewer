from __future__ import annotations

"""Tests for the viewer REST API (read-only endpoints + auth)."""

import pytest
from tests.conftest import TestSessionLocal
from app.services import graph_service


# ── Auth tests ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_register_and_login(client):
    # Register
    r = await client.post("/api/auth/register", json={
        "email": "test@wng.com", "password": "pw123", "name": "테스터",
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    # Login
    r = await client.post("/api/auth/login", json={
        "email": "test@wng.com", "password": "pw123",
    })
    assert r.status_code == 200
    assert r.json()["access_token"]

    # Me
    r = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["name"] == "테스터"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "email": "a@b.com", "password": "correct",
    })
    r = await client.post("/api/auth/login", json={
        "email": "a@b.com", "password": "wrong",
    })
    assert r.status_code == 401


# ── Graph read tests ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_nodes_empty(client):
    r = await client.get("/api/graph/nodes")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_list_edges_empty(client):
    r = await client.get("/api/graph/edges")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_list_graphs_empty(client):
    r = await client.get("/api/graph/graphs")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_list_nodes_with_data(client):
    async with TestSessionLocal() as session:
        await graph_service.create_node(session, type="person", name="Alice")
        await graph_service.create_node(session, type="tech", name="FastAPI")

    r = await client.get("/api/graph/nodes")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    names = {n["name"] for n in data}
    assert names == {"Alice", "FastAPI"}


@pytest.mark.asyncio
async def test_search_nodes(client):
    async with TestSessionLocal() as session:
        await graph_service.create_node(session, type="person", name="김철수")
        await graph_service.create_node(session, type="tech", name="React")

    r = await client.get("/api/graph/search", params={"q": "김"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["nodes"][0]["name"] == "김철수"


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
