from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, ForeignKey, String, DateTime, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

# pgvector Vector type — gracefully degrade for SQLite tests
try:
    from pgvector.sqlalchemy import Vector

    EMBEDDING_DIM = 1024  # Qwen3-Embedding-0.6B
    _embedding_column = Column("embedding", Vector(EMBEDDING_DIM), nullable=True)
except ImportError:
    _embedding_column = None


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    graph_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("graphs.id", ondelete="CASCADE"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    properties: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# Attach embedding column only when pgvector is available
if _embedding_column is not None:
    Node.__table__.append_column(_embedding_column)
