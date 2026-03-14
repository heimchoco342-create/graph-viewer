from __future__ import annotations

import uuid
import asyncio

import pytest
from httpx import AsyncClient

from app.services.ingestion_service import clear_jobs


@pytest.fixture(autouse=True)
def _clear_ingestion_jobs():
    clear_jobs()
    yield
    clear_jobs()


@pytest.mark.asyncio
async def test_upload_file(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/ingestion/upload",
        files={"file": ("test.txt", b"Hello world content", "text/plain")},
    )
    assert resp.status_code == 202
    data = resp.json()
    assert data["filename"] == "test.txt"
    assert data["status"] in ("pending", "processing", "completed")
    assert "job_id" in data


@pytest.mark.asyncio
async def test_get_job_status(auth_client: AsyncClient):
    upload_resp = await auth_client.post(
        "/api/ingestion/upload",
        files={"file": ("doc.pdf", b"PDF content", "application/pdf")},
    )
    job_id = upload_resp.json()["job_id"]

    # Wait briefly for background task to complete (OpenRAG not available -> fast fallback)
    await asyncio.sleep(0.5)

    resp = await auth_client.get(f"/api/ingestion/status/{job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("pending", "processing", "completed")
    assert data["filename"] == "doc.pdf"


@pytest.mark.asyncio
async def test_get_job_status_not_found(auth_client: AsyncClient):
    fake_id = str(uuid.uuid4())
    resp = await auth_client.get(f"/api/ingestion/status/{fake_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_suggestions(auth_client: AsyncClient):
    node = (
        await auth_client.post("/api/graph/nodes", json={"type": "tech", "name": "FastAPI"})
    ).json()

    resp = await auth_client.get(f"/api/ingestion/suggestions/{node['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["node_id"] == node["id"]
    assert isinstance(data["suggestions"], list)


@pytest.mark.asyncio
async def test_upload_requires_auth(client: AsyncClient):
    resp = await client.post(
        "/api/ingestion/upload",
        files={"file": ("test.txt", b"content", "text/plain")},
    )
    assert resp.status_code in (401, 403)
