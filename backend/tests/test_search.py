"""Tests for the search_graph service (keyword fallback on PostgreSQL)."""
from __future__ import annotations

from unittest.mock import patch, AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.edge import Edge
from app.models.graph import Graph
from app.models.user import User
from app.services.search_service import search_graph, _node_to_text, SearchResponse


@pytest.fixture
async def sample_graph(db_session: AsyncSession):
    """Create a small test graph:
    알파테크(org) → 개발팀(team) → 김철수(person) → FastAPI(tech)
                                  → 이영희(person) → React(tech)
    """
    owner = User(email="search-test@test.com", password_hash="x", name="tester", role="user")
    db_session.add(owner)
    await db_session.flush()

    graph = Graph(name="test-graph", owner_id=owner.id, scope="org")
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


# Mock _has_embedding_column to force keyword fallback path
# (test DB has the column but nodes have no embeddings)
_no_embeddings = patch(
    "app.services.search_service._has_embedding_column",
    new_callable=AsyncMock,
    return_value=False,
)


@pytest.mark.asyncio
async def test_search_finds_seed_by_name(db_session: AsyncSession, sample_graph):
    with _no_embeddings:
        result = await search_graph(db_session, query="김철수", seed_limit=5)
    assert isinstance(result, SearchResponse)
    assert result.seed_count >= 1
    names = [r.name for r in result.results]
    assert "김철수" in names


@pytest.mark.asyncio
async def test_search_finds_seed_by_type(db_session: AsyncSession, sample_graph):
    with _no_embeddings:
        result = await search_graph(db_session, query="person", seed_limit=10)
    names = [r.name for r in result.results]
    assert "김철수" in names
    assert "이영희" in names


@pytest.mark.asyncio
async def test_search_traverses_neighbors(db_session: AsyncSession, sample_graph):
    """Search for '개발팀' should find team members via 1-hop expansion."""
    with _no_embeddings:
        result = await search_graph(db_session, query="개발팀", seed_limit=5)
    names = [r.name for r in result.results]
    assert "개발팀" in names
    assert "김철수" in names or "이영희" in names  # 1-hop neighbors


@pytest.mark.asyncio
async def test_search_no_results(db_session: AsyncSession, sample_graph):
    with _no_embeddings:
        result = await search_graph(db_session, query="존재하지않는노드")
    assert len(result.results) == 0
    assert result.seed_count == 0


@pytest.mark.asyncio
async def test_search_isolated_node(db_session: AsyncSession, sample_graph):
    """Isolated node found as seed but has no neighbors."""
    with _no_embeddings:
        result = await search_graph(db_session, query="고립노드")
    names = [r.name for r in result.results]
    assert "고립노드" in names
    assert result.total_traversed == 1


@pytest.mark.asyncio
async def test_search_result_has_depth(db_session: AsyncSession, sample_graph):
    with _no_embeddings:
        result = await search_graph(db_session, query="알파테크")
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
