#!/usr/bin/env python3
"""MCP (Model Context Protocol) server for WNG.

Exposes graph CRUD, search, path-finding, and K8s import as MCP tools.
Communicates via JSON-RPC 2.0 over stdio.

Usage:
    python mcp_server.py

Configure in Claude Desktop / claude_desktop_config.json:
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
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("mcp-wng")

# ── Tool definitions ─────────────────────────────────────────

TOOLS = [
    {
        "name": "create_node",
        "description": "Create a new node in the knowledge graph. Supports types: person, team, project, tech, system, document, and Kubernetes types (k8s-pod, k8s-service, k8s-deployment, k8s-daemonset, k8s-statefulset, k8s-configmap, k8s-secret, k8s-ingress, k8s-namespace, k8s-node, k8s-pvc, k8s-cronjob, k8s-job, k8s-replicaset, k8s-hpa).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name of the node"},
                "type": {"type": "string", "description": "Node type (e.g. person, team, k8s-pod, k8s-deployment)"},
                "properties": {
                    "type": "object",
                    "description": "Additional properties as key-value pairs",
                    "default": {},
                },
            },
            "required": ["name", "type"],
        },
    },
    {
        "name": "get_node",
        "description": "Get a node by its ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "UUID of the node"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "list_nodes",
        "description": "List all nodes in the graph, optionally filtered by type.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "type_filter": {"type": "string", "description": "Filter by node type (optional)"},
                "limit": {"type": "integer", "description": "Max results (default 100)", "default": 100},
            },
        },
    },
    {
        "name": "update_node",
        "description": "Update an existing node's name, type, or properties.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "UUID of the node to update"},
                "name": {"type": "string", "description": "New name (optional)"},
                "type": {"type": "string", "description": "New type (optional)"},
                "properties": {"type": "object", "description": "New properties (optional)"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "delete_node",
        "description": "Delete a node by its ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "UUID of the node to delete"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "create_edge",
        "description": "Create a directed edge (relationship) between two nodes.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "source_id": {"type": "string", "description": "UUID of the source node"},
                "target_id": {"type": "string", "description": "UUID of the target node"},
                "type": {"type": "string", "description": "Relationship type (e.g. owns, selects, mounts, contains, works_on)"},
                "properties": {"type": "object", "description": "Additional properties", "default": {}},
                "weight": {"type": "number", "description": "Edge weight (default 1.0)", "default": 1.0},
            },
            "required": ["source_id", "target_id", "type"],
        },
    },
    {
        "name": "list_edges",
        "description": "List all edges in the graph.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max results (default 100)", "default": 100},
            },
        },
    },
    {
        "name": "delete_edge",
        "description": "Delete an edge by its ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "edge_id": {"type": "string", "description": "UUID of the edge to delete"},
            },
            "required": ["edge_id"],
        },
    },
    {
        "name": "search_nodes",
        "description": "Search for nodes by name or type keyword.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "limit": {"type": "integer", "description": "Max results (default 20)", "default": 20},
            },
            "required": ["query"],
        },
    },
    {
        "name": "find_path",
        "description": "Find the shortest path between two nodes in the graph.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "source_id": {"type": "string", "description": "UUID of the start node"},
                "target_id": {"type": "string", "description": "UUID of the end node"},
                "weighted": {"type": "boolean", "description": "Use weighted Dijkstra (default false)", "default": False},
            },
            "required": ["source_id", "target_id"],
        },
    },
    {
        "name": "get_node_relations",
        "description": "Get all edges connected to a specific node (both incoming and outgoing).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "UUID of the node"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "import_k8s_yaml",
        "description": "Import Kubernetes resources from a YAML manifest. Automatically creates nodes for all K8s resources and edges for their relationships (ownerReferences, selectors, volume mounts, ingress routes, namespace membership, HPA targets).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "yaml_content": {"type": "string", "description": "Multi-document YAML string with K8s manifests"},
                "namespace_filter": {"type": "string", "description": "Only import resources from this namespace (optional)"},
            },
            "required": ["yaml_content"],
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
            "sqlite+aiosqlite:///./graph_mcp.db",
        )
        _engine = create_async_engine(db_url, echo=False)
        # Create tables if needed
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
    from app.services.path_service import find_path
    from app.services.k8s_connector import import_k8s_yaml
    from sqlalchemy import select, or_
    from app.models.edge import Edge

    session = await _get_session()
    try:
        if name == "create_node":
            node = await graph_service.create_node(
                session,
                type=arguments["type"],
                name=arguments["name"],
                properties=arguments.get("properties", {}),
            )
            return _node_to_dict(node)

        elif name == "get_node":
            node = await graph_service.get_node(session, uuid.UUID(arguments["node_id"]))
            if node is None:
                return {"error": "Node not found"}
            return _node_to_dict(node)

        elif name == "list_nodes":
            nodes = await graph_service.list_nodes(
                session, limit=arguments.get("limit", 100)
            )
            type_filter = arguments.get("type_filter")
            if type_filter:
                nodes = [n for n in nodes if n.type == type_filter]
            return [_node_to_dict(n) for n in nodes]

        elif name == "update_node":
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

        elif name == "delete_node":
            ok = await graph_service.delete_node(session, uuid.UUID(arguments["node_id"]))
            return {"deleted": ok}

        elif name == "create_edge":
            edge = await graph_service.create_edge(
                session,
                source_id=uuid.UUID(arguments["source_id"]),
                target_id=uuid.UUID(arguments["target_id"]),
                type=arguments["type"],
                properties=arguments.get("properties", {}),
                weight=arguments.get("weight", 1.0),
            )
            return _edge_to_dict(edge)

        elif name == "list_edges":
            edges = await graph_service.list_edges(
                session, limit=arguments.get("limit", 100)
            )
            return [_edge_to_dict(e) for e in edges]

        elif name == "delete_edge":
            ok = await graph_service.delete_edge(session, uuid.UUID(arguments["edge_id"]))
            return {"deleted": ok}

        elif name == "search_nodes":
            nodes = await graph_service.search_nodes(
                session,
                arguments["query"],
                limit=arguments.get("limit", 20),
            )
            return [_node_to_dict(n) for n in nodes]

        elif name == "find_path":
            result = await find_path(
                session,
                uuid.UUID(arguments["source_id"]),
                uuid.UUID(arguments["target_id"]),
                weighted=arguments.get("weighted", False),
            )
            if result is None:
                return {"found": False, "nodes": [], "edges": [], "total_weight": 0}
            nodes, edges, total_weight = result
            return {
                "found": True,
                "nodes": [_node_to_dict(n) for n in nodes],
                "edges": [_edge_to_dict(e) for e in edges],
                "total_weight": total_weight,
            }

        elif name == "get_node_relations":
            node_id = uuid.UUID(arguments["node_id"])
            result = await session.execute(
                select(Edge).where(
                    or_(Edge.source_id == node_id, Edge.target_id == node_id)
                )
            )
            edges = list(result.scalars().all())
            return [_edge_to_dict(e) for e in edges]

        elif name == "import_k8s_yaml":
            result = await import_k8s_yaml(
                session,
                arguments["yaml_content"],
                namespace_filter=arguments.get("namespace_filter"),
            )
            return result

        else:
            return {"error": f"Unknown tool: {name}"}
    finally:
        await session.close()


# ── MCP Protocol (JSON-RPC 2.0 over stdio) ──────────────────

SERVER_INFO = {
    "name": "wng",
    "version": "1.0.0",
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
        # No response needed for notifications
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

    # For writing to stdout
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

            # Process complete messages (newline-delimited JSON)
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
    # Add project root to path
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(main())
