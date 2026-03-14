"""Abstract embedding service with swappable model implementations.

Default: Qwen3-Embedding-0.6B (CPU, sentence-transformers).
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingService(ABC):
    """Base class for embedding providers."""

    @abstractmethod
    def dimension(self) -> int:
        """Return the embedding vector dimension."""
        ...

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Embed a single text string."""
        ...

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts. Default: sequential calls to embed()."""
        return [await self.embed(t) for t in texts]


class Qwen3EmbeddingService(EmbeddingService):
    """Qwen3-Embedding-0.6B via sentence-transformers (CPU)."""

    MODEL_NAME = "Qwen/Qwen3-Embedding-0.6B"
    _DIMENSION = 1024

    def __init__(self) -> None:
        self._model = None

    def _load_model(self):
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading %s ...", self.MODEL_NAME)
            self._model = SentenceTransformer(self.MODEL_NAME)
            logger.info("Model loaded (dim=%d)", self._DIMENSION)
        except ImportError:
            raise RuntimeError(
                "sentence-transformers is required. Install with: pip install sentence-transformers"
            )

    def dimension(self) -> int:
        return self._DIMENSION

    async def embed(self, text: str) -> list[float]:
        self._load_model()
        vec = self._model.encode(text, normalize_embeddings=True)
        return vec.tolist()

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        self._load_model()
        vecs = self._model.encode(texts, normalize_embeddings=True, batch_size=32)
        return vecs.tolist()


class MockEmbeddingService(EmbeddingService):
    """Deterministic mock for testing — generates consistent vectors from text hash."""

    _DIMENSION = 1024

    def dimension(self) -> int:
        return self._DIMENSION

    async def embed(self, text: str) -> list[float]:
        rng = np.random.RandomState(hash(text) % (2**31))
        vec = rng.randn(self._DIMENSION).astype(np.float32)
        vec = vec / np.linalg.norm(vec)
        return vec.tolist()


# ── Singleton access ──

_instance: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """Return the global embedding service singleton."""
    global _instance
    if _instance is None:
        try:
            _instance = Qwen3EmbeddingService()
        except Exception:
            logger.warning("Failed to init Qwen3, falling back to mock embeddings")
            _instance = MockEmbeddingService()
    return _instance


def set_embedding_service(svc: EmbeddingService) -> None:
    """Override the global embedding service (for testing)."""
    global _instance
    _instance = svc
