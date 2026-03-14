from __future__ import annotations

import logging
from typing import List

from pydantic_settings import BaseSettings
from functools import lru_cache

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/graphviewer"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # Embedding model: "qwen3" | "mock"
    EMBEDDING_MODEL: str = "qwen3"

    # OpenRAG
    OPENRAG_URL: str = "http://localhost:8100"
    OPENRAG_API_KEY: str = ""

    # Limits
    DEFAULT_LIST_LIMIT: int = 10000
    LOG_BUFFER_SIZE: int = 200

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.JWT_SECRET == "change-me-in-production":
        logger.warning(
            "JWT_SECRET is using the default value. "
            "Set JWT_SECRET environment variable for production use."
        )
    return s
