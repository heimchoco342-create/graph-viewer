from __future__ import annotations

"""Tests for the MCP server tool handlers.

Tests the tool handler functions directly (without stdio transport)
to verify graph CRUD, search, path-finding, and K8s import work correctly
when invoked as MCP tool calls.
"""

import os
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base

# Use a separate in-memory DB for MCP tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
_TestSession = async_sessionmaker(_test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_mcp_db():
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    async with _TestSession() as session:
        yield session


# Patch the MCP server's _get_session to use our test DB
@pytest.fixture(autouse=True)
def patch_mcp_session(monkeypatch):
    async def mock_get_session():
        return _TestSession()

    import mcp_server
    monkeypatch.setattr(mcp_server, "_get_session", mock_get_session)


FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "complex_k8s_cluster.yaml")


@pytest.fixture
def complex_yaml() -> str:
    with open(FIXTURE_PATH) as f:
        return f.read()


# ── Basic CRUD tests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_and_get_node():
    from mcp_server import handle_tool_call

    result = await handle_tool_call("create_node", {
        "name": "Alice",
        "type": "person",
        "properties": {"role": "engineer"},
    })
    assert result["name"] == "Alice"
    assert result["type"] == "person"
    node_id = result["id"]

    # Get the node
    got = await handle_tool_call("get_node", {"node_id": node_id})
    assert got["name"] == "Alice"
    assert got["properties"]["role"] == "engineer"


@pytest.mark.asyncio
async def test_list_nodes():
    from mcp_server import handle_tool_call

    await handle_tool_call("create_node", {"name": "A", "type": "person"})
    await handle_tool_call("create_node", {"name": "B", "type": "team"})
    await handle_tool_call("create_node", {"name": "C", "type": "person"})

    all_nodes = await handle_tool_call("list_nodes", {})
    assert len(all_nodes) == 3

    persons = await handle_tool_call("list_nodes", {"type_filter": "person"})
    assert len(persons) == 2


@pytest.mark.asyncio
async def test_update_node():
    from mcp_server import handle_tool_call

    node = await handle_tool_call("create_node", {"name": "Old", "type": "tech"})
    updated = await handle_tool_call("update_node", {
        "node_id": node["id"],
        "name": "New",
        "properties": {"version": "2.0"},
    })
    assert updated["name"] == "New"
    assert updated["properties"]["version"] == "2.0"


@pytest.mark.asyncio
async def test_delete_node():
    from mcp_server import handle_tool_call

    node = await handle_tool_call("create_node", {"name": "X", "type": "tech"})
    result = await handle_tool_call("delete_node", {"node_id": node["id"]})
    assert result["deleted"] is True

    got = await handle_tool_call("get_node", {"node_id": node["id"]})
    assert "error" in got


@pytest.mark.asyncio
async def test_create_and_list_edges():
    from mcp_server import handle_tool_call

    n1 = await handle_tool_call("create_node", {"name": "A", "type": "person"})
    n2 = await handle_tool_call("create_node", {"name": "B", "type": "team"})

    edge = await handle_tool_call("create_edge", {
        "source_id": n1["id"],
        "target_id": n2["id"],
        "type": "member_of",
    })
    assert edge["type"] == "member_of"

    edges = await handle_tool_call("list_edges", {})
    assert len(edges) == 1


@pytest.mark.asyncio
async def test_delete_edge():
    from mcp_server import handle_tool_call

    n1 = await handle_tool_call("create_node", {"name": "A", "type": "person"})
    n2 = await handle_tool_call("create_node", {"name": "B", "type": "team"})
    edge = await handle_tool_call("create_edge", {
        "source_id": n1["id"],
        "target_id": n2["id"],
        "type": "test",
    })

    result = await handle_tool_call("delete_edge", {"edge_id": edge["id"]})
    assert result["deleted"] is True


@pytest.mark.asyncio
async def test_search_nodes():
    from mcp_server import handle_tool_call

    await handle_tool_call("create_node", {"name": "FastAPI Framework", "type": "tech"})
    await handle_tool_call("create_node", {"name": "Django Framework", "type": "tech"})
    await handle_tool_call("create_node", {"name": "Alice Smith", "type": "person"})

    results = await handle_tool_call("search_nodes", {"query": "Framework"})
    assert len(results) == 2

    results = await handle_tool_call("search_nodes", {"query": "Alice"})
    assert len(results) == 1


@pytest.mark.asyncio
async def test_find_path():
    from mcp_server import handle_tool_call

    n1 = await handle_tool_call("create_node", {"name": "A", "type": "person"})
    n2 = await handle_tool_call("create_node", {"name": "B", "type": "team"})
    n3 = await handle_tool_call("create_node", {"name": "C", "type": "project"})

    await handle_tool_call("create_edge", {"source_id": n1["id"], "target_id": n2["id"], "type": "member_of"})
    await handle_tool_call("create_edge", {"source_id": n2["id"], "target_id": n3["id"], "type": "works_on"})

    result = await handle_tool_call("find_path", {
        "source_id": n1["id"],
        "target_id": n3["id"],
    })
    assert result["found"] is True
    assert len(result["nodes"]) == 3
    assert len(result["edges"]) == 2


@pytest.mark.asyncio
async def test_find_path_not_found():
    from mcp_server import handle_tool_call

    n1 = await handle_tool_call("create_node", {"name": "X", "type": "person"})
    n2 = await handle_tool_call("create_node", {"name": "Y", "type": "person"})

    result = await handle_tool_call("find_path", {
        "source_id": n1["id"],
        "target_id": n2["id"],
    })
    assert result["found"] is False


@pytest.mark.asyncio
async def test_get_node_relations():
    from mcp_server import handle_tool_call

    n1 = await handle_tool_call("create_node", {"name": "A", "type": "person"})
    n2 = await handle_tool_call("create_node", {"name": "B", "type": "team"})
    n3 = await handle_tool_call("create_node", {"name": "C", "type": "project"})

    await handle_tool_call("create_edge", {"source_id": n1["id"], "target_id": n2["id"], "type": "member_of"})
    await handle_tool_call("create_edge", {"source_id": n2["id"], "target_id": n3["id"], "type": "works_on"})

    # n2 should have 2 relations (one incoming, one outgoing)
    relations = await handle_tool_call("get_node_relations", {"node_id": n2["id"]})
    assert len(relations) == 2


# ── K8s import via MCP ──────────────────────────────────────


@pytest.mark.asyncio
async def test_import_k8s_yaml_via_mcp(complex_yaml: str):
    from mcp_server import handle_tool_call

    result = await handle_tool_call("import_k8s_yaml", {
        "yaml_content": complex_yaml,
    })
    assert result["nodes_created"] > 40
    assert result["edges_created"] > 80

    # Verify nodes are searchable after import
    nodes = await handle_tool_call("search_nodes", {"query": "api-gateway"})
    assert len(nodes) > 0

    # Verify edges exist
    edges = await handle_tool_call("list_edges", {"limit": 200})
    edge_types = {e["type"] for e in edges}
    assert "owns" in edge_types
    assert "selects" in edge_types
    assert "contains" in edge_types
    assert "mounts" in edge_types
    assert "routes_to" in edge_types
    assert "scales" in edge_types


@pytest.mark.asyncio
async def test_import_k8s_with_namespace_filter(complex_yaml: str):
    from mcp_server import handle_tool_call

    result = await handle_tool_call("import_k8s_yaml", {
        "yaml_content": complex_yaml,
        "namespace_filter": "monitoring",
    })
    # Only monitoring namespace resources
    assert result["nodes_created"] < 15


@pytest.mark.asyncio
async def test_k8s_path_finding_via_mcp(complex_yaml: str):
    """After K8s import, find paths between resources using MCP tools."""
    from mcp_server import handle_tool_call

    result = await handle_tool_call("import_k8s_yaml", {
        "yaml_content": complex_yaml,
    })

    nodes = result["nodes"]
    ingress = next((n for n in nodes if n["type"] == "k8s-ingress"), None)
    pod = next((n for n in nodes if n["type"] == "k8s-pod" and "api-gateway" in n["name"]), None)

    if ingress and pod:
        path = await handle_tool_call("find_path", {
            "source_id": ingress["id"],
            "target_id": pod["id"],
        })
        assert path["found"] is True


@pytest.mark.asyncio
async def test_k8s_node_relations_via_mcp(complex_yaml: str):
    """Check relations of a specific K8s resource after import."""
    from mcp_server import handle_tool_call

    result = await handle_tool_call("import_k8s_yaml", {
        "yaml_content": complex_yaml,
    })

    # Find the api-gateway deployment
    deployment = next(
        (n for n in result["nodes"] if n["type"] == "k8s-deployment" and "api-gateway" in n["name"]),
        None,
    )
    assert deployment is not None

    # Verify edges were created during import
    import_edges = result["edges"]
    deploy_edges = [
        e for e in import_edges
        if e["source_id"] == deployment["id"] or e["target_id"] == deployment["id"]
    ]
    edge_types = {e["type"] for e in deploy_edges}
    # Deployment should have: owns (→ RS), scales (← HPA), contains (← namespace)
    assert "owns" in edge_types, f"Expected 'owns' in {edge_types}"
    assert len(deploy_edges) >= 2


# ── MCP Protocol tests ──────────────────────────────────────


@pytest.mark.asyncio
async def test_handle_request_initialize():
    from mcp_server import handle_request

    response = await handle_request({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {},
    })
    assert response["result"]["serverInfo"]["name"] == "wng"
    assert "tools" in response["result"]["capabilities"]


@pytest.mark.asyncio
async def test_handle_request_tools_list():
    from mcp_server import handle_request

    response = await handle_request({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {},
    })
    tools = response["result"]["tools"]
    tool_names = {t["name"] for t in tools}
    assert "create_node" in tool_names
    assert "import_k8s_yaml" in tool_names
    assert "find_path" in tool_names
    assert "get_node_relations" in tool_names
    assert len(tools) == 12


@pytest.mark.asyncio
async def test_handle_request_tools_call():
    from mcp_server import handle_request

    response = await handle_request({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "create_node",
            "arguments": {"name": "Test", "type": "tech"},
        },
    })
    content = response["result"]["content"]
    assert len(content) == 1
    assert content[0]["type"] == "text"
    import json
    data = json.loads(content[0]["text"])
    assert data["name"] == "Test"


@pytest.mark.asyncio
async def test_handle_request_ping():
    from mcp_server import handle_request

    response = await handle_request({
        "jsonrpc": "2.0",
        "id": 4,
        "method": "ping",
        "params": {},
    })
    assert response["result"] == {}
