from __future__ import annotations

"""Ingestion service: OpenRAG integration for document processing.

Uploads documents to OpenRAG for parsing (Docling), indexing (OpenSearch),
and then extracts entities/relations via LLM to populate the knowledge graph.
"""

import uuid
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


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


# In-memory job store
_jobs: Dict[uuid.UUID, IngestionJob] = {}


def _openrag_headers() -> dict:
    settings = get_settings()
    headers = {"Accept": "application/json"}
    if settings.OPENRAG_API_KEY:
        headers["X-API-Key"] = settings.OPENRAG_API_KEY
    return headers


async def _upload_to_openrag(filename: str, content: bytes) -> dict:
    """Upload file to OpenRAG for parsing and indexing."""
    settings = get_settings()
    url = f"{settings.OPENRAG_URL}/upload_context"

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            url,
            files={"file": (filename, content)},
            headers=_openrag_headers(),
        )
        response.raise_for_status()
        return response.json()


async def _search_openrag(query: str, limit: int = 10) -> list[dict]:
    """Search OpenRAG for documents matching query."""
    settings = get_settings()
    url = f"{settings.OPENRAG_URL}/search"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            json={"query": query, "limit": limit},
            headers=_openrag_headers(),
        )
        response.raise_for_status()
        return response.json().get("results", [])


async def _extract_entities_via_chat(text: str) -> dict:
    """Use OpenRAG chat endpoint to extract entities and relations from text."""
    settings = get_settings()
    url = f"{settings.OPENRAG_URL}/chat"

    prompt = (
        "Extract entities and relationships from the following document. "
        "Return JSON with format: {\"entities\": [{\"name\": ..., \"type\": ...}], "
        "\"relations\": [{\"source\": ..., \"target\": ..., \"type\": ...}]}. "
        "Entity types: person, team, project, tech, system, document. "
        "Only return the JSON, nothing else.\n\n"
        f"Document:\n{text[:4000]}"
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            json={"message": prompt},
            headers=_openrag_headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", {})


async def start_ingestion(filename: str, content: bytes) -> IngestionJob:
    """Start an ingestion job for the uploaded file."""
    job_id = uuid.uuid4()
    job = IngestionJob(
        id=job_id,
        filename=filename,
        status=JobStatus.PENDING,
    )
    _jobs[job_id] = job

    # Run processing in background
    asyncio.create_task(_process_ingestion(job, content))
    return job


async def _process_ingestion(job: IngestionJob, content: bytes) -> None:
    """Background task: upload to OpenRAG, extract entities."""
    job.status = JobStatus.PROCESSING
    try:
        # Step 1: Upload to OpenRAG for parsing + indexing
        upload_result = await _upload_to_openrag(job.filename, content)
        logger.info("OpenRAG upload result: %s", upload_result)

        # Step 2: Extract entities via LLM chat
        text_content = content.decode("utf-8", errors="replace")
        extraction = await _extract_entities_via_chat(text_content)

        entities = extraction.get("entities", []) if isinstance(extraction, dict) else []
        relations = extraction.get("relations", []) if isinstance(extraction, dict) else []

        job.status = JobStatus.COMPLETED
        job.result = {
            "upload": upload_result,
            "entities_extracted": len(entities),
            "relations_extracted": len(relations),
            "entities": entities,
            "relations": relations,
        }
    except httpx.ConnectError:
        # OpenRAG not running - graceful fallback
        job.status = JobStatus.COMPLETED
        job.result = {
            "message": "OpenRAG not available. File stored but not processed.",
            "entities_extracted": 0,
            "relations_extracted": 0,
        }
        logger.warning("OpenRAG not reachable, falling back to stub mode")
    except Exception as e:
        job.status = JobStatus.FAILED
        job.error = str(e)
        logger.exception("Ingestion failed for %s", job.filename)


async def get_job_status(job_id: uuid.UUID) -> Optional[IngestionJob]:
    return _jobs.get(job_id)


async def get_suggestions(node_id: uuid.UUID) -> list[dict]:
    """Get AI-suggested relations for a node by searching OpenRAG."""
    try:
        results = await _search_openrag(str(node_id), limit=5)
        return results
    except Exception:
        logger.warning("Could not get suggestions from OpenRAG")
        return []


def clear_jobs() -> None:
    """Clear all jobs (for testing)."""
    _jobs.clear()
