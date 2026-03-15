# MCP 에이전트 테스트 시나리오

WNG MCP 서버를 사용하는 AI 에이전트의 동작 검증 시나리오.

---

## 사전 조건

- PostgreSQL + 백엔드 서버 실행 중
- MCP 서버 설정 완료 (`claude_desktop_config.json`)
- `DATABASE_URL` 환경변수 설정

```json
{
  "mcpServers": {
    "wng": {
      "command": "python3",
      "args": ["/path/to/backend/mcp_server.py"],
      "env": {
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/graphviewer"
      }
    }
  }
}
```

---

## AS-01: 메모리 생성 (create_memory)

**목적**: 에이전트가 대화 중 학습한 정보를 노드로 저장

### 시나리오: 새 팀원 온보딩 정보 기록

```
사용자: "김영수는 백엔드팀 신규 입사자야. Go와 PostgreSQL을 잘 써."
```

**에이전트 동작:**

```json
// Step 1: 팀원 노드 생성
{"method": "tools/call", "params": {"name": "create_memory", "arguments": {
  "name": "김영수",
  "type": "person",
  "properties": {
    "team": "백엔드팀",
    "role": "신규 입사자",
    "skills": "Go, PostgreSQL",
    "onboarding_date": "2026-03-15"
  }
}}}
// → 기대: node_id 반환, 자동 임베딩 생성
```

**검증 포인트:**
- [ ] 노드 생성 성공 (node_id UUID 반환)
- [ ] properties에 모든 속성 저장
- [ ] 프론트엔드 그래프 페이지에서 새 노드 확인 가능
- [ ] 임베딩 자동 생성 (`/api/graph/embed/status` 확인)

---

## AS-02: 메모리 연결 (create_link)

**목적**: 에이전트가 노드 간 관계를 엣지로 연결

### 시나리오: 팀원-팀, 팀원-작업 연결

```
사용자: "김영수를 백엔드팀에 배정하고, API 리팩토링 작업 담당시켜."
```

**에이전트 동작:**

```json
// Step 1: 백엔드팀 노드 검색
{"method": "tools/call", "params": {"name": "read_memory", "arguments": {
  "query": "백엔드팀"
}}}
// → 기대: 백엔드팀 group 노드 반환

// Step 2: 팀-팀원 연결
{"method": "tools/call", "params": {"name": "create_link", "arguments": {
  "source_id": "<백엔드팀_id>",
  "target_id": "<김영수_id>",
  "type": "member_of"
}}}

// Step 3: 작업 노드 생성
{"method": "tools/call", "params": {"name": "create_memory", "arguments": {
  "name": "API 리팩토링",
  "type": "task",
  "properties": {
    "assignee": "김영수",
    "status": "in_progress",
    "priority": "high"
  }
}}}

// Step 4: 팀원-작업 연결
{"method": "tools/call", "params": {"name": "create_link", "arguments": {
  "source_id": "<김영수_id>",
  "target_id": "<API_리팩토링_id>",
  "type": "works_on"
}}}
```

**검증 포인트:**
- [ ] 2개 엣지 생성 성공
- [ ] 그래프에서 김영수 → 백엔드팀, 김영수 → API 리팩토링 연결 확인
- [ ] read_memory로 "김영수" 검색 시 연결된 노드도 함께 반환 (depth=1)

---

## AS-03: 컨텍스트 검색 (read_memory)

**목적**: 에이전트가 자연어로 관련 정보를 검색

### 시나리오: 사용자 질문에 답하기 위해 컨텍스트 수집

```
사용자: "프론트엔드팀이 이번 주에 무슨 작업 중이야?"
```

**에이전트 동작:**

```json
{"method": "tools/call", "params": {"name": "read_memory", "arguments": {
  "query": "프론트엔드팀 이번 주 작업"
}}}
```

**기대 결과:**
```json
{
  "query": "프론트엔드팀 이번 주 작업",
  "seed_count": 5,
  "total_traversed": 12,
  "results": [
    {"name": "프론트엔드팀", "type": "group", "depth": 0, "score": 0.85},
    {"name": "로그인 리디자인", "type": "task", "depth": 0, "score": 0.78},
    {"name": "대시보드 개선", "type": "task", "depth": 1, "score": 0.65},
    {"name": "박민수", "type": "person", "depth": 1, "score": 0.52}
  ]
}
```

**검증 포인트:**
- [ ] depth=0: 벡터 유사도로 직접 매칭된 노드
- [ ] depth=1: 1-hop 엣지 확장으로 도달한 연결 노드
- [ ] score 내림차순 정렬
- [ ] 프론트엔드팀 관련 task/person 노드가 결과에 포함

---

## AS-04: 스코프 제한 검색 (user_id 기반)

**목적**: 특정 사용자가 접근 가능한 그래프 범위 내에서만 검색

### 시나리오: 사용자별 권한 분리

```json
// user_id로 스코프 제한 검색
{"method": "tools/call", "params": {"name": "read_memory", "arguments": {
  "query": "작업 현황",
  "user_id": "<user_uuid>"
}}}
```

**검증 포인트:**
- [ ] user_id의 소유 그래프 + 소속 그룹 그래프만 검색 대상
- [ ] 다른 사용자의 비공개 그래프 노드는 결과에 미포함
- [ ] user_id 없으면 전체 그래프 검색

---

## AS-05: graph_id 제한 검색

**목적**: 특정 그래프 내에서만 검색

### 시나리오: K8s 클러스터 그래프에서만 검색

```json
{"method": "tools/call", "params": {"name": "read_memory", "arguments": {
  "query": "nginx pod",
  "graph_id": "<k8s_graph_uuid>"
}}}
```

**검증 포인트:**
- [ ] 지정한 graph_id 내 노드만 결과 반환
- [ ] 다른 그래프(조직관리 등)의 노드 미포함

---

## AS-06: 메모리 수정 (update_memory)

**목적**: 기존 노드의 속성/상태 업데이트

### 시나리오: 작업 상태 변경

```
사용자: "API 리팩토링 작업 완료됐어. PR #42로 머지했어."
```

**에이전트 동작:**

```json
// Step 1: 작업 검색
{"method": "tools/call", "params": {"name": "read_memory", "arguments": {
  "query": "API 리팩토링"
}}}

// Step 2: 상태 업데이트
{"method": "tools/call", "params": {"name": "update_memory", "arguments": {
  "node_id": "<task_id>",
  "properties": {
    "assignee": "김영수",
    "status": "completed",
    "priority": "high",
    "completed_date": "2026-03-15",
    "pr_number": "#42",
    "summary": "API 엔드포인트 리팩토링 완료, PR #42 머지"
  }
}}}
```

**검증 포인트:**
- [ ] properties 전체 교체 (기존 속성 유지하려면 merge해서 전달)
- [ ] updated_at 타임스탬프 갱신
- [ ] 임베딩 재생성 (새 속성 반영)
- [ ] 이후 검색 시 갱신된 정보로 매칭

---

## AS-07: 메모리 삭제 (delete_memory)

**목적**: 더 이상 필요 없는 노드 삭제

### 시나리오: 취소된 작업 정리

```
사용자: "레거시 마이그레이션 작업은 취소됐어. 삭제해줘."
```

**에이전트 동작:**

```json
// Step 1: 작업 검색
{"method": "tools/call", "params": {"name": "read_memory", "arguments": {
  "query": "레거시 마이그레이션"
}}}

// Step 2: 삭제
{"method": "tools/call", "params": {"name": "delete_memory", "arguments": {
  "node_id": "<task_id>"
}}}
// → 기대: {"deleted": true}
```

**검증 포인트:**
- [ ] 노드 삭제 성공
- [ ] 연결된 엣지도 cascade 삭제
- [ ] 삭제 후 검색 시 해당 노드 미반환

---

## AS-08: 링크 삭제 (delete_link)

**목적**: 잘못된 연결 제거

### 시나리오: 담당자 변경으로 기존 연결 해제

```json
// Step 1: 기존 연결 확인 (read_memory로 관련 정보 확인)
{"method": "tools/call", "params": {"name": "read_memory", "arguments": {
  "query": "김영수 API 리팩토링"
}}}
// → 결과에서 edge_id 확인

// Step 2: 기존 연결 삭제
{"method": "tools/call", "params": {"name": "delete_link", "arguments": {
  "edge_id": "<edge_uuid>"
}}}

// Step 3: 새 담당자 연결
{"method": "tools/call", "params": {"name": "create_link", "arguments": {
  "source_id": "<이영희_id>",
  "target_id": "<API_리팩토링_id>",
  "type": "works_on"
}}}
```

**검증 포인트:**
- [ ] 기존 엣지 삭제 성공
- [ ] 새 엣지 생성 성공
- [ ] 검색 시 새 담당자와의 연결 반영

---

## AS-09: 복합 시나리오 — 프로젝트 추적 워크플로우

**목적**: 에이전트가 여러 도구를 조합하여 완전한 워크플로우 수행

### 시나리오: 새 프로젝트 셋업

```
사용자: "새 프로젝트 '결제 시스템 v2'를 만들어줘.
         백엔드팀 소속이고,
         '결제 API 구현'이랑 '결제 테스트 작성' 작업이 있어.
         김영수가 API, 이영희가 테스트 담당이야."
```

**에이전트 동작 (순서):**

```json
// 1. 프로젝트 노드 생성
create_memory: {name: "결제 시스템 v2", type: "project", properties: {team: "백엔드팀", status: "planning"}}

// 2. 작업 노드 2개 생성
create_memory: {name: "결제 API 구현", type: "task", properties: {project: "결제 시스템 v2", assignee: "김영수", status: "todo"}}
create_memory: {name: "결제 테스트 작성", type: "task", properties: {project: "결제 시스템 v2", assignee: "이영희", status: "todo"}}

// 3. 기존 노드 검색 (백엔드팀, 김영수, 이영희)
read_memory: {query: "백엔드팀"}
read_memory: {query: "김영수"}
read_memory: {query: "이영희"}

// 4. 연결 생성
create_link: {source: 백엔드팀, target: 결제시스템v2, type: "owns"}
create_link: {source: 결제시스템v2, target: 결제API구현, type: "contains"}
create_link: {source: 결제시스템v2, target: 결제테스트작성, type: "contains"}
create_link: {source: 김영수, target: 결제API구현, type: "works_on"}
create_link: {source: 이영희, target: 결제테스트작성, type: "works_on"}
```

**검증 포인트:**
- [ ] 3개 노드 생성 (project 1, task 2)
- [ ] 5개 엣지 생성
- [ ] `read_memory("결제 시스템 v2")` → project + 관련 task + 담당자 반환
- [ ] `read_memory("김영수 작업")` → 결제 API 구현 포함
- [ ] 그래프 페이지에서 연결 구조 시각 확인

---

## AS-10: 에러 케이스

**목적**: 잘못된 입력에 대한 에이전트 오류 처리

| 케이스 | 입력 | 기대 결과 |
|--------|------|-----------|
| 존재하지 않는 node_id 수정 | `update_memory({node_id: "00000000-..."})` | `{"error": "Node not found"}` |
| 존재하지 않는 node_id 삭제 | `delete_memory({node_id: "00000000-..."})` | `{"deleted": false}` |
| 잘못된 UUID 형식 | `create_link({source_id: "not-a-uuid"})` | 에러 응답 (isError: true) |
| 필수 파라미터 누락 | `create_memory({name: "test"})` (type 없음) | 에러 응답 |
| 빈 query 검색 | `read_memory({query: ""})` | 빈 결과 또는 에러 |

---

## AS-11: 대량 데이터 성능

**목적**: 노드 수 증가에 따른 검색 성능 확인

| 케이스 | 조건 | 기대 |
|--------|------|------|
| 시드 데이터 검색 | ~230 노드 | < 1초 응답 |
| 100개 노드 일괄 생성 후 검색 | ~330 노드 | < 2초 응답 |
| 임베딩 백필 | 100개 미임베딩 노드 | 30초 이내 완료 |

---

## AS-12: 멀티턴 대화 시나리오

**목적**: 에이전트가 여러 턴에 걸쳐 지식그래프를 활용하는 흐름

### 턴 1: 컨텍스트 수집

```
사용자: "백엔드팀 현황 알려줘."
에이전트: read_memory("백엔드팀 현황") → 팀원, 진행중 작업, 프로젝트 정보 반환
에이전트: "백엔드팀에는 김영수, 이영희 등 N명이 있고, 현재 API 리팩토링, 결제 시스템 v2 등 M개 작업이 진행 중입니다."
```

### 턴 2: 추가 정보 기록

```
사용자: "김영수가 Go 마이크로서비스 교육을 수료했어. 기록해줘."
에이전트: read_memory("김영수") → 기존 속성 확인
에이전트: update_memory({node_id: ..., properties: {...기존, training: "Go 마이크로서비스 교육 수료 (2026-03-15)"}})
에이전트: "김영수님의 교육 수료 이력을 기록했습니다."
```

### 턴 3: 관련 정보 활용

```
사용자: "Go 잘 쓰는 사람 누가 있어?"
에이전트: read_memory("Go 개발 경험") → 김영수(skills: Go), 다른 멤버 등 반환
에이전트: "김영수님이 Go와 PostgreSQL 경험이 있고, 최근 Go 마이크로서비스 교육도 수료했습니다."
```

**검증 포인트:**
- [ ] 턴 1의 read_memory 결과가 정확한 팀 현황 반영
- [ ] 턴 2에서 update한 정보가 임베딩에 반영
- [ ] 턴 3에서 업데이트된 속성이 벡터 검색 결과에 반영
