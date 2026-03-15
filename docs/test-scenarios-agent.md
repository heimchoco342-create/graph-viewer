# MCP 에이전트 테스트 시나리오

WNG MCP 서버를 사용하는 AI 에이전트의 동작 검증 시나리오.
모든 시나리오는 MCP JSON-RPC 2.0 프로토콜 기반으로 실행 가능.

---

## 사전 조건

### MCP 서버 설정

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

### 직접 실행 (디버깅용)

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/graphviewer" \
  .venv/bin/python mcp_server.py
```

stdin으로 JSON-RPC 메시지를 보내고 stdout에서 응답 수신.

### 프로토콜 형식

**요청**:
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "<tool_name>", "arguments": {<args>}}}
```

**응답**:
```json
{"jsonrpc": "2.0", "id": 1, "result": {"content": [{"type": "text", "text": "<JSON_STRING>"}]}}
```

`result.content[0].text`를 JSON 파싱하면 실제 데이터.

---

## AS-01: 초기화 및 도구 목록 확인

**목적**: MCP 프로토콜 핸드셰이크 및 사용 가능 도구 확인

### Step 1: Initialize

```json
→ {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}
```

**기대 응답**:
```json
← {
  "jsonrpc": "2.0", "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {"name": "wng", "version": "2.0.0"},
    "capabilities": {"tools": {}}
  }
}
```

**검증**: `result.serverInfo.name == "wng"`, `result.serverInfo.version == "2.0.0"`

### Step 2: Tools List

```json
→ {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
```

**기대 응답**:
```json
← {
  "jsonrpc": "2.0", "id": 2,
  "result": {
    "tools": [
      {"name": "read_memory", "description": "...", "inputSchema": {...}},
      {"name": "create_memory", "description": "...", "inputSchema": {...}},
      {"name": "update_memory", "description": "...", "inputSchema": {...}},
      {"name": "delete_memory", "description": "...", "inputSchema": {...}},
      {"name": "create_link", "description": "...", "inputSchema": {...}},
      {"name": "delete_link", "description": "...", "inputSchema": {...}}
    ]
  }
}
```

**검증**: 정확히 6개 도구, 이름 집합 = `{read_memory, create_memory, update_memory, delete_memory, create_link, delete_link}`

### Step 3: Ping

```json
→ {"jsonrpc": "2.0", "id": 3, "method": "ping", "params": {}}
← {"jsonrpc": "2.0", "id": 3, "result": {}}
```

---

## AS-02: 메모리 생성 (create_memory)

**목적**: 노드 생성 및 자동 임베딩

### Step 1: person 노드 생성

```json
→ {"jsonrpc": "2.0", "id": 10, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "김영수",
      "type": "person",
      "properties": {
        "team": "백엔드팀",
        "role": "시니어 개발자",
        "skills": "Go, PostgreSQL, Docker",
        "joined": "2026-01-15"
      }
    }
  }}
```

**기대 응답**:
```json
← {"jsonrpc": "2.0", "id": 10, "result": {"content": [{"type": "text", "text": "{\"id\":\"<UUID>\",\"type\":\"person\",\"name\":\"김영수\",\"properties\":{\"team\":\"백엔드팀\",\"role\":\"시니어 개발자\",\"skills\":\"Go, PostgreSQL, Docker\",\"joined\":\"2026-01-15\"},\"created_at\":\"...\",\"updated_at\":\"...\"}"}]}}
```

**검증**:
- `id`가 유효한 UUID
- `type == "person"`, `name == "김영수"`
- `properties.skills == "Go, PostgreSQL, Docker"`
- `created_at` 타임스탬프 존재

```bash
# 저장: 이후 시나리오에서 사용
PERSON_ID=<응답의 id 값>
```

### Step 2: team 노드 생성

```json
→ {"jsonrpc": "2.0", "id": 11, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "백엔드팀",
      "type": "group",
      "properties": {
        "department": "개발부",
        "tech_stack": "Go, Python, PostgreSQL",
        "member_count": "5"
      }
    }
  }}
```

```bash
GROUP_ID=<응답의 id 값>
```

### Step 3: task 노드 생성

```json
→ {"jsonrpc": "2.0", "id": 12, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "API 리팩토링",
      "type": "task",
      "properties": {
        "assignee": "김영수",
        "status": "in_progress",
        "priority": "high",
        "deadline": "2026-03-31",
        "description": "레거시 REST API를 gRPC로 전환"
      }
    }
  }}
```

```bash
TASK_ID=<응답의 id 값>
```

### Step 4: 최소 파라미터로 생성

```json
→ {"jsonrpc": "2.0", "id": 13, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "FastAPI",
      "type": "tech"
    }
  }}
```

**검증**: `properties`가 `{}` 또는 `null`이어도 성공

---

## AS-03: 메모리 연결 (create_link)

**목적**: 노드 간 엣지 생성

### Step 1: 팀 → 팀원 연결

```json
→ {"jsonrpc": "2.0", "id": 20, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {
      "source_id": "<GROUP_ID>",
      "target_id": "<PERSON_ID>",
      "type": "has_member"
    }
  }}
```

**기대 응답**:
```json
← {... "text": "{\"id\":\"<EDGE_UUID>\",\"source_id\":\"<GROUP_ID>\",\"target_id\":\"<PERSON_ID>\",\"type\":\"has_member\",\"properties\":{},\"weight\":1.0,\"created_at\":\"...\"}"}
```

**검증**:
- `id`가 유효한 UUID
- `source_id == GROUP_ID`, `target_id == PERSON_ID`
- `type == "has_member"`

```bash
EDGE_TEAM_PERSON=<응답의 id 값>
```

### Step 2: 팀원 → 작업 연결

```json
→ {"jsonrpc": "2.0", "id": 21, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {
      "source_id": "<PERSON_ID>",
      "target_id": "<TASK_ID>",
      "type": "works_on"
    }
  }}
```

```bash
EDGE_PERSON_TASK=<응답의 id 값>
```

### Step 3: 팀 → 작업 연결

```json
→ {"jsonrpc": "2.0", "id": 22, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {
      "source_id": "<GROUP_ID>",
      "target_id": "<TASK_ID>",
      "type": "owns"
    }
  }}
```

**검증**: 3개 엣지 모두 성공, 각각 고유 UUID

---

## AS-04: 컨텍스트 검색 (read_memory) — 기본

**목적**: 자연어 검색으로 관련 노드 + 1-hop 이웃 반환

### Step 1: 이름으로 검색

```json
→ {"jsonrpc": "2.0", "id": 30, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": "김영수"
    }
  }}
```

**기대 응답 (파싱된 JSON)**:
```json
{
  "query": "김영수",
  "seed_count": 1,
  "total_traversed": 3,
  "results": [
    {"node_id": "<PERSON_ID>", "name": "김영수", "type": "person", "properties": {...}, "depth": 0, "score": 0.95},
    {"node_id": "<GROUP_ID>", "name": "백엔드팀", "type": "group", "properties": {...}, "depth": 1, "score": 0.60},
    {"node_id": "<TASK_ID>", "name": "API 리팩토링", "type": "task", "properties": {...}, "depth": 1, "score": 0.55}
  ]
}
```

**검증**:
- `seed_count >= 1`
- 김영수가 `depth: 0`으로 존재 (직접 매칭)
- 백엔드팀 또는 API 리팩토링이 `depth: 1`로 존재 (1-hop 확장)
- `score` 내림차순 정렬
- 모든 결과에 `node_id`, `name`, `type`, `properties`, `depth`, `score` 필드

### Step 2: 타입으로 검색

```json
→ {"jsonrpc": "2.0", "id": 31, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": "개발팀 작업 현황"
    }
  }}
```

**검증**:
- group/task 타입 노드가 결과에 포함
- properties 내 `status`, `assignee` 등 검색 컨텍스트에 관련된 속성 포함

### Step 3: 결과 없음

```json
→ {"jsonrpc": "2.0", "id": 32, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": "xyzzy_절대존재하지않는_9999"
    }
  }}
```

**기대**:
```json
{"query": "xyzzy_절대존재하지않는_9999", "seed_count": 0, "total_traversed": 0, "results": []}
```

---

## AS-05: 메모리 수정 (update_memory)

**목적**: 기존 노드 이름/속성 업데이트

### Step 1: 이름 + 속성 변경

```json
→ {"jsonrpc": "2.0", "id": 40, "method": "tools/call", "params": {
    "name": "update_memory",
    "arguments": {
      "node_id": "<TASK_ID>",
      "name": "API v2 리팩토링",
      "properties": {
        "assignee": "김영수",
        "status": "completed",
        "priority": "high",
        "deadline": "2026-03-31",
        "description": "레거시 REST API를 gRPC로 전환",
        "completed_date": "2026-03-15",
        "pr_number": "#42"
      }
    }
  }}
```

**기대 응답 (파싱)**:
```json
{
  "id": "<TASK_ID>",
  "type": "task",
  "name": "API v2 리팩토링",
  "properties": {
    "assignee": "김영수",
    "status": "completed",
    "priority": "high",
    "deadline": "2026-03-31",
    "description": "레거시 REST API를 gRPC로 전환",
    "completed_date": "2026-03-15",
    "pr_number": "#42"
  }
}
```

**검증**:
- `name == "API v2 리팩토링"` (변경됨)
- `properties.status == "completed"` (변경됨)
- `properties.pr_number == "#42"` (추가됨)
- `updated_at`이 `created_at`보다 이후

### Step 2: 존재하지 않는 노드 수정

```json
→ {"jsonrpc": "2.0", "id": 41, "method": "tools/call", "params": {
    "name": "update_memory",
    "arguments": {
      "node_id": "00000000-0000-0000-0000-000000000000",
      "name": "Ghost"
    }
  }}
```

**기대**: `{"error": "Node not found"}`

### Step 3: 수정 후 검색 반영 확인

```json
→ {"jsonrpc": "2.0", "id": 42, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": "API v2 리팩토링"
    }
  }}
```

**검증**: 변경된 이름 "API v2 리팩토링"으로 검색 시 해당 노드가 결과에 포함

---

## AS-06: 링크 삭제 (delete_link)

**목적**: 엣지 삭제

### Step 1: 기존 엣지 삭제

```json
→ {"jsonrpc": "2.0", "id": 50, "method": "tools/call", "params": {
    "name": "delete_link",
    "arguments": {
      "edge_id": "<EDGE_PERSON_TASK>"
    }
  }}
```

**기대**: `{"deleted": true}`

### Step 2: 삭제된 엣지 재삭제

```json
→ {"jsonrpc": "2.0", "id": 51, "method": "tools/call", "params": {
    "name": "delete_link",
    "arguments": {
      "edge_id": "<EDGE_PERSON_TASK>"
    }
  }}
```

**기대**: `{"deleted": false}` (이미 삭제됨)

### Step 3: 삭제 후 검색에서 1-hop 이웃 변화 확인

```json
→ {"jsonrpc": "2.0", "id": 52, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": "김영수"
    }
  }}
```

**검증**: 김영수의 1-hop 결과에서 "API v2 리팩토링"이 더 이상 포함되지 않음 (엣지 삭제됨)
- 백엔드팀은 여전히 depth=1에 존재 (해당 엣지 유지)

---

## AS-07: 메모리 삭제 (delete_memory)

**목적**: 노드 + cascade 엣지 삭제

### Step 1: 노드 삭제

```json
→ {"jsonrpc": "2.0", "id": 60, "method": "tools/call", "params": {
    "name": "delete_memory",
    "arguments": {
      "node_id": "<TASK_ID>"
    }
  }}
```

**기대**: `{"deleted": true}`

### Step 2: 삭제된 노드 재삭제

```json
→ {"jsonrpc": "2.0", "id": 61, "method": "tools/call", "params": {
    "name": "delete_memory",
    "arguments": {
      "node_id": "<TASK_ID>"
    }
  }}
```

**기대**: `{"deleted": false}`

### Step 3: 삭제 후 검색에서 미반환 확인

```json
→ {"jsonrpc": "2.0", "id": 62, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": "API v2 리팩토링"
    }
  }}
```

**검증**: `seed_count == 0`, 결과에 "API v2 리팩토링" 없음

---

## AS-08: 에러 케이스

**목적**: 잘못된 입력에 대한 오류 처리

### Case 1: 필수 파라미터 누락 (type 없음)

```json
→ {"jsonrpc": "2.0", "id": 70, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "Incomplete"
    }
  }}
```

**기대**: `isError: true` 응답 또는 에러 메시지

### Case 2: 잘못된 UUID 형식

```json
→ {"jsonrpc": "2.0", "id": 71, "method": "tools/call", "params": {
    "name": "update_memory",
    "arguments": {
      "node_id": "not-a-valid-uuid",
      "name": "Test"
    }
  }}
```

**기대**: 에러 응답 (isError: true)

### Case 3: 존재하지 않는 도구

```json
→ {"jsonrpc": "2.0", "id": 72, "method": "tools/call", "params": {
    "name": "nonexistent_tool",
    "arguments": {}
  }}
```

**기대**: `{"error": "Unknown tool: nonexistent_tool"}` 또는 MCP 에러 응답

### Case 4: 빈 쿼리 검색

```json
→ {"jsonrpc": "2.0", "id": 73, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": ""
    }
  }}
```

**기대**: 빈 결과 `{"seed_count": 0, "results": []}` 또는 에러

### Case 5: 잘못된 JSON-RPC 메서드

```json
→ {"jsonrpc": "2.0", "id": 74, "method": "invalid/method", "params": {}}
```

**기대**: `{"jsonrpc": "2.0", "id": 74, "error": {"code": -32601, "message": "Method not found"}}`

---

## AS-09: 복합 워크플로우 — 프로젝트 셋업

**목적**: 여러 도구를 조합하여 완전한 지식그래프 구축

### 시나리오

```
"결제 시스템 v2 프로젝트를 만들어줘.
 백엔드팀 소속이고,
 '결제 API 구현'과 '결제 테스트 작성' 작업이 있어.
 김영수가 API, 이영희가 테스트 담당이야."
```

### Step 1: 기존 노드 검색

```json
→ {"jsonrpc": "2.0", "id": 80, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "백엔드팀"}
  }}
```

**검증**: 백엔드팀 group 노드의 `node_id` 확인 → `GROUP_ID`

```json
→ {"jsonrpc": "2.0", "id": 81, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "김영수"}
  }}
```

**검증**: 김영수 person 노드의 `node_id` 확인 → `PERSON1_ID`

### Step 2: 새 팀원 생성 (이영희가 없는 경우)

```json
→ {"jsonrpc": "2.0", "id": 82, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "이영희",
      "type": "person",
      "properties": {
        "team": "백엔드팀",
        "role": "QA 엔지니어",
        "skills": "Python, pytest, Selenium"
      }
    }
  }}
```

→ `PERSON2_ID`

### Step 3: 프로젝트 노드 생성

```json
→ {"jsonrpc": "2.0", "id": 83, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "결제 시스템 v2",
      "type": "project",
      "properties": {
        "team": "백엔드팀",
        "status": "planning",
        "start_date": "2026-03-15",
        "description": "신규 결제 모듈 개발"
      }
    }
  }}
```

→ `PROJECT_ID`

### Step 4: 작업 노드 2개 생성

```json
→ {"jsonrpc": "2.0", "id": 84, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "결제 API 구현",
      "type": "task",
      "properties": {
        "assignee": "김영수",
        "project": "결제 시스템 v2",
        "status": "todo",
        "priority": "high"
      }
    }
  }}
```

→ `TASK1_ID`

```json
→ {"jsonrpc": "2.0", "id": 85, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "결제 테스트 작성",
      "type": "task",
      "properties": {
        "assignee": "이영희",
        "project": "결제 시스템 v2",
        "status": "todo",
        "priority": "medium"
      }
    }
  }}
```

→ `TASK2_ID`

### Step 5: 연결 생성 (5개 엣지)

```json
// 백엔드팀 → 프로젝트
→ {"jsonrpc": "2.0", "id": 86, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {"source_id": "<GROUP_ID>", "target_id": "<PROJECT_ID>", "type": "owns"}
  }}

// 프로젝트 → 작업1
→ {"jsonrpc": "2.0", "id": 87, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {"source_id": "<PROJECT_ID>", "target_id": "<TASK1_ID>", "type": "contains"}
  }}

// 프로젝트 → 작업2
→ {"jsonrpc": "2.0", "id": 88, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {"source_id": "<PROJECT_ID>", "target_id": "<TASK2_ID>", "type": "contains"}
  }}

// 김영수 → 작업1
→ {"jsonrpc": "2.0", "id": 89, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {"source_id": "<PERSON1_ID>", "target_id": "<TASK1_ID>", "type": "works_on"}
  }}

// 이영희 → 작업2
→ {"jsonrpc": "2.0", "id": 90, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {"source_id": "<PERSON2_ID>", "target_id": "<TASK2_ID>", "type": "works_on"}
  }}
```

**검증**: 5개 엣지 모두 성공 (각각 유효한 UUID 반환)

### Step 6: 검증 — 프로젝트 기준 검색

```json
→ {"jsonrpc": "2.0", "id": 91, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "결제 시스템 v2"}
  }}
```

**기대 검증**:
- seed_count >= 1
- "결제 시스템 v2" (depth=0)
- "결제 API 구현" 또는 "결제 테스트 작성" (depth=1, 1-hop 이웃)
- "백엔드팀" (depth=1, 1-hop 이웃)

### Step 7: 검증 — 담당자 기준 검색

```json
→ {"jsonrpc": "2.0", "id": 92, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "이영희 담당 작업"}
  }}
```

**기대**: 이영희(depth=0) + 결제 테스트 작성(depth=1) 포함

---

## AS-10: 멀티턴 대화 시나리오

**목적**: 에이전트가 여러 턴에 걸쳐 지식그래프를 활용하는 흐름

### 턴 1: 컨텍스트 수집

```
사용자: "백엔드팀 현황 알려줘."
```

에이전트 실행:
```json
→ {"jsonrpc": "2.0", "id": 100, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "백엔드팀 현황 작업 담당자"}
  }}
```

**기대**: 백엔드팀(group) + 연결된 person/task 노드들 반환

에이전트 응답 예시:
> "백엔드팀에는 김영수(시니어 개발자), 이영희(QA 엔지니어)가 있습니다.
> 현재 진행 중인 작업: 결제 시스템 v2 (planning), 결제 API 구현(todo), 결제 테스트 작성(todo)"

### 턴 2: 정보 업데이트

```
사용자: "김영수가 Go 마이크로서비스 교육을 수료했어."
```

에이전트 실행:
```json
// 기존 정보 확인
→ {"jsonrpc": "2.0", "id": 101, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "김영수"}
  }}

// 속성 업데이트 (기존 속성 + 새 속성 merge)
→ {"jsonrpc": "2.0", "id": 102, "method": "tools/call", "params": {
    "name": "update_memory",
    "arguments": {
      "node_id": "<PERSON1_ID>",
      "properties": {
        "team": "백엔드팀",
        "role": "시니어 개발자",
        "skills": "Go, PostgreSQL, Docker",
        "joined": "2026-01-15",
        "training": "Go 마이크로서비스 교육 수료 (2026-03-15)"
      }
    }
  }}
```

**검증**:
- 기존 `skills` 유지
- 새 `training` 속성 추가
- `updated_at` 갱신

### 턴 3: 업데이트된 정보 활용

```
사용자: "Go 잘 쓰는 사람 누구야?"
```

에이전트 실행:
```json
→ {"jsonrpc": "2.0", "id": 103, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "Go 개발 경험 skills"}
  }}
```

**검증**:
- 김영수가 결과에 포함 (skills에 "Go" 포함 → 임베딩에 반영)
- `properties.training`에 교육 이력 포함

---

## AS-11: graph_id 스코프 검색

**목적**: 특정 그래프 내에서만 검색

### Step 1: 그래프 생성 시 graph_id 지정

```json
// graph_id 지정하여 노드 생성
→ {"jsonrpc": "2.0", "id": 110, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "K8s Production Cluster",
      "type": "cluster",
      "properties": {"provider": "AWS", "region": "ap-northeast-2"},
      "graph_id": "<INFRA_GRAPH_ID>"
    }
  }}

→ {"jsonrpc": "2.0", "id": 111, "method": "tools/call", "params": {
    "name": "create_memory",
    "arguments": {
      "name": "프론트엔드 리디자인",
      "type": "task",
      "properties": {"status": "in_progress"},
      "graph_id": "<ORG_GRAPH_ID>"
    }
  }}
```

### Step 2: graph_id로 스코프 제한 검색

```json
→ {"jsonrpc": "2.0", "id": 112, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": "production cluster",
      "graph_id": "<INFRA_GRAPH_ID>"
    }
  }}
```

**검증**:
- "K8s Production Cluster" 반환
- "프론트엔드 리디자인" 미반환 (다른 그래프)

### Step 3: graph_id 없이 전체 검색

```json
→ {"jsonrpc": "2.0", "id": 113, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {
      "query": "production cluster"
    }
  }}
```

**검증**: 모든 그래프에서 매칭 결과 반환

---

## AS-12: 담당자 변경 (링크 삭제 → 재연결)

**목적**: 기존 연결 해제 후 새 연결 생성

### Step 1: 현재 연결 확인

```json
→ {"jsonrpc": "2.0", "id": 120, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "결제 API 구현 담당"}
  }}
```

**검증**: 김영수 → 결제 API 구현 연결 확인 (depth=1)

### Step 2: 기존 연결 삭제

```json
→ {"jsonrpc": "2.0", "id": 121, "method": "tools/call", "params": {
    "name": "delete_link",
    "arguments": {"edge_id": "<김영수→결제API구현_EDGE_ID>"}
  }}
```

**기대**: `{"deleted": true}`

### Step 3: 새 담당자 연결

```json
→ {"jsonrpc": "2.0", "id": 122, "method": "tools/call", "params": {
    "name": "create_link",
    "arguments": {
      "source_id": "<PERSON2_ID>",
      "target_id": "<TASK1_ID>",
      "type": "works_on"
    }
  }}
```

### Step 4: 변경 확인

```json
→ {"jsonrpc": "2.0", "id": 123, "method": "tools/call", "params": {
    "name": "read_memory",
    "arguments": {"query": "결제 API 구현 담당"}
  }}
```

**검증**:
- 이영희가 depth=1에 포함 (새 연결)
- 김영수가 depth=1에 미포함 (연결 해제)

---

## AS-13: 정리 — 전체 삭제

**목적**: 테스트 데이터 정리

```json
// 엣지 삭제 (노드 삭제 시 cascade되므로 선택사항)
// 노드 삭제 순서: 리프 → 루트

→ delete_memory: {node_id: <TASK1_ID>}   // → {"deleted": true}
→ delete_memory: {node_id: <TASK2_ID>}   // → {"deleted": true}
→ delete_memory: {node_id: <PROJECT_ID>} // → {"deleted": true}
→ delete_memory: {node_id: <PERSON2_ID>} // → {"deleted": true}
→ delete_memory: {node_id: <PERSON1_ID>} // → {"deleted": true}
→ delete_memory: {node_id: <GROUP_ID>}   // → {"deleted": true}

// 최종 확인
→ read_memory: {query: "결제 시스템"}
// → {"seed_count": 0, "results": []}
```
