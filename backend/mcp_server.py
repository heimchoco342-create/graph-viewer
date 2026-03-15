#!/usr/bin/env python3
"""MCP (Model Context Protocol) server for WNG.

6 tools: read_memory, create_memory, update_memory, delete_memory, create_link, delete_link.
Communicates via JSON-RPC 2.0 over stdio.

Usage:
    python mcp_server.py

Configure in claude_desktop_config.json:
    {
      "mcpServers": {
        "wng": {
          "command": "python3",
          "args": ["/path/to/wng/backend/mcp_server.py"],
          "env": {
            "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/graphviewer"
          }
        }
      }
    }
"""
from __future__ import annotations

import asyncio
import json
import logging
import sys
import uuid
from typing import Any, Dict

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("mcp-wng")

# ── Tool definitions ─────────────────────────────────────────

TOOLS = [
    {
        "name": "read_memory",
        "description": (
            "Search stored memories using natural language. "
            "Finds relevant memories by vector similarity + 1-hop edge drill-down. "
            "When user_id is provided, scopes search to graphs accessible by that user."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Natural language search query"},
                "graph_id": {"type": "string", "description": "Limit search to a specific graph"},
                "user_id": {"type": "string", "description": "Scope search to graphs accessible by this user"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "create_memory",
        "description": "Create a new memory node.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Memory name"},
                "type": {"type": "string", "description": "Memory type (e.g. person, team, tech, task)"},
                "properties": {"type": "object", "description": "Additional key-value properties"},
                "graph_id": {"type": "string", "description": "Target graph namespace"},
            },
            "required": ["name", "type"],
        },
    },
    {
        "name": "update_memory",
        "description": "Update an existing memory node.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "UUID of the memory to update"},
                "name": {"type": "string", "description": "New name"},
                "type": {"type": "string", "description": "New type"},
                "properties": {"type": "object", "description": "New properties (replaces existing)"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "delete_memory",
        "description": "Delete a memory node and its connections.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "UUID of the memory to delete"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "create_link",
        "description": "Create a connection between two memories.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "source_id": {"type": "string", "description": "UUID of the source memory"},
                "target_id": {"type": "string", "description": "UUID of the target memory"},
                "type": {"type": "string", "description": "Relationship type (e.g. member_of, uses, depends_on)"},
                "graph_id": {"type": "string", "description": "Target graph namespace"},
            },
            "required": ["source_id", "target_id", "type"],
        },
    },
    {
        "name": "delete_link",
        "description": "Delete a connection between two memories.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "edge_id": {"type": "string", "description": "UUID of the connection to delete"},
            },
            "required": ["edge_id"],
        },
    },
]

# ── Database setup ───────────────────────────────────────────

_engine = None
_session_factory = None


async def _get_engine():
    global _engine
    if _engine is None:
        import os
        from sqlalchemy.ext.asyncio import create_async_engine
        db_url = os.environ.get(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/graphviewer",
        )
        _engine = create_async_engine(db_url, echo=False)
        from app.db import Base
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    return _engine


async def _get_session():
    global _session_factory
    if _session_factory is None:
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
        engine = await _get_engine()
        _session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory()


# ── Tool handlers ────────────────────────────────────────────


def _node_to_dict(node) -> dict:
    return {
        "id": str(node.id),
        "type": node.type,
        "name": node.name,
        "properties": node.properties,
        "created_at": str(node.created_at),
        "updated_at": str(node.updated_at),
    }


def _edge_to_dict(edge) -> dict:
    return {
        "id": str(edge.id),
        "source_id": str(edge.source_id),
        "target_id": str(edge.target_id),
        "type": edge.type,
        "properties": edge.properties,
        "weight": edge.weight,
        "created_at": str(edge.created_at),
    }


async def handle_tool_call(name: str, arguments: Dict[str, Any]) -> Any:
    from app.services import graph_service
    from app.services.search_service import search_graph

    session = await _get_session()
    try:
        # ── read_memory ──────────────────────────────────────
        if name == "read_memory":
            graph_id = uuid.UUID(arguments["graph_id"]) if arguments.get("graph_id") else None
            user_id = uuid.UUID(arguments["user_id"]) if arguments.get("user_id") else None
            response = await search_graph(
                session,
                query=arguments["query"],
                graph_id=graph_id,
                user_id=user_id,
            )
            return {
                "query": response.query,
                "seed_count": response.seed_count,
                "total_traversed": response.total_traversed,
                "results": [
                    {
                        "node_id": str(r.node_id),
                        "name": r.name,
                        "type": r.type,
                        "properties": r.properties,
                        "depth": r.depth,
                        "score": r.score,
                    }
                    for r in response.results
                ],
            }

        # ── create_memory ────────────────────────────────────
        elif name == "create_memory":
            graph_id = uuid.UUID(arguments["graph_id"]) if arguments.get("graph_id") else None
            node = await graph_service.create_node(
                session,
                type=arguments["type"],
                name=arguments["name"],
                properties=arguments.get("properties", {}),
                graph_id=graph_id,
            )
            return _node_to_dict(node)

        # ── update_memory ────────────────────────────────────
        elif name == "update_memory":
            kwargs = {}
            if "name" in arguments:
                kwargs["name"] = arguments["name"]
            if "type" in arguments:
                kwargs["type"] = arguments["type"]
            if "properties" in arguments:
                kwargs["properties"] = arguments["properties"]
            node = await graph_service.update_node(
                session, uuid.UUID(arguments["node_id"]), **kwargs
            )
            if node is None:
                return {"error": "Node not found"}
            return _node_to_dict(node)

        # ── delete_memory ────────────────────────────────────
        elif name == "delete_memory":
            ok = await graph_service.delete_node(session, uuid.UUID(arguments["node_id"]))
            return {"deleted": ok}

        # ── create_link ──────────────────────────────────────
        elif name == "create_link":
            graph_id = uuid.UUID(arguments["graph_id"]) if arguments.get("graph_id") else None
            edge = await graph_service.create_edge(
                session,
                source_id=uuid.UUID(arguments["source_id"]),
                target_id=uuid.UUID(arguments["target_id"]),
                type=arguments["type"],
                properties=arguments.get("properties", {}),
                weight=1.0,
                graph_id=graph_id,
            )
            return _edge_to_dict(edge)

        # ── delete_link ──────────────────────────────────────
        elif name == "delete_link":
            ok = await graph_service.delete_edge(session, uuid.UUID(arguments["edge_id"]))
            return {"deleted": ok}

        else:
            return {"error": f"Unknown tool: {name}"}
    finally:
        await session.close()


# ── MCP Protocol (JSON-RPC 2.0 over stdio) ──────────────────

SERVER_INFO = {
    "name": "wng",
    "version": "2.0.0",
}

CAPABILITIES = {
    "tools": {},
}


async def handle_request(request: dict) -> dict:
    """Process a JSON-RPC 2.0 request and return a response."""
    method = request.get("method", "")
    params = request.get("params", {})
    req_id = request.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": CAPABILITIES,
                "serverInfo": SERVER_INFO,
            },
        }

    elif method == "notifications/initialized":
        return None

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": TOOLS},
        }

    elif method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})
        try:
            result = await handle_tool_call(tool_name, arguments)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result, ensure_ascii=False, default=str),
                        }
                    ],
                },
            }
        except Exception as e:
            logger.exception("Tool call failed: %s", tool_name)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": str(e)})},
                    ],
                    "isError": True,
                },
            }

    elif method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Method not found: {method}"},
        }


async def main():
    """Main loop: read JSON-RPC messages from stdin, write responses to stdout."""
    logger.info("WNG MCP server starting...")

    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await asyncio.get_event_loop().connect_read_pipe(lambda: protocol, sys.stdin)

    write_transport, write_protocol = await asyncio.get_event_loop().connect_write_pipe(
        asyncio.streams.FlowControlMixin, sys.stdout
    )
    writer = asyncio.StreamWriter(write_transport, write_protocol, reader, asyncio.get_event_loop())

    buffer = b""

    while True:
        try:
            chunk = await reader.read(65536)
            if not chunk:
                break

            buffer += chunk

            while b"\n" in buffer:
                line, buffer = buffer.split(b"\n", 1)
                line = line.strip()
                if not line:
                    continue

                try:
                    request = json.loads(line)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON: %s", line[:200])
                    continue

                response = await handle_request(request)
                if response is not None:
                    response_bytes = json.dumps(response, ensure_ascii=False, default=str).encode() + b"\n"
                    writer.write(response_bytes)
                    await writer.drain()

        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("Error in main loop")
            break

    logger.info("MCP server shutting down")


if __name__ == "__main__":
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(main())
