"""Tests for the embedding service."""
from __future__ import annotations

import pytest

from app.services.embedding import MockEmbeddingService


@pytest.fixture
def embed_svc():
    return MockEmbeddingService()


@pytest.mark.asyncio
async def test_embed_returns_correct_dimension(embed_svc):
    vec = await embed_svc.embed("hello world")
    assert len(vec) == embed_svc.dimension()
    assert embed_svc.dimension() == 1024


@pytest.mark.asyncio
async def test_embed_is_normalized(embed_svc):
    import numpy as np
    vec = await embed_svc.embed("test text")
    norm = np.linalg.norm(vec)
    assert abs(norm - 1.0) < 1e-5


@pytest.mark.asyncio
async def test_embed_is_deterministic(embed_svc):
    vec1 = await embed_svc.embed("same text")
    vec2 = await embed_svc.embed("same text")
    assert vec1 == vec2


@pytest.mark.asyncio
async def test_embed_different_texts_differ(embed_svc):
    vec1 = await embed_svc.embed("text one")
    vec2 = await embed_svc.embed("text two")
    assert vec1 != vec2


@pytest.mark.asyncio
async def test_embed_batch(embed_svc):
    texts = ["hello", "world", "foo"]
    vecs = await embed_svc.embed_batch(texts)
    assert len(vecs) == 3
    for vec in vecs:
        assert len(vec) == 1024
