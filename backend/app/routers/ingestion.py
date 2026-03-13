from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services import ingestion_service

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
):
    content = await file.read()
    job = await ingestion_service.start_ingestion(file.filename or "unknown", content)
    return {
        "job_id": str(job.id),
        "filename": job.filename,
        "status": job.status.value,
    }


@router.get("/status/{job_id}")
async def get_status(
    job_id: uuid.UUID,
    _user: User = Depends(get_current_user),
):
    job = await ingestion_service.get_job_status(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": str(job.id),
        "filename": job.filename,
        "status": job.status.value,
        "result": job.result,
        "error": job.error,
    }


@router.get("/suggestions/{node_id}")
async def get_suggestions(
    node_id: uuid.UUID,
    _user: User = Depends(get_current_user),
):
    suggestions = await ingestion_service.get_suggestions(node_id)
    return {"node_id": str(node_id), "suggestions": suggestions}
