#!/usr/bin/env python3
"""Seed test data into WNG via REST API."""
from __future__ import annotations

import os
import sys
import requests

BASE = os.environ.get("WNG_API_URL", "http://localhost:8000")
EMAIL = "test@wng.com"
PASSWORD = "test1234"


def get_token() -> str:
    # Try login first
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code == 200:
        return r.json()["access_token"]
    # Register if login fails
    requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL, "password": PASSWORD, "name": "테스트관리자"})
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    return r.json()["access_token"]


def main():
    token = get_token()
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    ids: dict[str, str] = {}

    # Create a Graph namespace
    r = requests.post(f"{BASE}/api/graph/graphs", json={
        "name": "WNG Corp", "scope": "org",
    }, headers=h)
    graph_id = r.json()["id"]
    print(f"📁 Graph created: {graph_id}")

    def node(key: str, type: str, name: str, props: dict = None):
        r = requests.post(f"{BASE}/api/graph/nodes", json={
            "type": type, "name": name, "properties": props or {},
            "graph_id": graph_id,
        }, headers=h)
        data = r.json()
        ids[key] = data["id"]
        return data

    def edge(src: str, tgt: str, type: str, props: dict = None):
        requests.post(f"{BASE}/api/graph/edges", json={
            "source_id": ids[src], "target_id": ids[tgt],
            "type": type, "properties": props or {},
            "graph_id": graph_id,
        }, headers=h)

    # ── 조직 ──
    node("company", "organization", "WNG Corp")

    # ── 팀 ──
    node("backend", "team", "백엔드팀")
    node("frontend", "team", "프론트엔드팀")
    node("devops", "team", "DevOps팀")
    node("data", "team", "데이터팀")

    # ── 사람 ──
    node("kim", "person", "김철수", {"role": "백엔드 시니어", "team": "백엔드팀"})
    node("lee", "person", "이영희", {"role": "백엔드 주니어", "team": "백엔드팀"})
    node("park", "person", "박민수", {"role": "프론트엔드 리드", "team": "프론트엔드팀"})
    node("choi", "person", "최수진", {"role": "프론트엔드 개발자", "team": "프론트엔드팀"})
    node("jung", "person", "정대현", {"role": "DevOps 엔지니어", "team": "DevOps팀"})
    node("han", "person", "한지민", {"role": "데이터 엔지니어", "team": "데이터팀"})
    node("yoon", "person", "윤서준", {"role": "팀장", "team": "백엔드팀"})
    node("kwon", "person", "권나영", {"role": "팀장", "team": "프론트엔드팀"})

    # ── 프로젝트 ──
    node("wng_proj", "project", "WNG 지식그래프", {"status": "진행중", "priority": "high"})
    node("order_api", "project", "주문 API v2", {"status": "진행중", "priority": "high"})
    node("dashboard", "project", "관리자 대시보드", {"status": "진행중", "priority": "medium"})
    node("data_pipe", "project", "데이터 파이프라인", {"status": "계획", "priority": "medium"})

    # ── 기술스택 ──
    node("fastapi", "tech", "FastAPI", {"category": "framework"})
    node("react_t", "tech", "React", {"category": "framework"})
    node("postgres", "tech", "PostgreSQL", {"category": "database"})
    node("k8s", "tech", "Kubernetes", {"category": "infra"})
    node("docker", "tech", "Docker", {"category": "infra"})
    node("redis", "tech", "Redis", {"category": "database"})
    node("typescript", "tech", "TypeScript", {"category": "language"})
    node("python_t", "tech", "Python", {"category": "language"})

    # ── 작업 (task) ──
    node("task1", "task", "주문 API 페이지네이션 추가", {
        "team": "백엔드팀", "assignee": "김철수", "date": "2026-03-10",
        "category": "기능추가", "status": "completed",
        "summary": "GET /orders에 cursor 기반 페이지네이션 적용, 응답 시간 40% 개선",
    })
    node("task2", "task", "JWT 토큰 갱신 로직 수정", {
        "team": "백엔드팀", "assignee": "이영희", "date": "2026-03-10",
        "category": "버그수정", "status": "completed",
        "summary": "리프레시 토큰 만료 시 무한 루프 버그 수정",
    })
    node("task3", "task", "그래프 뷰 노드 포커스 기능", {
        "team": "프론트엔드팀", "assignee": "박민수", "date": "2026-03-11",
        "category": "기능추가", "status": "completed",
        "summary": "노드 클릭 시 연결된 노드 하이라이트, 나머지 dimming 처리",
    })
    node("task4", "task", "사이드바 접기/펼치기 구현", {
        "team": "프론트엔드팀", "assignee": "최수진", "date": "2026-03-11",
        "category": "기능추가", "status": "completed",
        "summary": "좌측 사이드바 토글 버튼, 아이콘 전용 모드, CSS 트랜지션",
    })
    node("task5", "task", "K8s 클러스터 모니터링 대시보드 설정", {
        "team": "DevOps팀", "assignee": "정대현", "date": "2026-03-11",
        "category": "인프라", "status": "completed",
        "summary": "Grafana + Prometheus 스택 배포, 알림 규칙 설정",
    })
    node("task6", "task", "주문 데이터 ETL 파이프라인 설계", {
        "team": "데이터팀", "assignee": "한지민", "date": "2026-03-12",
        "category": "설계", "status": "in_progress",
        "summary": "일간 주문 데이터 집계 → S3 → Redshift 로딩 파이프라인 설계",
    })
    node("task7", "task", "주문 API 결제 연동 테스트", {
        "team": "백엔드팀", "assignee": "김철수", "date": "2026-03-12",
        "category": "테스트", "status": "completed",
        "summary": "PG사 결제 API 통합 테스트 작성 및 모킹 제거",
    })
    node("task8", "task", "관리자 대시보드 차트 컴포넌트", {
        "team": "프론트엔드팀", "assignee": "박민수", "date": "2026-03-12",
        "category": "기능추가", "status": "in_progress",
        "summary": "주간 매출 라인차트, 카테고리별 파이차트 구현 (Recharts)",
    })
    node("task9", "task", "CI/CD 파이프라인 캐시 최적화", {
        "team": "DevOps팀", "assignee": "정대현", "date": "2026-03-13",
        "category": "최적화", "status": "in_progress",
        "summary": "GitHub Actions Docker layer cache 적용, 빌드 시간 5분→2분",
    })
    node("task10", "task", "주문 API 에러 핸들링 통일", {
        "team": "백엔드팀", "assignee": "이영희", "date": "2026-03-13",
        "category": "리팩토링", "status": "in_progress",
        "summary": "커스텀 에러 코드 체계 도입, 일관된 에러 응답 포맷 적용",
    })

    print(f"✅ {len(ids)} nodes created")

    edge_count = 0
    _orig_edge = edge

    def edge(src, tgt, etype, props=None):
        nonlocal edge_count
        _orig_edge(src, tgt, etype, props)
        edge_count += 1

    # ── 관계 (edges) ──

    # 조직 → 팀
    for t in ["backend", "frontend", "devops", "data"]:
        edge("company", t, "contains")

    # 팀 → 사람
    edge("backend", "yoon", "has_leader")
    edge("backend", "kim", "has_member")
    edge("backend", "lee", "has_member")
    edge("frontend", "kwon", "has_leader")
    edge("frontend", "park", "has_member")
    edge("frontend", "choi", "has_member")
    edge("devops", "jung", "has_member")
    edge("data", "han", "has_member")

    # 사람 → 프로젝트
    edge("kim", "order_api", "works_on")
    edge("lee", "order_api", "works_on")
    edge("park", "wng_proj", "works_on")
    edge("park", "dashboard", "works_on")
    edge("choi", "wng_proj", "works_on")
    edge("jung", "wng_proj", "works_on")
    edge("han", "data_pipe", "works_on")
    edge("yoon", "order_api", "manages")
    edge("kwon", "dashboard", "manages")

    # 프로젝트 → 기술스택
    edge("wng_proj", "fastapi", "uses")
    edge("wng_proj", "react_t", "uses")
    edge("wng_proj", "postgres", "uses")
    edge("wng_proj", "typescript", "uses")
    edge("wng_proj", "python_t", "uses")
    edge("order_api", "fastapi", "uses")
    edge("order_api", "postgres", "uses")
    edge("order_api", "redis", "uses")
    edge("dashboard", "react_t", "uses")
    edge("dashboard", "typescript", "uses")
    edge("data_pipe", "python_t", "uses")
    edge("data_pipe", "postgres", "uses")

    # 인프라
    edge("wng_proj", "k8s", "deployed_on")
    edge("order_api", "k8s", "deployed_on")
    edge("k8s", "docker", "uses")

    # 사람 → 작업
    edge("kim", "task1", "completed")
    edge("lee", "task2", "completed")
    edge("park", "task3", "completed")
    edge("choi", "task4", "completed")
    edge("jung", "task5", "completed")
    edge("han", "task6", "working_on")
    edge("kim", "task7", "completed")
    edge("park", "task8", "working_on")
    edge("jung", "task9", "working_on")
    edge("lee", "task10", "working_on")

    # 작업 → 프로젝트
    edge("task1", "order_api", "belongs_to")
    edge("task2", "order_api", "belongs_to")
    edge("task3", "wng_proj", "belongs_to")
    edge("task4", "wng_proj", "belongs_to")
    edge("task5", "wng_proj", "belongs_to")
    edge("task6", "data_pipe", "belongs_to")
    edge("task7", "order_api", "belongs_to")
    edge("task8", "dashboard", "belongs_to")
    edge("task9", "wng_proj", "belongs_to")
    edge("task10", "order_api", "belongs_to")

    # 작업 간 의존
    edge("task7", "task1", "depends_on")
    edge("task10", "task2", "follows_up")

    print(f"✅ {edge_count} edges created")


if __name__ == "__main__":
    main()
