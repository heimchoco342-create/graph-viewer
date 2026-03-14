# WNG 데모 시나리오

## 데이터 준비

### 소규모 시드 (현재 DB에 있는 데이터)
```bash
cd backend && .venv/bin/python scripts/seed_via_api.py
```
- 1개 조직, 4팀, 8명, 4프로젝트, 8기술, 10작업 = 35노드, 58엣지

### 대규모 시드
```bash
cd backend && .venv/bin/python scripts/seed_large.py
```
- 2개 조직(알파테크/베타소프트), 4팀, 20명, 80작업(90일)
- 13 기술스택, 4 프로젝트

---

## 시나리오 1: 조직 구조 탐색

1. **그래프** 페이지에서 전체 조직 구조 확인
2. 조직(WNG Corp) 노드 클릭 → 연결된 팀 확인
3. 팀 노드 클릭 → 팀장/팀원 확인
4. 서브그래프 다운로드 → JSON 파일로 특정 팀 구조 추출

## 시나리오 2: 팀원 작업 조회 (쿼리 페이지)

1. **쿼리** 페이지 이동
2. 타입 필터: `task` 선택 → 전체 작업 목록
3. 검색: `completed` 입력 → 완료된 작업만
4. 특정 작업 클릭 → 상세 패널에서 연결 확인 (누가 했는지, 어느 프로젝트인지)

## 시나리오 3: 기술 스택 연관 분석

1. **쿼리** 페이지에서 타입 `tech` 필터
2. PostgreSQL 클릭 → 어떤 프로젝트가 사용하는지 연결 확인
3. "그래프에서 보기" 클릭 → 그래프 페이지로 이동, 해당 노드 포커스

## 시나리오 4: 경로 탐색

1. **경로** 페이지 이동
2. 출발: 김철수, 도착: React → 최단 경로 탐색
3. 경로: 김철수 → works_on → 주문 API v2 ... → React

## 시나리오 5: MCP 에이전트 연동

에이전트가 MCP를 통해 WNG에 작업 기록:
```json
// 1. 작업 노드 생성
{"method": "tools/call", "params": {"name": "create_node", "arguments": {
  "name": "로그인 페이지 리디자인",
  "type": "task",
  "properties": {"team": "프론트엔드팀", "assignee": "박민수", "status": "in_progress", "date": "2026-03-14"}
}}}

// 2. 작업자 연결
{"method": "tools/call", "params": {"name": "create_edge", "arguments": {
  "source_id": "<박민수_id>", "target_id": "<task_id>", "type": "working_on"
}}}

// 3. 팀 작업 조회
{"method": "tools/call", "params": {"name": "query_nodes", "arguments": {
  "type_filter": "task",
  "property_filter": {"team": "프론트엔드팀", "status": "in_progress"},
  "include_connections": true
}}}
```

## 시나리오 6: K8s 클러스터 현황

1. **쿼리** 페이지에서 검색: `k8s` 입력
2. K8s 리소스 목록 확인 (pod, service, deployment 등)
3. 그래프에서 K8s 리소스 간 관계 시각화 (owns, selects, routes_to 등)

## 시나리오 7: 고아 노드 관리

1. **그래프** 페이지에서 상단 좌측에 타입별로 그룹된 미연결 노드 확인
2. 고아 노드 클릭 → 상세 확인
3. "+ 엣지" 버튼으로 수동 연결
