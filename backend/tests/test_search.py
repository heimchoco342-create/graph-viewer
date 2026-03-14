"""Tests for the search_graph service (keyword fallback path on SQLite)."""
from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.edge import Edge
from app.models.graph import Graph
from app.services.search_service import search_graph, _node_to_text, SearchResponse


@pytest.fixture
async def sample_graph(db_session: AsyncSession):
    """Create a small test graph:
    알파테크(org) → 개발팀(team) → 김철수(person) → FastAPI(tech)
                                  → 이영희(person) → React(tech)
    """
    import uuid

    graph = Graph(name="test-graph", owner_id=uuid.uuid4(), scope="org")
    db_session.add(graph)
    await db_session.flush()

    org = Node(type="organization", name="알파테크", properties={"industry": "SaaS"}, graph_id=graph.id)
    team = Node(type="team", name="개발팀", properties={}, graph_id=graph.id)
    person1 = Node(type="person", name="김철수", properties={"role": "시니어 백엔드"}, graph_id=graph.id)
    person2 = Node(type="person", name="이영희", properties={"role": "프론트엔드"}, graph_id=graph.id)
    tech1 = Node(type="tech", name="FastAPI", properties={"category": "framework"}, graph_id=graph.id)
    tech2 = Node(type="tech", name="React", properties={"category": "framework"}, graph_id=graph.id)
    isolated = Node(type="system", name="고립노드", properties={}, graph_id=graph.id)

    for n in [org, team, person1, person2, tech1, tech2, isolated]:
        db_session.add(n)
    await db_session.flush()

    edges = [
        Edge(source_id=org.id, target_id=team.id, type="has_team", graph_id=graph.id),
        Edge(source_id=team.id, target_id=person1.id, type="has_member", graph_id=graph.id),
        Edge(source_id=team.id, target_id=person2.id, type="has_member", graph_id=graph.id),
        Edge(source_id=person1.id, target_id=tech1.id, type="uses", graph_id=graph.id),
        Edge(source_id=person2.id, target_id=tech2.id, type="uses", graph_id=graph.id),
    ]
    for e in edges:
        db_session.add(e)
    await db_session.commit()

    return {
        "graph": graph,
        "org": org, "team": team,
        "person1": person1, "person2": person2,
        "tech1": tech1, "tech2": tech2,
        "isolated": isolated,
    }


@pytest.mark.asyncio
async def test_search_finds_seed_by_name(db_session: AsyncSession, sample_graph):
    result = await search_graph(db_session, query="김철수", max_depth=0, seed_limit=5)
    assert isinstance(result, SearchResponse)
    assert result.seed_count >= 1
    names = [r.name for r in result.results]
    assert "김철수" in names


@pytest.mark.asyncio
async def test_search_finds_seed_by_type(db_session: AsyncSession, sample_graph):
    result = await search_graph(db_session, query="person", max_depth=0, seed_limit=10)
    names = [r.name for r in result.results]
    assert "김철수" in names
    assert "이영희" in names


@pytest.mark.asyncio
async def test_search_traverses_neighbors(db_session: AsyncSession, sample_graph):
    """Search for '개발팀' with depth=2 should find team members and their tech."""
    result = await search_graph(db_session, query="개발팀", max_depth=2, seed_limit=5)
    names = [r.name for r in result.results]
    assert "개발팀" in names
    assert "김철수" in names or "이영희" in names  # 1-hop
    # 2-hop should include tech nodes
    assert "FastAPI" in names or "React" in names


@pytest.mark.asyncio
async def test_search_respects_max_depth(db_session: AsyncSession, sample_graph):
    """Depth 0 = only seed nodes, no traversal."""
    result = await search_graph(db_session, query="개발팀", max_depth=0, seed_limit=5)
    names = [r.name for r in result.results]
    assert "개발팀" in names
    # Should NOT find tech nodes (2 hops away)
    assert "FastAPI" not in names
    assert "React" not in names


@pytest.mark.asyncio
async def test_search_no_results(db_session: AsyncSession, sample_graph):
    result = await search_graph(db_session, query="존재하지않는노드", max_depth=3)
    assert len(result.results) == 0
    assert result.seed_count == 0


@pytest.mark.asyncio
async def test_search_isolated_node(db_session: AsyncSession, sample_graph):
    """Isolated node found as seed but has no neighbors."""
    result = await search_graph(db_session, query="고립노드", max_depth=3)
    names = [r.name for r in result.results]
    assert "고립노드" in names
    assert result.total_traversed == 1


@pytest.mark.asyncio
async def test_search_result_has_depth(db_session: AsyncSession, sample_graph):
    result = await search_graph(db_session, query="알파테크", max_depth=3)
    depth_map = {r.name: r.depth for r in result.results}
    assert depth_map.get("알파테크") == 0  # seed
    if "개발팀" in depth_map:
        assert depth_map["개발팀"] == 1  # 1-hop


def test_node_to_text():
    text = _node_to_text("김철수", "person", {"role": "시니어", "team": "개발팀"})
    assert "person: 김철수" in text
    assert "role: 시니어" in text
    assert "team: 개발팀" in text


def test_node_to_text_no_properties():
    text = _node_to_text("FastAPI", "tech", None)
    assert text == "tech: FastAPI"
