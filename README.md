# WNG (WorksNodeGraph)

전사 지식그래프 플랫폼. 조직의 사람, 팀, 프로젝트, 기술, 인프라를 하나의 그래프로 연결하고, AI 에이전트가 MCP를 통해 읽기/쓰기할 수 있는 작업 레지스트리.

## Architecture

```
Frontend (React + Vite + TypeScript)
  ├── Graph Map (React Flow + Dagre layout)
  ├── Search (keyword + vector similarity)
  ├── BFS/Dijkstra Path Finder
  ├── Node/Edge CRUD
  ├── File Upload
  └── Real-time Log Viewer (WebSocket)
        │ REST API + WebSocket (Vite proxy → :8000)
Backend (FastAPI + Python)
  ├── Graph API (CRUD, Search, Traverse, Path)
  ├── Auth API (JWT)
  ├── Search Service (pgvector + Recursive CTE)
  ├── Embedding Service (Qwen3-Embedding-0.6B, 1024D)
  ├── K8s Connector (YAML → auto nodes + edges)
  ├── Ingestion Service (파일 업로드)
  └── MCP Server (JSON-RPC 2.0 over stdio)
        │
  PostgreSQL + pgvector
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite, TypeScript, React Flow, Zustand, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy 2.0 (async), PostgreSQL + pgvector |
| Embedding | Qwen3-Embedding-0.6B (sentence-transformers, 1024-dim) |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Ingestion | 파일 업로드 + 엔티티 추출 |
| K8s | YAML manifest parser (15 resource types, 7 relationship types) |
| MCP | JSON-RPC 2.0 stdio (6 tools: read/create/update/delete memory + link) |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- (Optional) Qwen3-Embedding-0.6B model for vector search

### Development

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

### Docker Compose

```bash
docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

### Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/graphviewer
JWT_SECRET=your-secret-key          # 필수: 프로덕션에서는 반드시 변경
EMBEDDING_MODEL=qwen3               # qwen3 | mock
DEFAULT_LIST_LIMIT=10000            # API 목록 조회 최대 건수
LOG_BUFFER_SIZE=200                 # WebSocket 로그 버퍼 크기
```

## Features

### Graph Visualization

- React Flow 기반 인터랙티브 2D 그래프
- Dagre 자동 레이아웃 (TB/LR)
- 노드 타입별 색상, 고아 노드 그룹핑
- 포커스 모드: 직접 연결 / 워터폴(상위+하위 트리)
- 서브그래프 JSON 다운로드

### Search

- **벡터 검색**: 쿼리 → Qwen3 임베딩 → pgvector 코사인 유사도로 시드 선택 → Recursive CTE로 N-hop 탐색 → 벡터 유사도 랭킹
- **키워드 검색**: ILIKE 패턴 매칭 (임베딩 미사용 시 폴백)
- 자동 임베딩: 노드 생성/수정 시 벡터 자동 생성, 서버 시작 시 미생성 노드 백필

### Path Finding

- BFS (무가중 최단 경로)
- Dijkstra (가중 최단 경로)

### Kubernetes Import

K8s YAML 매니페스트 업로드 → 15종 리소스 자동 노드화 + 7종 관계 자동 감지:

| 관계 | 감지 방식 |
|------|----------|
| `owns` | ownerReferences (Deployment→RS→Pod) |
| `selects` | Service selector → Pod labels |
| `routes_to` | Ingress rules → Service |
| `mounts` | Pod volumes → ConfigMap/Secret/PVC |
| `scheduled_on` | Pod nodeName → Node |
| `contains` | Namespace → 소속 리소스 |
| `scales` | HPA scaleTargetRef → Deployment |

### Multi-tenancy

- 그래프 네임스페이스: org / group / personal 스코프
- 그룹 계층 구조 (parent_id 자기참조)
- 권한 제어: read / write / admin

### MCP Server

AI 에이전트가 지식그래프를 도구로 활용:

```bash
python3 backend/mcp_server.py
```

**Claude Desktop 설정** (`claude_desktop_config.json`):
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

| Tool | Description |
|------|------------|
| `read_memory` | 자연어로 지식 검색 (벡터 + 재귀 탐색) |
| `create_memory` | 노드 생성 (자동 임베딩) |
| `update_memory` | 노드 수정 (변경 시 임베딩 재생성) |
| `delete_memory` | 노드 삭제 (연결 엣지 자동 삭제) |
| `create_link` | 노드 간 관계 생성 |
| `delete_link` | 관계 삭제 |

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|------------|
| POST | `/api/auth/login` | 로그인 (JWT 발급) |
| POST | `/api/auth/register` | 회원가입 |
| GET | `/api/auth/me` | 현재 사용자 조회 |

### Graph
| Method | Path | Description |
|--------|------|------------|
| GET | `/api/graph/graphs` | 그래프 목록 |
| GET | `/api/graph/graphs/:id` | 그래프 상세 (노드+엣지 포함) |
| GET | `/api/graph/nodes` | 노드 목록 |
| GET | `/api/graph/edges` | 엣지 목록 |
| GET | `/api/graph/search?q=` | 키워드 검색 |
| GET | `/api/graph/traverse?q=` | 벡터 + 재귀 탐색 |
| GET | `/api/graph/embed/status` | 임베딩 현황 |
| POST | `/api/graph/embed` | 미임베딩 노드 일괄 생성 |

### WebSocket
| Path | Description |
|------|------------|
| `WS /ws/logs` | 실시간 백엔드 로그 스트리밍 |

## DB Schema

```
nodes       (id, graph_id, type, name, properties[JSONB], embedding[VECTOR(1024)])
edges       (id, graph_id, source_id, target_id, type, properties[JSONB], weight)
users       (id, email, password_hash, name, role)
graphs      (id, name, owner_id, scope, group_id)
groups      (id, name, parent_id)
group_members    (group_id, user_id, role)
graph_permissions (graph_id, grantee_id, grantee_type, permission)
```

## Testing

```bash
# Frontend (208 tests)
cd frontend && npx vitest run

# Backend
cd backend && .venv/bin/pytest tests/ -v
```

## Project Structure

```
graph-viewer/
├── frontend/src/
│   ├── components/
│   │   ├── graph/       # GraphCanvas, CircleNode, BfsSearchPanel, NodeDetail, EdgeDetail
│   │   ├── search/      # SearchBar
│   │   ├── crud/        # NodeForm, EdgeForm
│   │   ├── ingestion/   # UploadPanel, IngestionStatus
│   │   ├── path/        # PathFinder
│   │   ├── layout/      # AppLayout, Sidebar, Header
│   │   └── ui/          # Button, Input, Select, Modal, Badge, Card, NodeSearchInput
│   ├── constants/       # nodeTypes, navigation
│   ├── store/           # Zustand (auth, graph, search, path, ingestion)
│   ├── api/             # Axios client, search, graph APIs
│   └── pages/           # GraphPage, QueryPage, SearchPage, UploadPage, PathPage, LogPage
├── backend/
│   ├── app/
│   │   ├── models/      # Node, Edge, User, Graph, Group, GroupMember, GraphPermission
│   │   ├── routers/     # viewer (REST API), logs (WebSocket)
│   │   ├── services/    # graph, search, path, ingestion, embedding, k8s_connector, auth, graph_access
│   │   └── config.py    # Settings (pydantic-settings)
│   ├── mcp_server.py    # MCP stdio server (6 tools)
│   ├── scripts/         # seed_test_data, seed_k8s, seed_large, backfill_embeddings
│   └── tests/
└── docker-compose.yml
```
