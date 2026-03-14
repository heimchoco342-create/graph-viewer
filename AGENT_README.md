# WNG Agent Guide

이 문서는 AI 에이전트(Claude, GPT 등)가 WNG 지식그래프를 MCP 도구로 활용할 때 참조하는 가이드입니다.

## 개요

WNG는 조직의 지식(사람, 팀, 프로젝트, 기술, 작업, 인프라)을 그래프로 저장하고 검색하는 시스템입니다. 에이전트는 MCP 도구를 통해 이 그래프를 읽고 쓸 수 있습니다.

## MCP 연결

```json
{
  "mcpServers": {
    "wng": {
      "command": "python3",
      "args": ["/path/to/graph-viewer/backend/mcp_server.py"],
      "env": {
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/graphviewer"
      }
    }
  }
}
```

## 도구 목록

### read_memory — 지식 검색

자연어 쿼리로 관련 노드를 검색합니다. 벡터 유사도로 시드 노드를 찾고, 엣지를 따라 3홉까지 재귀 탐색합니다.

```json
{
  "query": "프론트엔드팀 이번주 작업",
  "graph_id": "optional-uuid"
}
```

**반환값**: 관련 노드 목록 (name, type, properties, depth, score)

**활용 팁**:
- score는 쿼리 벡터와의 코사인 유사도 (0~1). 0.7 이상이면 강한 관련, 0.5 이하는 간접 연관
- depth=0은 직접 매칭(시드), depth>0은 엣지를 타고 도달한 노드
- graph_id를 지정하면 특정 그래프 내에서만 검색

### create_memory — 노드 생성

새 지식 노드를 생성합니다. 생성 시 벡터 임베딩이 자동 생성됩니다.

```json
{
  "name": "API 응답 캐시 레이어 추가",
  "type": "task",
  "properties": {
    "team": "백엔드팀",
    "assignee": "김철수",
    "date": "2026-03-14",
    "category": "기능추가",
    "status": "진행중",
    "summary": "Redis 기반 API 응답 캐시 레이어 구현"
  },
  "graph_id": "optional-uuid"
}
```

**노드 타입 가이드**:

| type | 용도 | 주요 properties |
|------|------|----------------|
| `organization` | 회사/조직 | industry, size |
| `team` | 팀/부서 | department |
| `person` | 사람 | role, team, email |
| `project` | 프로젝트 | status, priority |
| `task` | 작업/업무 | team, assignee, date, category, status, summary |
| `tech` | 기술/도구 | category (language/framework/infra/database) |
| `k8s-*` | K8s 리소스 | k8s_kind, k8s_namespace, k8s_labels |

### update_memory — 노드 수정

기존 노드의 이름, 타입, 속성을 수정합니다. 변경 시 임베딩이 자동 재생성됩니다.

```json
{
  "node_id": "uuid",
  "name": "새 이름",
  "properties": { "status": "completed" }
}
```

### delete_memory — 노드 삭제

노드와 해당 노드에 연결된 모든 엣지를 삭제합니다.

```json
{
  "node_id": "uuid"
}
```

### create_link — 관계 생성

두 노드 사이에 관계를 생성합니다.

```json
{
  "source_id": "uuid",
  "target_id": "uuid",
  "type": "assigned_to",
  "graph_id": "optional-uuid"
}
```

**관계 타입 가이드**:

| type | 의미 | 예시 |
|------|------|------|
| `member_of` | 소속 | person → team |
| `assigned_to` | 담당 | task → person |
| `belongs_to` | 귀속 | team → organization |
| `uses` | 사용 | project → tech |
| `depends_on` | 의존 | task → task |
| `works_on` | 참여 | person → project |
| `owns` | 소유 | K8s: Deployment → Pod |
| `selects` | 선택 | K8s: Service → Pod |
| `contains` | 포함 | K8s: Namespace → 리소스 |

### delete_link — 관계 삭제

```json
{
  "edge_id": "uuid"
}
```

## 활용 패턴

### 1. 작업 기록

에이전트가 작업을 완료하면 WNG에 기록:

```
1. create_memory(name="OOM 이슈 해결", type="task", properties={team, assignee, date, status, summary})
2. create_link(source_id=task_id, target_id=assignee_id, type="assigned_to")
3. create_link(source_id=task_id, target_id=project_id, type="belongs_to")
```

### 2. 컨텍스트 조회

작업 전에 관련 지식 조회:

```
1. read_memory(query="주문 API 관련 최근 작업")
   → 관련 task, person, tech 노드 반환
2. 결과의 properties에서 assignee, status, date 등 확인
3. 필요 시 추가 검색: read_memory(query="김철수 담당 작업")
```

### 3. 팀 현황 파악

```
1. read_memory(query="백엔드팀")
   → team 노드 + 연결된 person, task, project 노드
2. task 노드의 status, date로 진행 현황 파악
```

### 4. 기술 스택 탐색

```
1. read_memory(query="FastAPI")
   → tech 노드 + 연결된 project, person 노드
2. 어떤 프로젝트가 어떤 기술을 쓰는지, 누가 담당하는지 파악
```

## 검색 결과 해석

- **score** (0~1): 쿼리와의 코사인 유사도. 스코어링은 노드 임베딩 기준이며, 엣지 메타데이터는 반영하지 않음
- **depth**: 시드(0)에서 엣지를 몇 홉 타고 도달했는지
- 결과에 시드 노드와 탐색 노드가 혼재. depth=0이 가장 직접적으로 관련된 노드
- 임베딩 모델: Qwen3-Embedding-0.6B (경량). 영어/한국어 모두 지원하나 정밀도에 한계 있음

## 그래프 구조

```
organization ─[belongs_to]─ team ─[member_of]─ person
                              │                   │
                        [works_on]          [assigned_to]
                              │                   │
                           project ──────── task
                              │
                          [uses]
                              │
                            tech
```

## 주의사항

- `graph_id`를 지정하지 않으면 전체 그래프에서 검색/생성됨
- 노드 삭제 시 연결된 엣지가 자동 삭제됨 — 삭제 전 확인 권장
- properties는 자유 형식 JSON이지만, 위 가이드의 키를 사용하면 검색 품질이 향상됨
- 임베딩은 `name + type + properties`를 기반으로 생성되므로, properties에 의미 있는 텍스트를 넣으면 검색이 더 정확해짐
