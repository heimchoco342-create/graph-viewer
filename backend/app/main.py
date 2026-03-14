from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, graph, path, ingestion, k8s

settings = get_settings()

app = FastAPI(title="Graph Viewer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(graph.router)
app.include_router(path.router)
app.include_router(ingestion.router)
app.include_router(k8s.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
