# WNG 기술 스택

## 전체 구성

```
┌─────────────────────────────────────────┐
│  Frontend (React + Vite + TypeScript)   │
│  React Flow · Zustand · Tailwind CSS   │
└──────────────────┬──────────────────────┘
                   │ REST API + WebSocket
┌──────────────────┴──────────────────────┐
│  Backend (FastAPI + Python)             │
│  SQLAlchemy · sentence-transformers     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│  PostgreSQL + pgvector                  │
└─────────────────────────────────────────┘
                   │ MCP (stdio)
┌──────────────────┴──────────────────────┐
│  AI Agent (Claude 등)                   │
└─────────────────────────────────────────┘
```

---

## Frontend

### React 19

**선정 이유**: 컴포넌트 기반 UI 구성, 거대한 생태계, React Flow(그래프 시각화)와의 네이티브 호환. Vue/Svelte 대비 그래프 시각화 라이브러리 선택지가 압도적으로 많음.

### Vite

**선정 이유**: CRA(Create React App)의 대체. ESBuild 기반 HMR로 개발 서버 시작이 즉각적(< 1초). TypeScript, Tailwind CSS, 프록시 설정을 플러그인으로 간단히 처리. Webpack 대비 설정이 최소화됨.

### TypeScript

**선정 이유**: 그래프 데이터 구조(Node, Edge, Graph)의 타입 안전성. API 응답 타입을 프론트엔드에서 강제하여 런타임 에러 방지. 리팩토링 시 영향 범위를 컴파일 타임에 파악 가능.

### React Flow (@xyflow/react)

**선정 이유**: 2D 그래프 시각화의 사실상 표준. 노드/엣지 커스텀 렌더링, 줌/팬, 미니맵, 드래그 등 인터랙션을 기본 제공. D3.js로 직접 구현하면 수주 걸릴 기능을 즉시 사용 가능. 대안인 vis.js, Cytoscape.js 대비 React 생태계 통합이 월등.

### Dagre (@dagrejs/dagre)

**선정 이유**: 방향 그래프의 자동 레이아웃(계층형). 조직→팀→팀원, Deployment→ReplicaSet→Pod 같은 계층 구조를 자동 배치. ELK 레이아웃 대비 번들 크기가 작고 클라이언트 사이드에서 빠르게 동작.

### Zustand

**선정 이유**: 최소한의 보일러플레이트로 전역 상태 관리. Redux 대비 코드량 1/3 수준. 5개 스토어(auth, graph, search, path, ingestion)를 독립적으로 관리하면서도 컴포넌트 간 상태 공유가 자연스러움. Context API만으로는 리렌더링 최적화가 어려운 그래프 데이터에 적합.

### Tailwind CSS v4

**선정 이유**: 유틸리티 클래스 기반 스타일링으로 CSS 파일 없이 빠른 UI 개발. 다크 테마 변수 시스템(`bg-bg-primary`, `text-text-secondary`)을 CSS 변수로 정의하여 일관된 디자인 시스템 구축. styled-components 대비 번들 크기 절감, 런타임 오버헤드 제로.

### Axios

**선정 이유**: fetch API 대비 인터셉터(토큰 자동 첨부, 에러 핸들링), 요청 취소, 타임아웃 설정이 내장. JWT Authorization 헤더 자동 주입을 인터셉터 한 곳에서 처리.

---

## Backend

### FastAPI

**선정 이유**: Python 기반 비동기 웹 프레임워크. Pydantic 모델로 요청/응답 자동 검증, OpenAPI 문서 자동 생성. Django 대비 비동기 I/O가 네이티브이고, Flask 대비 타입 안전성과 자동 문서화가 우수. sentence-transformers(PyTorch)와 같은 Python 생태계에서 ML 모델을 직접 호출 가능.

### SQLAlchemy 2.0 (async)

**선정 이유**: Python ORM의 사실상 표준. 2.0의 async 지원으로 asyncpg와 결합하여 비동기 DB 접근. Alembic과의 마이그레이션 통합. 복잡한 재귀 CTE 쿼리를 `text()` raw SQL로 실행하면서도 세션 관리/트랜잭션은 ORM이 처리.

### asyncpg

**선정 이유**: PostgreSQL 전용 비동기 드라이버. psycopg2 대비 3~5배 빠른 쿼리 실행. SQLAlchemy의 async 엔진과 네이티브 호환. pgvector의 벡터 타입을 바이너리 프로토콜로 효율적으로 전송.

### python-jose + passlib/bcrypt

**선정 이유**: JWT 토큰 생성/검증(python-jose)과 비밀번호 해싱(passlib + bcrypt)의 조합. PyJWT 대비 JWE 지원 등 확장성이 있고, bcrypt는 GPU 브루트포스에 강한 해싱 알고리즘.

---

## Database

### PostgreSQL

**선정 이유**: JSONB(노드 속성 저장), pgvector(벡터 검색), Recursive CTE(그래프 탐색), DISTINCT ON(중복 제거)을 **하나의 DB에서** 모두 처리. 별도의 그래프 DB(Neo4j)나 벡터 DB(Pinecone, Milvus)를 추가하지 않아도 되므로 인프라 복잡도가 최소화됨.

Neo4j를 쓰지 않는 이유: 현재 규모(수백~수천 노드)에서는 PostgreSQL의 Recursive CTE로 충분. Neo4j는 수만 노드 이상에서 index-free adjacency의 이점이 드러나지만, 별도 DB 운영 부담이 생김.

### pgvector

**선정 이유**: PostgreSQL 확장으로 벡터 유사도 검색 지원. Pinecone/Weaviate 같은 전용 벡터 DB 없이 기존 PostgreSQL에 `CREATE EXTENSION vector` 하나로 활성화. `<=>` 연산자로 코사인 거리 계산, IVFFlat/HNSW 인덱스로 대규모 벡터 검색 가속 가능. 그래프 데이터와 벡터 데이터가 같은 DB에 있어 JOIN이 자연스러움.

---

## Embedding

### Qwen3-Embedding-0.6B (sentence-transformers)

**선정 이유**: 1024차원 임베딩, 한국어+영어 지원, 0.6B 파라미터로 로컬 GPU 없이도 CPU에서 구동 가능. OpenAI text-embedding-3 대비 API 비용 제로, 데이터 외부 유출 없음. BGE-M3(1.3B) 대비 메모리 절반으로 경량 서버에서도 운용 가능.

**한계**: 경량 모델 특성상 미세한 의미 차이 구분이 약함 (예: "JWT"와 "FastAPI"의 코사인 유사도가 0.5 수준으로 비교적 근접). 검색 품질을 올리려면 모델 교체가 정도.

**대안 검토**:
| 모델 | 차원 | 파라미터 | 한국어 | 비용 | 비고 |
|------|------|----------|--------|------|------|
| Qwen3-Embedding-0.6B | 1024 | 0.6B | O | 무료 | **현재 사용** |
| BGE-M3 | 1024 | 1.3B | O | 무료 | 품질 우수, 메모리 2배 |
| OpenAI text-embedding-3-large | 3072 | - | O | 유료 | 최고 품질, API 의존 |
| multilingual-e5-large | 1024 | 0.6B | O | 무료 | 다국어 특화 |

---

## 그래프 탐색

### Recursive CTE + pgvector

**선정 이유**: 벡터 유사도로 시드 노드를 선별하고, SQL Recursive CTE로 N-hop 엣지를 따라 탐색하는 **하이브리드 방식**. 별도의 그래프 엔진 없이 PostgreSQL 단일 쿼리로 시드 선택 → 재귀 탐색 → 유사도 랭킹을 한번에 처리.

```sql
WITH RECURSIVE seed_nodes AS (
    -- 벡터 유사도로 시드 5개 선택
    SELECT ... ORDER BY embedding <=> query_vec LIMIT 5
),
traversal AS (
    -- 시드에서 엣지를 따라 max_depth=3까지 재귀 확장
    SELECT ... FROM traversal JOIN edges JOIN nodes WHERE depth < 3
) CYCLE id SET is_cycle USING path
-- 탐색된 모든 노드를 쿼리 벡터 유사도로 최종 랭킹
SELECT DISTINCT ON (id) ... ORDER BY score DESC
```

**대안 검토**:
- Apache AGE: PostgreSQL 위 Cypher 쿼리 → 학습 비용 대비 현재 규모에서 이점 부족
- Neo4j: 별도 DB 운영 → 인프라 복잡도 증가, 현재 규모에서 불필요
- NetworkX (Python): 메모리 그래프 → DB와 동기화 부담, 대규모 데이터에 부적합

---

## MCP (Model Context Protocol)

### JSON-RPC 2.0 over stdio

**선정 이유**: Anthropic의 MCP 표준 프로토콜. Claude Desktop, Claude Code 등 AI 에이전트와 직접 연동. HTTP 서버를 별도로 띄우지 않고 stdin/stdout으로 통신하므로 보안 경계가 명확(로컬 프로세스 간 통신). 6개 도구(read/create/update/delete_memory + create/delete_link)로 그래프 CRUD를 에이전트에 노출.

---

## 인프라

### Docker Compose

**선정 이유**: 개발/스테이징 환경에서 PostgreSQL + Backend + Frontend를 한번에 구성. K8s 배포 전 단계로 적합. 프로덕션에서는 K8s Deployment로 전환 가능(K8s YAML import 기능으로 자체 인프라도 시각화 가능).

---

## 테스트

### Vitest (Frontend, 208 tests)

**선정 이유**: Vite 네이티브 테스트 러너. Jest 호환 API이면서 ESM을 네이티브 지원하여 Vite 프로젝트에서 별도 변환 설정 불필요. jsdom 환경에서 React Testing Library와 결합하여 컴포넌트 테스트.

### Pytest (Backend)

**선정 이유**: Python 테스트의 사실상 표준. pytest-asyncio로 async 테스트, httpx로 FastAPI 통합 테스트. aiosqlite로 테스트용 인메모리 DB 사용하여 PostgreSQL 의존 없이 CI에서 실행 가능.

---

## 버전 요약

| 구분 | 패키지 | 버전 |
|------|--------|------|
| Frontend | React | 19.2 |
| | React Flow (@xyflow/react) | 12.10 |
| | Zustand | 5.0 |
| | Tailwind CSS | 4.2 |
| | Vite | (latest) |
| | TypeScript | 5.x |
| Backend | FastAPI | 0.115+ |
| | SQLAlchemy | 2.0+ |
| | asyncpg | 0.29+ |
| | sentence-transformers | 3.0+ |
| | python-jose | 3.3+ |
| DB | PostgreSQL | 15+ |
| | pgvector | 0.3+ |
| Embedding | Qwen3-Embedding-0.6B | 1024-dim |
