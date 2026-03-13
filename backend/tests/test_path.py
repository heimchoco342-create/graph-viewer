from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _create_graph(auth_client: AsyncClient):
    """Create a small graph: A --1.0--> B --2.0--> C, A --10.0--> C"""
    a = (await auth_client.post("/api/graph/nodes", json={"type": "n", "name": "A"})).json()
    b = (await auth_client.post("/api/graph/nodes", json={"type": "n", "name": "B"})).json()
    c = (await auth_client.post("/api/graph/nodes", json={"type": "n", "name": "C"})).json()

    await auth_client.post(
        "/api/graph/edges",
        json={"source_id": a["id"], "target_id": b["id"], "type": "link", "weight": 1.0},
    )
    await auth_client.post(
        "/api/graph/edges",
        json={"source_id": b["id"], "target_id": c["id"], "type": "link", "weight": 2.0},
    )
    await auth_client.post(
        "/api/graph/edges",
        json={"source_id": a["id"], "target_id": c["id"], "type": "link", "weight": 10.0},
    )
    return a, b, c


@pytest.mark.asyncio
async def test_bfs_path(auth_client: AsyncClient):
    """BFS finds shortest hop path (A -> C direct, 1 hop)."""
    a, b, c = await _create_graph(auth_client)

    resp = await auth_client.get(
        "/api/path/find",
        params={"source_id": a["id"], "target_id": c["id"], "weighted": "false"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is True
    # BFS: A -> C direct (1 hop) is shorter than A -> B -> C (2 hops)
    assert len(data["nodes"]) == 2
    node_names = [n["name"] for n in data["nodes"]]
    assert node_names == ["A", "C"]


@pytest.mark.asyncio
async def test_dijkstra_path(auth_client: AsyncClient):
    """Dijkstra finds lowest-weight path (A -> B -> C = 3.0 vs A -> C = 10.0)."""
    a, b, c = await _create_graph(auth_client)

    resp = await auth_client.get(
        "/api/path/find",
        params={"source_id": a["id"], "target_id": c["id"], "weighted": "true"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is True
    # Dijkstra: A -> B -> C (weight 3.0) beats A -> C (weight 10.0)
    assert len(data["nodes"]) == 3
    node_names = [n["name"] for n in data["nodes"]]
    assert node_names == ["A", "B", "C"]
    assert data["total_weight"] == pytest.approx(3.0)


@pytest.mark.asyncio
async def test_no_path(auth_client: AsyncClient):
    """No path exists between disconnected nodes."""
    a = (await auth_client.post("/api/graph/nodes", json={"type": "n", "name": "Lonely1"})).json()
    b = (await auth_client.post("/api/graph/nodes", json={"type": "n", "name": "Lonely2"})).json()

    resp = await auth_client.get(
        "/api/path/find",
        params={"source_id": a["id"], "target_id": b["id"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is False
    assert data["nodes"] == []


@pytest.mark.asyncio
async def test_same_source_target(auth_client: AsyncClient):
    """Path from a node to itself."""
    a = (await auth_client.post("/api/graph/nodes", json={"type": "n", "name": "Self"})).json()

    resp = await auth_client.get(
        "/api/path/find",
        params={"source_id": a["id"], "target_id": a["id"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is True
    assert len(data["nodes"]) == 1
