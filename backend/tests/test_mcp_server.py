from __future__ import annotations

"""Tests for the MCP server — 6 tools: read_memory, create_memory, update_memory, delete_memory, create_link, delete_link."""

import os
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base

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


@pytest.fixture(autouse=True)
def patch_mcp_session(monkeypatch):
    async def mock_get_session():
        return _TestSession()

    import mcp_server
    monkeypatch.setattr(mcp_server, "_get_session", mock_get_session)


# ── create_memory tests ──────────────────────────────────────


@pytest.mark.asyncio
async def test_create_memory():
    from mcp_server import handle_tool_call

    result = await handle_tool_call("create_memory", {
        "name": "Alice",
        "type": "person",
        "properties": {"role": "engineer"},
    })
    assert result["name"] == "Alice"
    assert result["type"] == "person"
    assert "id" in result


@pytest.mark.asyncio
async def test_create_memory_minimal():
    from mcp_server import handle_tool_call

    result = await handle_tool_call("create_memory", {
        "name": "FastAPI",
        "type": "tech",
    })
    assert result["name"] == "FastAPI"
    assert result["type"] == "tech"


# ── update_memory tests ──────────────────────────────────────


@pytest.mark.asyncio
async def test_update_memory():
    from mcp_server import handle_tool_call

    node = await handle_tool_call("create_memory", {
        "name": "Old", "type": "tech",
    })
    updated = await handle_tool_call("update_memory", {
        "node_id": node["id"],
        "name": "New",
        "properties": {"version": "2.0"},
    })
    assert updated["name"] == "New"
    assert updated["properties"]["version"] == "2.0"


# ── delete_memory tests ──────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_memory():
    from mcp_server import handle_tool_call

    node = await handle_tool_call("create_memory", {
        "name": "X", "type": "tech",
    })
    result = await handle_tool_call("delete_memory", {
        "node_id": node["id"],
    })
    assert result["deleted"] is True


# ── create_link tests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_link():
    from mcp_server import handle_tool_call

    n1 = await handle_tool_call("create_memory", {"name": "A", "type": "person"})
    n2 = await handle_tool_call("create_memory", {"name": "B", "type": "team"})

    edge = await handle_tool_call("create_link", {
        "source_id": n1["id"],
        "target_id": n2["id"],
        "type": "member_of",
    })
    assert edge["type"] == "member_of"
    assert "id" in edge


# ── delete_link tests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_link():
    from mcp_server import handle_tool_call

    n1 = await handle_tool_call("create_memory", {"name": "A", "type": "person"})
    n2 = await handle_tool_call("create_memory", {"name": "B", "type": "team"})
    edge = await handle_tool_call("create_link", {
        "source_id": n1["id"], "target_id": n2["id"], "type": "test",
    })

    result = await handle_tool_call("delete_link", {
        "edge_id": edge["id"],
    })
    assert result["deleted"] is True


# ── read_memory tests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_read_memory_by_name():
    from mcp_server import handle_tool_call

    await handle_tool_call("create_memory", {"name": "FastAPI", "type": "tech"})
    await handle_tool_call("create_memory", {"name": "Django", "type": "tech"})
    await handle_tool_call("create_memory", {"name": "Alice", "type": "person"})

    result = await handle_tool_call("read_memory", {"query": "tech"})
    assert result["seed_count"] >= 2
    names = [r["name"] for r in result["results"]]
    assert "FastAPI" in names
    assert "Django" in names


@pytest.mark.asyncio
async def test_read_memory_with_traversal():
    from mcp_server import handle_tool_call

    team = await handle_tool_call("create_memory", {"name": "개발팀", "type": "team"})
    person = await handle_tool_call("create_memory", {"name": "김철수", "type": "person"})
    tech = await handle_tool_call("create_memory", {"name": "FastAPI", "type": "tech"})

    await handle_tool_call("create_link", {
        "source_id": team["id"], "target_id": person["id"], "type": "has_member",
    })
    await handle_tool_call("create_link", {
        "source_id": person["id"], "target_id": tech["id"], "type": "uses",
    })

    result = await handle_tool_call("read_memory", {"query": "개발팀"})
    names = [r["name"] for r in result["results"]]
    assert "개발팀" in names
    assert "김철수" in names or "FastAPI" in names


@pytest.mark.asyncio
async def test_read_memory_no_results():
    from mcp_server import handle_tool_call

    await handle_tool_call("create_memory", {"name": "Test", "type": "tech"})
    result = await handle_tool_call("read_memory", {"query": "존재하지않는노드"})
    assert result["seed_count"] == 0
    assert len(result["results"]) == 0


# ── MCP Protocol tests ──────────────────────────────────────


@pytest.mark.asyncio
async def test_handle_request_initialize():
    from mcp_server import handle_request

    response = await handle_request({
        "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {},
    })
    assert response["result"]["serverInfo"]["name"] == "wng"
    assert response["result"]["serverInfo"]["version"] == "2.0.0"


@pytest.mark.asyncio
async def test_handle_request_tools_list():
    from mcp_server import handle_request

    response = await handle_request({
        "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {},
    })
    tools = response["result"]["tools"]
    tool_names = {t["name"] for t in tools}
    assert tool_names == {"read_memory", "create_memory", "update_memory", "delete_memory", "create_link", "delete_link"}
    assert len(tools) == 6


@pytest.mark.asyncio
async def test_handle_request_tools_call():
    from mcp_server import handle_request
    import json

    response = await handle_request({
        "jsonrpc": "2.0", "id": 3, "method": "tools/call",
        "params": {
            "name": "create_memory",
            "arguments": {"name": "Test", "type": "tech"},
        },
    })
    content = response["result"]["content"]
    data = json.loads(content[0]["text"])
    assert data["name"] == "Test"


@pytest.mark.asyncio
async def test_handle_request_ping():
    from mcp_server import handle_request

    response = await handle_request({
        "jsonrpc": "2.0", "id": 4, "method": "ping", "params": {},
    })
    assert response["result"] == {}
