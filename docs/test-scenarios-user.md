# 사용자 테스트 시나리오

워크스페이스 템플릿 시스템 도입 후 전체 기능 검증용 시나리오.
모든 시나리오는 `curl` 커맨드로 직접 실행 가능하도록 작성.

---

## 사전 조건

```bash
# 1. PostgreSQL 실행 중
pg_isready -h localhost -p 5432

# 2. 백엔드 서버 기동
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

# 3. 프론트엔드 서버 기동
cd frontend && npm run dev

# 4. 환경변수
export BASE=http://localhost:8000
```

---

## TC-01: 회원가입 및 로그인

**목적**: 인증 플로우 정상 동작 확인

### Step 1: 회원가입

```bash
curl -s -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"Test1234!","name":"테스터"}' \
  | jq .
```

**기대 응답** (201):
```json
{
  "access_token": "<JWT_TOKEN>",
  "token_type": "bearer"
}
```

### Step 2: 로그인

```bash
curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"Test1234!"}' \
  | jq .
```

**기대 응답** (200):
```json
{
  "access_token": "<JWT_TOKEN>",
  "token_type": "bearer"
}
```

```bash
# 이후 모든 요청에 사용할 토큰 저장
export TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"Test1234!"}' | jq -r .access_token)
```

### Step 3: 잘못된 비밀번호

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"wrong"}'
```

**기대**: HTTP 401, `{"detail":"Invalid credentials"}`

### Step 4: 인증 필요 엔드포인트 토큰 없이 접근

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" $BASE/api/auth/me
```

**기대**: HTTP 401

### Step 5: 토큰으로 사용자 정보 확인

```bash
curl -s $BASE/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**기대 응답** (200):
```json
{
  "id": "<UUID>",
  "email": "tester@example.com",
  "name": "테스터",
  "created_at": "2026-03-15T..."
}
```

---

## TC-02: 기본 템플릿 시드 확인

**목적**: 서버 기동 시 기본 템플릿 자동 생성 확인

### Step 1: 템플릿 목록 조회

```bash
curl -s $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**기대 응답** (200): 최소 2개 템플릿
```json
[
  {
    "id": "<UUID>",
    "name": "조직관리",
    "description": "조직 구조 및 업무 관리",
    "levels": [
      {"level": 0, "node_type": "user", "label": "사용자", "color": "#6366f1", "badge_color": "#818cf8", "fixed": true},
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true},
      {"level": 2, "node_type": "task", "label": "태스크", "color": "#10b981", "badge_color": "#34d399", "fixed": false},
      {"level": 3, "node_type": "subtask", "label": "서브태스크", "color": "#f59e0b", "badge_color": "#fbbf24", "fixed": false}
    ],
    "edge_rules": [
      {"source_type": "group", "target_type": "user"},
      {"source_type": "group", "target_type": "task"},
      {"source_type": "task", "target_type": "subtask"}
    ]
  },
  {
    "id": "<UUID>",
    "name": "인프라",
    "levels": [
      {"level": 0, "node_type": "user", ...},
      {"level": 1, "node_type": "group", ...},
      {"level": 2, "node_type": "cluster", ...},
      {"level": 3, "node_type": "namespace", ...},
      {"level": 4, "node_type": "workload", ...},
      {"level": 5, "node_type": "pod", ...}
    ]
  }
]
```

**검증**:
- `jq 'length'` → 2 이상
- `jq '.[0].levels | length'` → 4 (조직관리)
- `jq '.[1].levels | length'` → 6 (인프라)
- `jq '.[0].levels[0].fixed'` → `true`
- `jq '.[0].levels[2].fixed'` → `false`

---

## TC-03: 템플릿 생성

**목적**: 커스텀 템플릿 생성

```bash
curl -s -X POST $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "프로젝트 관리",
    "description": "프로젝트 추적용 워크스페이스",
    "levels": [
      {"level": 0, "node_type": "user", "label": "사용자", "color": "#6366f1", "badge_color": "#818cf8", "fixed": true},
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true},
      {"level": 2, "node_type": "project", "label": "프로젝트", "color": "#10b981", "badge_color": "#34d399", "fixed": false},
      {"level": 3, "node_type": "milestone", "label": "마일스톤", "color": "#8b5cf6", "badge_color": "#a78bfa", "fixed": false},
      {"level": 4, "node_type": "issue", "label": "이슈", "color": "#f59e0b", "badge_color": "#fbbf24", "fixed": false}
    ],
    "edge_rules": [
      {"source_type": "group", "target_type": "project"},
      {"source_type": "project", "target_type": "milestone"},
      {"source_type": "milestone", "target_type": "issue"}
    ]
  }' | jq .
```

**기대 응답** (201):
```json
{
  "id": "<NEW_UUID>",
  "name": "프로젝트 관리",
  "levels": [...],
  "edge_rules": [...]
}
```

```bash
# 생성된 템플릿 ID 저장
export TPL_ID=$(curl -s $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="프로젝트 관리") | .id')
echo $TPL_ID
```

---

## TC-04: 템플릿 수정

**목적**: 기존 템플릿의 커스텀 레벨 수정/삭제

### Step 1: L4(issue) label 변경

```bash
curl -s -X PUT $BASE/api/templates/$TPL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "levels": [
      {"level": 0, "node_type": "user", "label": "사용자", "color": "#6366f1", "badge_color": "#818cf8", "fixed": true},
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true},
      {"level": 2, "node_type": "project", "label": "프로젝트", "color": "#10b981", "badge_color": "#34d399", "fixed": false},
      {"level": 3, "node_type": "milestone", "label": "마일스톤", "color": "#8b5cf6", "badge_color": "#a78bfa", "fixed": false},
      {"level": 4, "node_type": "issue", "label": "버그", "color": "#f59e0b", "badge_color": "#fbbf24", "fixed": false}
    ]
  }' | jq '.levels[4].label'
```

**기대**: `"버그"`

### Step 2: L4 삭제 (4개 레벨로 축소)

```bash
curl -s -X PUT $BASE/api/templates/$TPL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "levels": [
      {"level": 0, "node_type": "user", "label": "사용자", "color": "#6366f1", "badge_color": "#818cf8", "fixed": true},
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true},
      {"level": 2, "node_type": "project", "label": "프로젝트", "color": "#10b981", "badge_color": "#34d399", "fixed": false},
      {"level": 3, "node_type": "milestone", "label": "마일스톤", "color": "#8b5cf6", "badge_color": "#a78bfa", "fixed": false}
    ],
    "edge_rules": [
      {"source_type": "group", "target_type": "project"},
      {"source_type": "project", "target_type": "milestone"}
    ]
  }' | jq '.levels | length'
```

**기대**: `4`

---

## TC-05: 템플릿 삭제

**목적**: 템플릿 삭제

```bash
# 삭제
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X DELETE $BASE/api/templates/$TPL_ID \
  -H "Authorization: Bearer $TOKEN"
```

**기대**: HTTP 204 (빈 응답)

```bash
# 삭제 확인 — 해당 ID로 조회 시 404
curl -s -w "\nHTTP_STATUS:%{http_code}\n" $BASE/api/templates/$TPL_ID \
  -H "Authorization: Bearer $TOKEN"
```

**기대**: HTTP 404

---

## TC-06: 템플릿 검증 (백엔드)

**목적**: Pydantic 검증 규칙 동작 확인

### Case 1: L0 없음

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid",
    "levels": [
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true}
    ]
  }'
```

**기대**: HTTP 422 (levels must have at least 2 levels)

### Case 2: L0이 user가 아님

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid",
    "levels": [
      {"level": 0, "node_type": "admin", "label": "관리자", "color": "#000000", "badge_color": "#111111", "fixed": true},
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true}
    ]
  }'
```

**기대**: HTTP 422 (level 0 must be 'user')

### Case 3: L1이 group이 아님

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid",
    "levels": [
      {"level": 0, "node_type": "user", "label": "사용자", "color": "#6366f1", "badge_color": "#818cf8", "fixed": true},
      {"level": 1, "node_type": "team", "label": "팀", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true}
    ]
  }'
```

**기대**: HTTP 422 (level 1 must be 'group')

### Case 4: 불연속 레벨 번호 (0,1,3)

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid",
    "levels": [
      {"level": 0, "node_type": "user", "label": "사용자", "color": "#6366f1", "badge_color": "#818cf8", "fixed": true},
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true},
      {"level": 3, "node_type": "task", "label": "태스크", "color": "#10b981", "badge_color": "#34d399", "fixed": false}
    ]
  }'
```

**기대**: HTTP 422 (levels must be consecutive)

### Case 5: 중복 node_type

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid",
    "levels": [
      {"level": 0, "node_type": "user", "label": "사용자", "color": "#6366f1", "badge_color": "#818cf8", "fixed": true},
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true},
      {"level": 2, "node_type": "user", "label": "또사용자", "color": "#10b981", "badge_color": "#34d399", "fixed": false}
    ]
  }'
```

**기대**: HTTP 422 (duplicate node_type)

### Case 6: edge_rules에 없는 타입 참조

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid",
    "levels": [
      {"level": 0, "node_type": "user", "label": "사용자", "color": "#6366f1", "badge_color": "#818cf8", "fixed": true},
      {"level": 1, "node_type": "group", "label": "그룹", "color": "#3b82f6", "badge_color": "#60a5fa", "fixed": true}
    ],
    "edge_rules": [
      {"source_type": "group", "target_type": "nonexistent"}
    ]
  }'
```

**기대**: HTTP 422 (invalid source/target type)

---

## TC-07: 그래프 목록 및 상세 조회

**목적**: 그래프 API 기본 동작

### Step 1: 그래프 목록

```bash
curl -s $BASE/api/graph/graphs \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:3]'
```

**기대**: 그래프 배열 (각 항목에 `id`, `name`, `scope`, `template_id`)

### Step 2: 특정 그래프 상세 (노드+엣지 포함)

```bash
export GRAPH_ID=$(curl -s $BASE/api/graph/graphs \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

curl -s $BASE/api/graph/graphs/$GRAPH_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{
    graph_name: .graph.name,
    node_count: (.nodes | length),
    edge_count: (.edges | length)
  }'
```

**기대**: `graph_name`, `node_count > 0`, `edge_count > 0`

---

## TC-08: 노드 목록 조회

**목적**: 노드 API 동작

```bash
curl -s $BASE/api/graph/nodes \
  -H "Authorization: Bearer $TOKEN" | jq '[.[:3][] | {id, name, type}]'
```

**기대**: 노드 배열, 각 항목에 `id`(UUID), `name`, `type` 필드 포함

---

## TC-09: 엣지 목록 조회

**목적**: 엣지 API 동작

```bash
curl -s $BASE/api/graph/edges \
  -H "Authorization: Bearer $TOKEN" | jq '[.[:3][] | {id, source_id, target_id, type}]'
```

**기대**: 엣지 배열, 각 항목에 `id`, `source_id`, `target_id`, `type` 필드 포함

---

## TC-10: 벡터 검색 (traverse)

**목적**: 자연어 기반 벡터 유사도 검색 + 1-hop 확장

### Step 1: 기본 검색

```bash
curl -s "$BASE/api/graph/traverse?q=백엔드+개발" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    query, seed_count, total_traversed,
    results: [.results[:5][] | {name, type, depth, score}]
  }'
```

**기대 응답**:
```json
{
  "query": "백엔드 개발",
  "seed_count": 3,
  "total_traversed": 8,
  "results": [
    {"name": "...", "type": "...", "depth": 0, "score": 0.85},
    {"name": "...", "type": "...", "depth": 0, "score": 0.72},
    {"name": "...", "type": "...", "depth": 1, "score": 0.65}
  ]
}
```

**검증**:
- `seed_count >= 1`
- depth=0 결과 존재 (벡터 유사도 시드)
- depth=1 결과 존재 (1-hop 엣지 확장)
- score 내림차순 정렬

### Step 2: 특정 그래프 한정 검색

```bash
curl -s "$BASE/api/graph/traverse?q=작업&graph_id=$GRAPH_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.seed_count'
```

**기대**: 해당 그래프 내 노드만 반환

### Step 3: 검색 결과 없음

```bash
curl -s "$BASE/api/graph/traverse?q=xyzzy_nonexistent_1234" \
  -H "Authorization: Bearer $TOKEN" | jq '{seed_count, results_count: (.results | length)}'
```

**기대**: `{"seed_count": 0, "results_count": 0}`

---

## TC-11: 키워드 검색

**목적**: ILIKE 기반 노드 검색

```bash
curl -s "$BASE/api/graph/search?q=task" \
  -H "Authorization: Bearer $TOKEN" | jq '{total, first_3: [.nodes[:3][] | {name, type}]}'
```

**기대**: `total >= 1`, 검색어에 ILIKE 매칭되는 노드 반환

```bash
# 대소문자 무관 확인
curl -s "$BASE/api/graph/search?q=TASK" \
  -H "Authorization: Bearer $TOKEN" | jq '.total'
```

**기대**: 위와 동일한 `total` 값 (ILIKE)

---

## TC-12: 임베딩 상태 확인 및 백필

**목적**: 벡터 임베딩 상태 확인 및 백필 실행

### Step 1: 임베딩 상태 확인

```bash
curl -s $BASE/api/graph/embed/status \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**기대 응답**:
```json
{
  "total": 50,
  "embedded": 45,
  "pending": 5,
  "has_embedding_column": true
}
```

### Step 2: 임베딩 백필 실행

```bash
curl -s -X POST $BASE/api/graph/embed \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**기대 응답**: `{"embedded": 5}` (pending 노드 수)

### Step 3: 백필 후 상태 확인

```bash
curl -s $BASE/api/graph/embed/status \
  -H "Authorization: Bearer $TOKEN" | jq '.pending'
```

**기대**: `0`

---

## TC-13: 헬스체크

**목적**: 서버 상태 확인

```bash
curl -s $BASE/health | jq .
```

**기대**: `{"status": "ok"}`

---

## TC-14: WebSocket 로그 (수동 확인)

**목적**: 실시간 로그 스트리밍

```bash
# websocat 또는 wscat 필요
# websocat 사용 예:
websocat ws://localhost:8000/ws/logs
```

**검증**:
1. 연결 즉시 기존 버퍼된 로그 수신
2. 다른 터미널에서 API 호출 시 실시간 로그 출력
3. 로그 형식: `HH:MM:SS LEVEL   [module] message`

---

## TC-15: 엔드투엔드 — 노드 생성 → 검색 → 삭제

**목적**: CRUD + 검색 통합 플로우

### Step 1: MCP create_memory로 노드 생성 (또는 직접 DB)

```bash
# traverse로 생성된 노드 검색 가능한지 확인하기 위해
# 기존 노드 중 하나를 검색
curl -s "$BASE/api/graph/traverse?q=개발팀" \
  -H "Authorization: Bearer $TOKEN" | jq '.results[:3][] | {name, type, depth, score}'
```

### Step 2: 검색 결과의 연결 확인

```bash
# seed 노드의 1-hop 이웃 확인
curl -s "$BASE/api/graph/traverse?q=개발팀" \
  -H "Authorization: Bearer $TOKEN" | jq '[.results[] | select(.depth==1)] | length'
```

**기대**: `>= 1` (1-hop 이웃 존재)

---

## TC-16: 접근 권한 분리

**목적**: 그래프 스코프 기반 접근 제어

### Step 1: 두 번째 사용자 생성

```bash
curl -s -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com","password":"Test1234!","name":"사용자2"}'

export TOKEN2=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com","password":"Test1234!"}' | jq -r .access_token)
```

### Step 2: 각 사용자의 그래프 목록 비교

```bash
# 사용자1 그래프 목록
curl -s $BASE/api/graph/graphs \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | .name]'

# 사용자2 그래프 목록
curl -s $BASE/api/graph/graphs \
  -H "Authorization: Bearer $TOKEN2" | jq '[.[] | .name]'
```

**기대**: org 스코프 그래프는 양쪽 모두 보이고, personal 스코프 그래프는 소유자만 보임
