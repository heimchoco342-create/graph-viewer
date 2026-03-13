from __future__ import annotations

"""Ingestion service: OpenRAG integration interface.

Actual OpenRAG API calls are marked as TODO. This module provides
the interface and mock/stub implementations for testing.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class IngestionJob:
    id: uuid.UUID
    filename: str
    status: JobStatus
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    result: Optional[dict] = None
    error: Optional[str] = None


# In-memory job store (replace with DB table in production)
_jobs: dict[uuid.UUID, IngestionJob] = {}


async def start_ingestion(filename: str, content: bytes) -> IngestionJob:
    """Start an ingestion job for the uploaded file.

    TODO: Send file to OpenRAG for:
      1. Docling parsing
      2. Text chunking + OpenSearch vector indexing
      3. LLM entity/relation extraction
    """
    job_id = uuid.uuid4()
    job = IngestionJob(
        id=job_id,
        filename=filename,
        status=JobStatus.PENDING,
    )
    _jobs[job_id] = job

    # TODO: Kick off async OpenRAG processing pipeline
    # For now, immediately mark as completed (stub)
    job.status = JobStatus.COMPLETED
    job.result = {
        "message": "Stub: OpenRAG integration not yet implemented",
        "entities_extracted": 0,
        "relations_extracted": 0,
    }

    return job


async def get_job_status(job_id: uuid.UUID) -> IngestionJob | None:
    return _jobs.get(job_id)


async def get_suggestions(node_id: uuid.UUID) -> list[dict]:
    """Get AI-suggested relations for a node.

    TODO: Query OpenRAG / LLM for relation suggestions
    based on the node's content and existing graph context.
    """
    # Stub implementation
    return []


def clear_jobs() -> None:
    """Clear all jobs (for testing)."""
    _jobs.clear()
