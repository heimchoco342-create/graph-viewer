# WNG (WorksNodeGraph)

Interactive knowledge graph visualization and management tool. Supports organizational entities (person, team, project, tech, system, document) and **Kubernetes resources** (Pod, Service, Deployment, DaemonSet, StatefulSet, ConfigMap, Secret, Ingress, Namespace, Node, PVC, CronJob, Job, ReplicaSet, HPA).

## Architecture

```
Frontend (React + Vite + TypeScript)
  ├── Graph Canvas (React Flow, circle nodes with type-based colors)
  ├── Search Bar (keyword + trigram)
  ├── CRUD Panel (nodes/edges)
  ├── Upload Panel (document ingestion via OpenRAG)
  ├── Path Finder (BFS/Dijkstra)
  └── Auth (JWT login/register)
        │ REST API (Vite proxy → :8000)
Backend (FastAPI + Python)
  ├── Graph API (CRUD, Search, Path)
  ├── Auth API (JWT, python-jose + passlib)
  ├── Ingestion Service (OpenRAG: Docling parsing + LLM entity extraction)
  ├── K8s Connector (YAML import → auto nodes + auto edges)
  ├── AI Linker (pgvector cosine similarity)
  └── MCP Server (JSON-RPC 2.0 over stdio, 12 tools)
        │
  PostgreSQL (pgvector) + OpenRAG (OpenSearch + Docling)
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite, TypeScript, React Flow, Zustand, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy (async), PostgreSQL + pgvector |
| Auth | JWT (python-jose + passlib + bcrypt) |
| Ingestion | OpenRAG (Langflow + OpenSearch 2.19 + Docling) |
| K8s | YAML manifest parser with auto relationship detection |
| MCP | JSON-RPC 2.0 stdio server (12 graph tools) |
| Infra | Docker Compose |

## Quick Start

### Development (local)

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173
```

### Docker Compose (full stack)

```bash
docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# OpenRAG:  http://localhost:8100
```

## Kubernetes Import

Upload a K8s YAML manifest via the API or MCP to automatically create graph nodes and relationship edges:

```bash
# Via REST API
curl -X POST http://localhost:8000/api/k8s/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@cluster.yaml"
```

**Auto-detected relationships:**

| Relationship | Source |
|-------------|--------|
| `owns` | ownerReferences (Deployment→RS→Pod, CronJob→Job→Pod, etc.) |
| `selects` | Service selector → Pod labels |
| `routes_to` | Ingress rules → Service backends |
| `mounts` | Pod volumes → ConfigMap/Secret/PVC |
| `scheduled_on` | Pod spec.nodeName → Node |
| `contains` | Namespace → all namespace-scoped resources |
| `scales` | HPA scaleTargetRef → Deployment |

## MCP Server

Expose the graph as tools for AI agents via the Model Context Protocol:

```bash
python3 backend/mcp_server.py
```

**Claude Desktop config** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "wng": {
      "command": "python3",
      "args": ["/path/to/wng/backend/mcp_server.py"],
      "env": {
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/graphviewer"
      }
    }
  }
}
```

**Available tools (12):**

| Tool | Description |
|------|------------|
| `create_node` | Create a node (any type including K8s) |
| `get_node` | Get node by ID |
| `list_nodes` | List/filter nodes |
| `update_node` | Update node properties |
| `delete_node` | Delete a node |
| `create_edge` | Create relationship edge |
| `list_edges` | List all edges |
| `delete_edge` | Delete an edge |
| `search_nodes` | Keyword search |
| `find_path` | Shortest path (BFS/Dijkstra) |
| `get_node_relations` | All edges for a node |
| `import_k8s_yaml` | Import K8s manifest with auto-relationship detection |

## Testing

```bash
# Backend (61 tests)
cd backend && .venv/bin/pytest tests/ -v

# Frontend (152 tests)
cd frontend && npx vitest run
```

## Project Structure

```
wng/
├── frontend/src/
│   ├── components/
│   │   ├── graph/       # GraphCanvas, CircleNode, NodeDetail, EdgeDetail
│   │   ├── search/      # SearchBar
│   │   ├── crud/        # NodeForm (grouped types), EdgeForm
│   │   ├── ingestion/   # UploadPanel, IngestionStatus
│   │   ├── path/        # PathFinder
│   │   ├── auth/        # LoginPage, RegisterPage
│   │   ├── layout/      # AppLayout, Sidebar, Header
│   │   └── ui/          # Button, Input, Select (optgroup), Modal, Badge, Card
│   ├── constants/       # nodeTypes (Organization + K8s groups, colors)
│   ├── store/           # Zustand (auth, graph, search, path, ingestion)
│   ├── api/             # Axios client + API modules
│   └── pages/           # GraphPage, SearchPage, UploadPage, PathPage
├── backend/
│   ├── app/
│   │   ├── models/      # Node, Edge, User (SQLAlchemy)
│   │   ├── routers/     # auth, graph, path, ingestion, k8s
│   │   ├── services/    # graph, path, ingestion, ai_linker, k8s_connector
│   │   └── schemas/     # Pydantic request/response models
│   ├── mcp_server.py    # MCP stdio server
│   └── tests/
│       ├── fixtures/    # complex_k8s_cluster.yaml (40+ resources)
│       └── test_*.py    # 61 tests
└── docker-compose.yml   # PostgreSQL + Backend + OpenSearch + OpenRAG + Frontend
```
