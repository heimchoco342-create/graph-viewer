from __future__ import annotations

"""Path-finding service: BFS (unweighted) and Dijkstra (weighted)."""

import heapq
import uuid
from collections import defaultdict, deque

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.edge import Edge
from app.models.node import Node


async def _load_graph(db: AsyncSession) -> tuple[dict, dict]:
    """Load all edges into adjacency lists.

    Returns:
        adjacency: {node_id: [(neighbour_id, edge_id, weight), ...]}
        edge_map:  {edge_id: Edge}
    """
    result = await db.execute(select(Edge))
    edges = list(result.scalars().all())

    adjacency: dict[uuid.UUID, list[tuple[uuid.UUID, uuid.UUID, float]]] = defaultdict(list)
    edge_map: dict[uuid.UUID, Edge] = {}

    for e in edges:
        adjacency[e.source_id].append((e.target_id, e.id, e.weight))
        adjacency[e.target_id].append((e.source_id, e.id, e.weight))
        edge_map[e.id] = e

    return adjacency, edge_map


async def find_path_bfs(
    db: AsyncSession, source_id: uuid.UUID, target_id: uuid.UUID
) -> tuple[list[uuid.UUID], list[uuid.UUID], float] | None:
    """BFS shortest path (unweighted). Returns (node_ids, edge_ids, total_weight) or None."""
    adjacency, edge_map = await _load_graph(db)

    visited: set[uuid.UUID] = {source_id}
    # queue items: (current_node, path_of_node_ids, path_of_edge_ids)
    queue: deque[tuple[uuid.UUID, list[uuid.UUID], list[uuid.UUID]]] = deque()
    queue.append((source_id, [source_id], []))

    while queue:
        current, node_path, edge_path = queue.popleft()
        if current == target_id:
            total_w = sum(edge_map[eid].weight for eid in edge_path)
            return node_path, edge_path, total_w

        for neighbour, edge_id, _w in adjacency.get(current, []):
            if neighbour not in visited:
                visited.add(neighbour)
                queue.append(
                    (neighbour, node_path + [neighbour], edge_path + [edge_id])
                )
    return None


async def find_path_dijkstra(
    db: AsyncSession, source_id: uuid.UUID, target_id: uuid.UUID
) -> tuple[list[uuid.UUID], list[uuid.UUID], float] | None:
    """Dijkstra shortest path (weighted). Returns (node_ids, edge_ids, total_weight) or None."""
    adjacency, edge_map = await _load_graph(db)

    dist: dict[uuid.UUID, float] = {source_id: 0.0}
    prev_node: dict[uuid.UUID, uuid.UUID | None] = {source_id: None}
    prev_edge: dict[uuid.UUID, uuid.UUID | None] = {source_id: None}
    # (distance, node_id)
    heap: list[tuple[float, uuid.UUID]] = [(0.0, source_id)]

    while heap:
        d, current = heapq.heappop(heap)
        if current == target_id:
            # reconstruct
            node_path: list[uuid.UUID] = []
            edge_path: list[uuid.UUID] = []
            c = current
            while c is not None:
                node_path.append(c)
                e = prev_edge.get(c)
                if e is not None:
                    edge_path.append(e)
                c = prev_node.get(c)
            node_path.reverse()
            edge_path.reverse()
            return node_path, edge_path, d

        if d > dist.get(current, float("inf")):
            continue

        for neighbour, edge_id, weight in adjacency.get(current, []):
            new_dist = d + weight
            if new_dist < dist.get(neighbour, float("inf")):
                dist[neighbour] = new_dist
                prev_node[neighbour] = current
                prev_edge[neighbour] = edge_id
                heapq.heappush(heap, (new_dist, neighbour))

    return None


async def find_path(
    db: AsyncSession,
    source_id: uuid.UUID,
    target_id: uuid.UUID,
    weighted: bool = False,
) -> tuple[list[Node], list[Edge], float] | None:
    """High-level path finder returning model objects."""
    if weighted:
        result = await find_path_dijkstra(db, source_id, target_id)
    else:
        result = await find_path_bfs(db, source_id, target_id)

    if result is None:
        return None

    node_ids, edge_ids, total_weight = result

    # Fetch actual model objects
    nodes_result = await db.execute(select(Node).where(Node.id.in_(node_ids)))
    nodes_map = {n.id: n for n in nodes_result.scalars().all()}
    nodes = [nodes_map[nid] for nid in node_ids if nid in nodes_map]

    edges_result = await db.execute(select(Edge).where(Edge.id.in_(edge_ids)))
    edges_map = {e.id: e for e in edges_result.scalars().all()}
    edges = [edges_map[eid] for eid in edge_ids if eid in edges_map]

    return nodes, edges, total_weight
