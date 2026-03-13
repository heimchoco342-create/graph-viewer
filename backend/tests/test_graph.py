from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_node(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/graph/nodes",
        json={"type": "person", "name": "Alice", "properties": {"role": "engineer"}},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alice"
    assert data["type"] == "person"
    assert data["properties"]["role"] == "engineer"


@pytest.mark.asyncio
async def test_list_nodes(auth_client: AsyncClient):
    await auth_client.post("/api/graph/nodes", json={"type": "person", "name": "A"})
    await auth_client.post("/api/graph/nodes", json={"type": "person", "name": "B"})
    resp = await auth_client.get("/api/graph/nodes")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_node(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/graph/nodes", json={"type": "team", "name": "Backend"}
    )
    node_id = create_resp.json()["id"]
    resp = await auth_client.get(f"/api/graph/nodes/{node_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Backend"


@pytest.mark.asyncio
async def test_update_node(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/graph/nodes", json={"type": "project", "name": "Old Name"}
    )
    node_id = create_resp.json()["id"]
    resp = await auth_client.put(
        f"/api/graph/nodes/{node_id}",
        json={"name": "New Name"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_node(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/graph/nodes", json={"type": "tech", "name": "Python"}
    )
    node_id = create_resp.json()["id"]
    resp = await auth_client.delete(f"/api/graph/nodes/{node_id}")
    assert resp.status_code == 204

    get_resp = await auth_client.get(f"/api/graph/nodes/{node_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_create_edge(auth_client: AsyncClient):
    n1 = (await auth_client.post("/api/graph/nodes", json={"type": "person", "name": "A"})).json()
    n2 = (await auth_client.post("/api/graph/nodes", json={"type": "team", "name": "B"})).json()

    resp = await auth_client.post(
        "/api/graph/edges",
        json={
            "source_id": n1["id"],
            "target_id": n2["id"],
            "type": "belongs_to",
            "weight": 2.0,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "belongs_to"
    assert data["weight"] == 2.0


@pytest.mark.asyncio
async def test_list_edges(auth_client: AsyncClient):
    n1 = (await auth_client.post("/api/graph/nodes", json={"type": "person", "name": "X"})).json()
    n2 = (await auth_client.post("/api/graph/nodes", json={"type": "person", "name": "Y"})).json()
    await auth_client.post(
        "/api/graph/edges",
        json={"source_id": n1["id"], "target_id": n2["id"], "type": "knows"},
    )
    resp = await auth_client.get("/api/graph/edges")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_update_edge(auth_client: AsyncClient):
    n1 = (await auth_client.post("/api/graph/nodes", json={"type": "a", "name": "N1"})).json()
    n2 = (await auth_client.post("/api/graph/nodes", json={"type": "b", "name": "N2"})).json()
    edge = (
        await auth_client.post(
            "/api/graph/edges",
            json={"source_id": n1["id"], "target_id": n2["id"], "type": "uses"},
        )
    ).json()

    resp = await auth_client.put(
        f"/api/graph/edges/{edge['id']}",
        json={"type": "depends_on", "weight": 5.0},
    )
    assert resp.status_code == 200
    assert resp.json()["type"] == "depends_on"
    assert resp.json()["weight"] == 5.0


@pytest.mark.asyncio
async def test_delete_edge(auth_client: AsyncClient):
    n1 = (await auth_client.post("/api/graph/nodes", json={"type": "a", "name": "D1"})).json()
    n2 = (await auth_client.post("/api/graph/nodes", json={"type": "b", "name": "D2"})).json()
    edge = (
        await auth_client.post(
            "/api/graph/edges",
            json={"source_id": n1["id"], "target_id": n2["id"], "type": "test"},
        )
    ).json()

    resp = await auth_client.delete(f"/api/graph/edges/{edge['id']}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_search_nodes(auth_client: AsyncClient):
    await auth_client.post("/api/graph/nodes", json={"type": "person", "name": "Alice Kim"})
    await auth_client.post("/api/graph/nodes", json={"type": "person", "name": "Bob Lee"})
    await auth_client.post("/api/graph/nodes", json={"type": "project", "name": "Alice Project"})

    resp = await auth_client.get("/api/graph/search", params={"q": "Alice"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    names = [n["name"] for n in data["nodes"]]
    assert "Alice Kim" in names
    assert "Alice Project" in names


@pytest.mark.asyncio
async def test_node_requires_auth(client: AsyncClient):
    resp = await client.get("/api/graph/nodes")
    assert resp.status_code in (401, 403)
