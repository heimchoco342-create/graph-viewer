#!/usr/bin/env python3
"""Seed realistic test data into WNG via direct DB access.

Simulates a software company with teams, people, projects, tech stack,
and recent work tasks with structured labels.

Usage:
    cd backend && .venv/bin/python scripts/seed_test_data.py
"""
from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import Base
from app.models.node import Node
from app.models.edge import Edge
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


DB_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./wng_seed.db")


async def seed(session: AsyncSession):
    nodes: dict[str, Node] = {}

    def add_node(key: str, type: str, name: str, props: dict = None):
        n = Node(type=type, name=name, properties=props or {})
        nodes[key] = n
        session.add(n)

    def add_edge(src: str, tgt: str, type: str, props: dict = None):
        e = Edge(source_id=nodes[src].id, target_id=nodes[tgt].id, type=type, properties=props or {})
        session.add(e)

    # ── 조직 ──
    add_node("company", "organization", "WNG Corp")

    # ── 팀 ──
    add_node("backend", "team", "백엔드팀")
    add_node("frontend", "team", "프론트엔드팀")
    add_node("devops", "team", "DevOps팀")
    add_node("data", "team", "데이터팀")

    # ── 사람 ──
    add_node("kim", "person", "김철수", {"role": "백엔드 시니어", "team": "백엔드팀"})
    add_node("lee", "person", "이영희", {"role": "백엔드 주니어", "team": "백엔드팀"})
    add_node("park", "person", "박민수", {"role": "프론트엔드 리드", "team": "프론트엔드팀"})
    add_node("choi", "person", "최수진", {"role": "프론트엔드 개발자", "team": "프론트엔드팀"})
    add_node("jung", "person", "정대현", {"role": "DevOps 엔지니어", "team": "DevOps팀"})
    add_node("han", "person", "한지민", {"role": "데이터 엔지니어", "team": "데이터팀"})
    add_node("yoon", "person", "윤서준", {"role": "팀장", "team": "백엔드팀"})
    add_node("kwon", "person", "권나영", {"role": "팀장", "team": "프론트엔드팀"})

    # ── 프로젝트 ──
    add_node("wng_proj", "project", "WNG 지식그래프", {"status": "진행중", "priority": "high"})
    add_node("order_api", "project", "주문 API v2", {"status": "진행중", "priority": "high"})
    add_node("dashboard", "project", "관리자 대시보드", {"status": "진행중", "priority": "medium"})
    add_node("data_pipe", "project", "데이터 파이프라인", {"status": "계획", "priority": "medium"})

    # ── 기술스택 ──
    add_node("fastapi", "tech", "FastAPI", {"category": "framework"})
    add_node("react", "tech", "React", {"category": "framework"})
    add_node("postgres", "tech", "PostgreSQL", {"category": "database"})
    add_node("k8s", "tech", "Kubernetes", {"category": "infra"})
    add_node("docker", "tech", "Docker", {"category": "infra"})
    add_node("redis", "tech", "Redis", {"category": "database"})
    add_node("typescript", "tech", "TypeScript", {"category": "language"})
    add_node("python", "tech", "Python", {"category": "language"})

    # ── 작업 (task) — 구조화된 라벨 ──
    add_node("task1", "task", "주문 API 페이지네이션 추가", {
        "team": "백엔드팀", "assignee": "김철수", "date": "2026-03-10",
        "category": "기능추가", "status": "completed",
        "summary": "GET /orders에 cursor 기반 페이지네이션 적용, 응답 시간 40% 개선",
    })
    add_node("task2", "task", "JWT 토큰 갱신 로직 수정", {
        "team": "백엔드팀", "assignee": "이영희", "date": "2026-03-10",
        "category": "버그수정", "status": "completed",
        "summary": "리프레시 토큰 만료 시 무한 루프 버그 수정",
    })
    add_node("task3", "task", "그래프 뷰 노드 포커스 기능", {
        "team": "프론트엔드팀", "assignee": "박민수", "date": "2026-03-11",
        "category": "기능추가", "status": "completed",
        "summary": "노드 클릭 시 연결된 노드 하이라이트, 나머지 dimming 처리",
    })
    add_node("task4", "task", "사이드바 접기/펼치기 구현", {
        "team": "프론트엔드팀", "assignee": "최수진", "date": "2026-03-11",
        "category": "기능추가", "status": "completed",
        "summary": "좌측 사이드바 토글 버튼, 아이콘 전용 모드, CSS 트랜지션",
    })
    add_node("task5", "task", "K8s 클러스터 모니터링 대시보드 설정", {
        "team": "DevOps팀", "assignee": "정대현", "date": "2026-03-11",
        "category": "인프라", "status": "completed",
        "summary": "Grafana + Prometheus 스택 배포, 알림 규칙 설정",
    })
    add_node("task6", "task", "주문 데이터 ETL 파이프라인 설계", {
        "team": "데이터팀", "assignee": "한지민", "date": "2026-03-12",
        "category": "설계", "status": "in_progress",
        "summary": "일간 주문 데이터 집계 → S3 → Redshift 로딩 파이프라인 설계",
    })
    add_node("task7", "task", "주문 API 결제 연동 테스트", {
        "team": "백엔드팀", "assignee": "김철수", "date": "2026-03-12",
        "category": "테스트", "status": "completed",
        "summary": "PG사 결제 API 통합 테스트 작성 및 모킹 제거",
    })
    add_node("task8", "task", "관리자 대시보드 차트 컴포넌트", {
        "team": "프론트엔드팀", "assignee": "박민수", "date": "2026-03-12",
        "category": "기능추가", "status": "in_progress",
        "summary": "주간 매출 라인차트, 카테고리별 파이차트 구현 (Recharts)",
    })
    add_node("task9", "task", "CI/CD 파이프라인 캐시 최적화", {
        "team": "DevOps팀", "assignee": "정대현", "date": "2026-03-13",
        "category": "최적화", "status": "in_progress",
        "summary": "GitHub Actions Docker layer cache 적용, 빌드 시간 5분→2분",
    })
    add_node("task10", "task", "주문 API 에러 핸들링 통일", {
        "team": "백엔드팀", "assignee": "이영희", "date": "2026-03-13",
        "category": "리팩토링", "status": "in_progress",
        "summary": "커스텀 에러 코드 체계 도입, 일관된 에러 응답 포맷 적용",
    })

    await session.flush()

    # ── 관계 (edges) ──

    # 조직 → 팀
    for t in ["backend", "frontend", "devops", "data"]:
        add_edge("company", t, "contains")

    # 팀 → 사람
    add_edge("backend", "yoon", "has_leader")
    add_edge("backend", "kim", "has_member")
    add_edge("backend", "lee", "has_member")
    add_edge("frontend", "kwon", "has_leader")
    add_edge("frontend", "park", "has_member")
    add_edge("frontend", "choi", "has_member")
    add_edge("devops", "jung", "has_member")
    add_edge("data", "han", "has_member")

    # 사람 → 프로젝트
    add_edge("kim", "order_api", "works_on")
    add_edge("lee", "order_api", "works_on")
    add_edge("park", "wng_proj", "works_on")
    add_edge("park", "dashboard", "works_on")
    add_edge("choi", "wng_proj", "works_on")
    add_edge("jung", "wng_proj", "works_on")
    add_edge("han", "data_pipe", "works_on")
    add_edge("yoon", "order_api", "manages")
    add_edge("kwon", "dashboard", "manages")

    # 프로젝트 → 기술스택
    add_edge("wng_proj", "fastapi", "uses")
    add_edge("wng_proj", "react", "uses")
    add_edge("wng_proj", "postgres", "uses")
    add_edge("wng_proj", "typescript", "uses")
    add_edge("wng_proj", "python", "uses")
    add_edge("order_api", "fastapi", "uses")
    add_edge("order_api", "postgres", "uses")
    add_edge("order_api", "redis", "uses")
    add_edge("dashboard", "react", "uses")
    add_edge("dashboard", "typescript", "uses")
    add_edge("data_pipe", "python", "uses")
    add_edge("data_pipe", "postgres", "uses")

    # 인프라
    add_edge("wng_proj", "k8s", "deployed_on")
    add_edge("order_api", "k8s", "deployed_on")
    add_edge("k8s", "docker", "uses")

    # 사람 → 작업
    add_edge("kim", "task1", "completed")
    add_edge("lee", "task2", "completed")
    add_edge("park", "task3", "completed")
    add_edge("choi", "task4", "completed")
    add_edge("jung", "task5", "completed")
    add_edge("han", "task6", "working_on")
    add_edge("kim", "task7", "completed")
    add_edge("park", "task8", "working_on")
    add_edge("jung", "task9", "working_on")
    add_edge("lee", "task10", "working_on")

    # 작업 → 프로젝트
    add_edge("task1", "order_api", "belongs_to")
    add_edge("task2", "order_api", "belongs_to")
    add_edge("task3", "wng_proj", "belongs_to")
    add_edge("task4", "wng_proj", "belongs_to")
    add_edge("task5", "wng_proj", "belongs_to")
    add_edge("task6", "data_pipe", "belongs_to")
    add_edge("task7", "order_api", "belongs_to")
    add_edge("task8", "dashboard", "belongs_to")
    add_edge("task9", "wng_proj", "belongs_to")
    add_edge("task10", "order_api", "belongs_to")

    # 작업 간 의존
    add_edge("task7", "task1", "depends_on", {"reason": "페이지네이션 완료 후 결제 테스트 진행"})
    add_edge("task10", "task2", "follows_up", {"reason": "JWT 버그 수정 이후 전체 에러 핸들링 리팩토링"})

    await session.commit()

    node_count = len(nodes)
    print(f"✅ Seed complete: {node_count} nodes created")


async def main():
    engine = create_async_engine(DB_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        await seed(session)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
