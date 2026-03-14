# WNG 데모 시나리오

## 데이터 준비

### 시드 데이터

```bash
# 대규모 시드 (2개 조직, 6팀, 20명, 140작업, K8s 클러스터)
cd backend && .venv/bin/python scripts/seed_test_data.py

# K8s 클러스터 시드 (prod/staging/monitoring, 38노드, 81엣지)
cd backend && .venv/bin/python scripts/seed_k8s.py
```

현재 DB: 3개 그래프 (WNG Corp, 알파테크, K8s Cluster), 231노드

### 임베딩 확인

```bash
# 임베딩 현황 API
curl http://localhost:8000/api/graph/embed/status
# → {"total": 231, "embedded": 231, "pending": 0, "has_embedding_column": true}

# 노드 생성/수정 시 자동 임베딩 — 별도 작업 불필요
```

---

## 시나리오 1: 조직 구조 탐색

**목적**: 전체 조직 구조를 시각적으로 파악

1. **그래프** 페이지 → 그래프 셀렉터에서 "WNG Corp" 선택
2. Dagre 레이아웃으로 조직→팀→팀원 계층 구조 확인
3. 조직(WNG Corp) 노드 클릭 → 연결된 6개 팀 확인
4. **포커스 모드**: "워터폴" 선택 → 특정 팀 클릭 시 상위/하위 트리 전체 하이라이트
5. **서브그래프 다운로드**: 팀 노드 선택 → "서브그래프 다운로드" → JSON 추출

## 시나리오 2: 벡터 검색 (재귀 탐색)

**목적**: 자연어로 관련 지식을 탐색

1. **탐색** 페이지 → "재귀 탐색" 탭 선택
2. 검색어 입력: `프론트엔드 작업`
3. 결과 확인:
   - 임베딩 상태 표시: "벡터 검색 231/231"
   - 응답 시간: "0.8s" (모델 추론 포함)
   - score 순 정렬: 직접 관련 노드(task, person)가 상위
4. 다른 검색어 시도:
   - `JWT` → 관련 task + 백엔드 기술 노드
   - `김철수` → person + 연결된 task, project
   - `Kubernetes 배포` → K8s 리소스 + 관련 작업

**포인트**: score는 코사인 유사도. depth=0은 시드(직접 매칭), depth>0은 엣지를 타고 도달한 노드.

## 시나리오 3: 팀원 작업 조회 (노드/엣지 탐색)

**목적**: 필터링으로 특정 조건의 노드 조회

1. **탐색** 페이지 → "노드" 탭
2. 타입 필터: `task` 선택 → 140개 작업 목록
3. 검색: `completed` → 완료된 작업만 필터
4. 작업 클릭 → 상세 패널:
   - 속성 (team, assignee, date, status, summary)
   - 들어오는 연결 / 나가는 연결
5. 연결된 person 노드 클릭 → 해당 팀원의 다른 작업 확인

## 시나리오 4: 기술 스택 연관 분석

**목적**: 특정 기술이 어디서 쓰이는지 파악

1. **탐색** 페이지 → "노드" 탭 → 타입: `tech`
2. PostgreSQL 클릭 → 연결 확인:
   - `uses` 관계로 연결된 프로젝트들
3. "그래프에서 보기" 클릭 → 그래프 페이지에서 해당 노드 포커스
4. "직접" 포커스 모드 → PostgreSQL과 직접 연결된 노드만 하이라이트

## 시나리오 5: 경로 탐색

**목적**: 두 노드 간 관계 경로 확인

1. **탐색** 페이지 → "경로" 탭
2. 출발: `김철수`, 도착: `React`
3. BFS 최단 경로 결과:
   - 김철수 →[works_on]→ 주문 API v2 →[uses]→ React
4. 각 경로 스텝에서 엣지 타입 확인

## 시나리오 6: K8s 클러스터 시각화

**목적**: K8s 인프라 구조를 그래프로 파악

1. **그래프** 페이지 → 그래프 셀렉터에서 "K8s Cluster" 선택
2. 38노드, 81엣지 — Namespace/Deployment/Service/Pod 계층 구조
3. 노드 타입별 색상으로 리소스 종류 구분
4. `monitoring` 네임스페이스 노드 클릭 → "워터폴" 포커스:
   - Prometheus, Grafana 등 모니터링 스택 전체 하이라이트
5. **탐색** 페이지 → 재귀 탐색: `order-api` → 관련 Pod, Service, HPA 노드

## 시나리오 7: 통계 대시보드

**목적**: 그래프 전체 현황 한눈에 파악

1. **탐색** 페이지 → "통계" 탭
2. 요약 카드: 총 노드 231, 총 엣지 N, 노드 타입 19종, 엣지 타입 N종
3. 노드/엣지 타입 분포 차트 (바 차트)
4. 연결이 많은 노드 Top 10 — 허브 노드 식별

## 시나리오 8: MCP 에이전트 연동

**목적**: AI 에이전트가 MCP로 지식그래프 읽기/쓰기

### 에이전트가 작업 기록
```json
// 1. 작업 노드 생성 (자동 임베딩)
{"method": "tools/call", "params": {"name": "create_memory", "arguments": {
  "name": "로그인 페이지 리디자인",
  "type": "task",
  "properties": {
    "team": "프론트엔드팀",
    "assignee": "박민수",
    "status": "in_progress",
    "date": "2026-03-14",
    "summary": "로그인 페이지 UI/UX 개선"
  }
}}}

// 2. 담당자 연결
{"method": "tools/call", "params": {"name": "create_link", "arguments": {
  "source_id": "<task_id>", "target_id": "<박민수_id>", "type": "assigned_to"
}}}
```

### 에이전트가 컨텍스트 조회
```json
// 관련 지식 검색 (벡터 + 재귀 탐색)
{"method": "tools/call", "params": {"name": "read_memory", "arguments": {
  "query": "프론트엔드팀 이번주 작업"
}}}
// → 관련 task, person, project 노드 반환 (score, depth 포함)
```

### 에이전트가 작업 상태 업데이트
```json
{"method": "tools/call", "params": {"name": "update_memory", "arguments": {
  "node_id": "<task_id>",
  "properties": {"status": "completed", "summary": "완료 — PR #42 머지됨"}
}}}
```

## 시나리오 9: 실시간 로그 모니터링

**목적**: 백엔드 동작을 실시간 확인

1. **로그** 페이지 이동
2. 연결 상태 표시: 녹색 = 연결됨
3. 다른 탭에서 검색/CRUD 수행 → 로그 페이지에 실시간 로그 출력
4. 로그 레벨별 색상: DEBUG(회색), INFO(파랑), WARNING(노랑), ERROR(빨강)
5. 필터 입력: `embedding` → 임베딩 관련 로그만 필터
6. "자동 스크롤" 토글로 실시간 추적 on/off

## 시나리오 10: 고아 노드 관리

**목적**: 미연결 노드 식별 및 연결

1. **그래프** 페이지에서 상단 좌측에 타입별 그룹된 미연결 노드 확인
2. 고아 노드 클릭 → 상세 패널에서 속성 확인
3. "+ 엣지" 버튼 → 적절한 노드와 관계 생성
4. 연결 후 Dagre 레이아웃이 자동 재배치
