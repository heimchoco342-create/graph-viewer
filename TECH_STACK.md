# Tech Stack

## Frontend

| Category | Stack | Version | Purpose |
|----------|-------|---------|---------|
| Framework | React | 19 | UI 컴포넌트 |
| Build Tool | Vite | 7 | 번들링, HMR, Dev Server |
| Language | TypeScript | 5.9 | 타입 안전성 |
| Graph Visualization | React Flow (@xyflow/react) | 12 | 인터랙티브 그래프 렌더링 |
| Graph Layout | Dagre (@dagrejs/dagre) | 2 | 계층적 자동 레이아웃 (TB/LR) |
| State Management | Zustand | 5 | 전역 상태 (auth, graph, search, path, ingestion) |
| Routing | React Router | 7 | SPA 라우팅 |
| HTTP Client | Axios | 1 | REST API 통신 |
| CSS | Tailwind CSS | 4 | 유틸리티 기반 스타일링 |
| Testing | Vitest + Testing Library | 4 / 16 | 유닛/컴포넌트 테스트 (156 tests) |
| Linting | ESLint | 9 | 코드 품질 |

## Backend

| Category | Stack | Version | Purpose |
|----------|-------|---------|---------|
| Framework | FastAPI | 0.115+ | REST API 서버 |
| Language | Python | 3.9+ | 백엔드 로직 |
| ASGI Server | Uvicorn | 0.30+ | 비동기 HTTP 서버 |
| ORM | SQLAlchemy (async) | 2.0+ | DB 모델, 비동기 쿼리 |
| Database | PostgreSQL + pgvector | 16 | 그래프 데이터 + 벡터 검색 |
| Migration | Alembic | 1.13+ | DB 스키마 마이그레이션 |
| Auth | python-jose + passlib + bcrypt | - | JWT 토큰 발급/검증, 비밀번호 해싱 |
| Validation | Pydantic | 2.7+ | Request/Response 스키마 |
| K8s Import | PyYAML | 6.0+ | K8s YAML 매니페스트 파싱 |
| Testing | pytest + pytest-asyncio + httpx | 8 / 0.23 / 0.27 | 비동기 API 테스트 (61 tests) |

## Data Ingestion

| Category | Stack | Purpose |
|----------|-------|---------|
| Pipeline | OpenRAG (Langflow) | 문서 파싱 + 엔티티 추출 파이프라인 |
| Document Parser | Docling | PDF/DOCX/HTML → 텍스트 변환 |
| Search Engine | OpenSearch | 2.19 | 전문 검색 + 벡터 인덱스 |
| AI Linking | pgvector cosine similarity | 새 노드 → 기존 노드 자동 관계 추천 |

## AI / MCP Integration

| Category | Stack | Purpose |
|----------|-------|---------|
| Protocol | MCP (JSON-RPC 2.0 over stdio) | AI 에이전트 도구 호출 인터페이스 |
| Tools | 12개 graph tools | create/read/update/delete node/edge, search, path, K8s import |

## Infrastructure

| Category | Stack | Purpose |
|----------|-------|---------|
| Container | Docker Compose | 로컬/프로덕션 배포 |
| DB Image | pgvector/pgvector:pg16 | PostgreSQL + pgvector 확장 |
| Frontend Image | Nginx | 프로덕션 정적 파일 서빙 |

## Dev Tools

| Category | Stack | Purpose |
|----------|-------|---------|
| Package Manager | npm (Frontend), pip (Backend) | 의존성 관리 |
| Git Strategy | Feature branch → main merge | 기능 단위 브랜치, 구현 단위 커밋 |
| Test Coverage | 217 tests (156 frontend + 61 backend) | 전체 테스트 |
