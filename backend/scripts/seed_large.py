#!/usr/bin/env python3
"""Seed large-scale test data via REST API.

2 organizations, 4 teams (1 leader + 4 members each = 20 people),
90 days of work tasks (~80 tasks).

Node hierarchy:
  조직 → 조직업무
  팀 → 팀업무 / 팀장 / 팀원 → 개인업무

Usage:
    cd backend && .venv/bin/python scripts/seed_large.py
"""
from __future__ import annotations

import os
import random
import sys
from datetime import date, timedelta

import requests

BASE = os.environ.get("WNG_API_URL", "http://localhost:8000")
EMAIL = "test@wng.com"
PASSWORD = "test1234"

random.seed(42)

# ── Auth ──


def get_token() -> str:
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code == 200:
        return r.json()["access_token"]
    requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL, "password": PASSWORD, "name": "시드관리자"})
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    return r.json()["access_token"]


# ── Data definitions ──

ORGS = [
    {"key": "org_alpha", "name": "알파테크", "props": {"industry": "SaaS", "size": "50명"}},
    {"key": "org_beta", "name": "베타소프트", "props": {"industry": "핀테크", "size": "40명"}},
]

TEAMS = [
    # org_alpha teams
    {"key": "alpha_backend", "org": "org_alpha", "name": "알파 백엔드팀"},
    {"key": "alpha_frontend", "org": "org_alpha", "name": "알파 프론트엔드팀"},
    # org_beta teams
    {"key": "beta_platform", "org": "org_beta", "name": "베타 플랫폼팀"},
    {"key": "beta_mobile", "org": "org_beta", "name": "베타 모바일팀"},
]

# Each team: 1 leader + 4 members = 5 people, 4 teams = 20 people
PEOPLE = [
    # alpha_backend
    {"key": "ab_lead", "team": "alpha_backend", "name": "김태호", "role": "팀장", "is_leader": True},
    {"key": "ab_m1", "team": "alpha_backend", "name": "이수진", "role": "시니어 백엔드"},
    {"key": "ab_m2", "team": "alpha_backend", "name": "박준영", "role": "백엔드 개발자"},
    {"key": "ab_m3", "team": "alpha_backend", "name": "정하은", "role": "백엔드 개발자"},
    {"key": "ab_m4", "team": "alpha_backend", "name": "최민재", "role": "주니어 백엔드"},
    # alpha_frontend
    {"key": "af_lead", "team": "alpha_frontend", "name": "한소희", "role": "팀장", "is_leader": True},
    {"key": "af_m1", "team": "alpha_frontend", "name": "윤지우", "role": "시니어 프론트엔드"},
    {"key": "af_m2", "team": "alpha_frontend", "name": "장서연", "role": "프론트엔드 개발자"},
    {"key": "af_m3", "team": "alpha_frontend", "name": "오민서", "role": "프론트엔드 개발자"},
    {"key": "af_m4", "team": "alpha_frontend", "name": "배현우", "role": "주니어 프론트엔드"},
    # beta_platform
    {"key": "bp_lead", "team": "beta_platform", "name": "송영진", "role": "팀장", "is_leader": True},
    {"key": "bp_m1", "team": "beta_platform", "name": "임채원", "role": "시니어 플랫폼"},
    {"key": "bp_m2", "team": "beta_platform", "name": "권도현", "role": "플랫폼 개발자"},
    {"key": "bp_m3", "team": "beta_platform", "name": "조은비", "role": "플랫폼 개발자"},
    {"key": "bp_m4", "team": "beta_platform", "name": "황지훈", "role": "주니어 플랫폼"},
    # beta_mobile
    {"key": "bm_lead", "team": "beta_mobile", "name": "류다은", "role": "팀장", "is_leader": True},
    {"key": "bm_m1", "team": "beta_mobile", "name": "남현수", "role": "시니어 모바일"},
    {"key": "bm_m2", "team": "beta_mobile", "name": "문서윤", "role": "iOS 개발자"},
    {"key": "bm_m3", "team": "beta_mobile", "name": "신예진", "role": "Android 개발자"},
    {"key": "bm_m4", "team": "beta_mobile", "name": "강민호", "role": "주니어 모바일"},
]

PROJECTS = [
    {"key": "proj_saas", "org": "org_alpha", "name": "SaaS 플랫폼 v3", "props": {"status": "진행중", "priority": "high"}},
    {"key": "proj_admin", "org": "org_alpha", "name": "어드민 대시보드", "props": {"status": "진행중", "priority": "medium"}},
    {"key": "proj_payment", "org": "org_beta", "name": "결제 시스템 리뉴얼", "props": {"status": "진행중", "priority": "high"}},
    {"key": "proj_app", "org": "org_beta", "name": "모바일 앱 v2", "props": {"status": "진행중", "priority": "high"}},
]

TECH_STACK = [
    {"key": "t_fastapi", "name": "FastAPI", "props": {"category": "framework"}},
    {"key": "t_react", "name": "React", "props": {"category": "framework"}},
    {"key": "t_rn", "name": "React Native", "props": {"category": "framework"}},
    {"key": "t_pg", "name": "PostgreSQL", "props": {"category": "database"}},
    {"key": "t_redis", "name": "Redis", "props": {"category": "database"}},
    {"key": "t_k8s", "name": "Kubernetes", "props": {"category": "infra"}},
    {"key": "t_docker", "name": "Docker", "props": {"category": "infra"}},
    {"key": "t_ts", "name": "TypeScript", "props": {"category": "language"}},
    {"key": "t_python", "name": "Python", "props": {"category": "language"}},
    {"key": "t_kotlin", "name": "Kotlin", "props": {"category": "language"}},
    {"key": "t_swift", "name": "Swift", "props": {"category": "language"}},
    {"key": "t_kafka", "name": "Kafka", "props": {"category": "messaging"}},
    {"key": "t_graphql", "name": "GraphQL", "props": {"category": "api"}},
]

# Task templates per category
TASK_TEMPLATES = {
    "기능추가": [
        "{proj} 사용자 프로필 편집 기능",
        "{proj} 알림 설정 페이지 구현",
        "{proj} 검색 필터 고도화",
        "{proj} 대시보드 위젯 추가",
        "{proj} 파일 업로드 기능",
        "{proj} 다국어 지원 (i18n)",
        "{proj} 실시간 알림 (WebSocket)",
        "{proj} 사용자 권한 관리 UI",
        "{proj} 데이터 내보내기 (CSV/Excel)",
        "{proj} 차트 컴포넌트 구현",
    ],
    "버그수정": [
        "{proj} 로그인 세션 만료 오류 수정",
        "{proj} 페이지네이션 오프셋 버그",
        "{proj} 한글 인코딩 깨짐 수정",
        "{proj} 동시 요청 시 데이터 충돌",
        "{proj} 모바일 레이아웃 깨짐 수정",
    ],
    "리팩토링": [
        "{proj} API 응답 포맷 통일",
        "{proj} 공통 컴포넌트 분리",
        "{proj} DB 쿼리 최적화",
        "{proj} 에러 핸들링 미들웨어 정비",
        "{proj} 테스트 커버리지 개선",
    ],
    "인프라": [
        "{proj} CI/CD 파이프라인 구축",
        "{proj} 모니터링 대시보드 설정",
        "{proj} 로그 수집 파이프라인",
        "{proj} 스테이징 환경 구성",
        "{proj} DB 마이그레이션 자동화",
    ],
    "설계": [
        "{proj} API 스펙 설계 (OpenAPI)",
        "{proj} DB 스키마 설계 검토",
        "{proj} 아키텍처 의사결정 문서",
    ],
}

SUMMARIES = {
    "기능추가": "신규 기능 구현 완료, 코드 리뷰 통과",
    "버그수정": "원인 분석 및 수정, 재현 테스트 통과",
    "리팩토링": "코드 정리 및 성능 개선, 기존 테스트 통과 확인",
    "인프라": "인프라 설정 완료, 팀 내 공유",
    "설계": "설계 문서 작성 완료, 팀 리뷰 진행",
}


def generate_tasks(start_date: date, days: int = 90, count: int = 80):
    """Generate task data distributed over the date range."""
    tasks = []
    members = [p for p in PEOPLE if not p.get("is_leader")]
    team_to_proj = {
        "alpha_backend": "proj_saas",
        "alpha_frontend": "proj_admin",
        "beta_platform": "proj_payment",
        "beta_mobile": "proj_app",
    }
    proj_names = {p["key"]: p["name"] for p in PROJECTS}
    categories = list(TASK_TEMPLATES.keys())

    for i in range(count):
        person = members[i % len(members)]
        team_key = person["team"]
        proj_key = team_to_proj[team_key]
        proj_name = proj_names[proj_key]
        category = random.choice(categories)
        templates = TASK_TEMPLATES[category]
        template = templates[i % len(templates)]
        task_name = template.format(proj=proj_name)

        task_date = start_date + timedelta(days=random.randint(0, days - 1))
        # Older tasks are more likely completed
        days_ago = (start_date + timedelta(days=days) - task_date).days
        if days_ago > 30:
            status = "completed"
        elif days_ago > 7:
            status = random.choice(["completed", "completed", "in_progress"])
        else:
            status = random.choice(["in_progress", "in_progress", "todo"])

        tasks.append({
            "key": f"task_{i+1:03d}",
            "name": task_name,
            "person": person["key"],
            "team": team_key,
            "project": proj_key,
            "category": category,
            "date": task_date.isoformat(),
            "status": status,
            "assignee": person["name"],
            "summary": SUMMARIES[category],
        })

    return tasks


def main():
    token = get_token()
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    ids: dict[str, str] = {}
    edge_count = 0

    def node(key: str, ntype: str, name: str, props: dict = None):
        r = requests.post(f"{BASE}/api/graph/nodes", json={
            "type": ntype, "name": name, "properties": props or {},
        }, headers=h)
        data = r.json()
        ids[key] = data["id"]

    def edge(src: str, tgt: str, etype: str, props: dict = None):
        nonlocal edge_count
        requests.post(f"{BASE}/api/graph/edges", json={
            "source_id": ids[src], "target_id": ids[tgt],
            "type": etype, "properties": props or {},
        }, headers=h)
        edge_count += 1

    # ── 조직 ──
    for org in ORGS:
        node(org["key"], "organization", org["name"], org["props"])

    # ── 팀 ──
    for team in TEAMS:
        node(team["key"], "team", team["name"])

    # ── 사람 ──
    for person in PEOPLE:
        node(person["key"], "person", person["name"], {
            "role": person["role"], "team": person["team"],
        })

    # ── 프로젝트 ──
    for proj in PROJECTS:
        node(proj["key"], "project", proj["name"], proj["props"])

    # ── 기술스택 ──
    for tech in TECH_STACK:
        node(tech["key"], "tech", tech["name"], tech["props"])

    # ── 작업 ──
    start = date(2025, 12, 15)
    tasks = generate_tasks(start, days=90, count=80)
    for t in tasks:
        node(t["key"], "task", t["name"], {
            "team": t["team"], "assignee": t["assignee"],
            "date": t["date"], "category": t["category"],
            "status": t["status"], "summary": t["summary"],
        })

    print(f"✅ {len(ids)} nodes created")

    # ── 관계: 조직 → 팀 ──
    for team in TEAMS:
        edge(team["org"], team["key"], "contains")

    # ── 관계: 팀 → 사람 ──
    for person in PEOPLE:
        etype = "has_leader" if person.get("is_leader") else "has_member"
        edge(person["team"], person["key"], etype)

    # ── 관계: 사람 → 프로젝트 (팀장은 manages, 팀원은 works_on) ──
    team_to_proj = {
        "alpha_backend": "proj_saas",
        "alpha_frontend": "proj_admin",
        "beta_platform": "proj_payment",
        "beta_mobile": "proj_app",
    }
    for person in PEOPLE:
        proj_key = team_to_proj[person["team"]]
        etype = "manages" if person.get("is_leader") else "works_on"
        edge(person["key"], proj_key, etype)

    # ── 관계: 프로젝트 → 기술스택 ──
    proj_tech = {
        "proj_saas": ["t_fastapi", "t_python", "t_pg", "t_redis", "t_k8s", "t_docker", "t_kafka"],
        "proj_admin": ["t_react", "t_ts", "t_graphql"],
        "proj_payment": ["t_fastapi", "t_python", "t_pg", "t_redis", "t_kafka"],
        "proj_app": ["t_rn", "t_ts", "t_kotlin", "t_swift"],
    }
    for proj_key, techs in proj_tech.items():
        for tech_key in techs:
            edge(proj_key, tech_key, "uses")

    # ── 관계: 조직 → 프로젝트 (조직업무) ──
    for proj in PROJECTS:
        edge(proj["org"], proj["key"], "owns")

    # ── 관계: 사람 → 작업 ──
    for t in tasks:
        etype = "completed" if t["status"] == "completed" else "working_on"
        edge(t["person"], t["key"], etype)

    # ── 관계: 작업 → 프로젝트 ──
    for t in tasks:
        edge(t["key"], t["project"], "belongs_to")

    # ── 관계: 작업 간 의존 (일부) ──
    # 같은 프로젝트 내 연속 작업에 의존관계 추가
    by_proj: dict[str, list] = {}
    for t in tasks:
        by_proj.setdefault(t["project"], []).append(t)
    for proj_key, proj_tasks in by_proj.items():
        sorted_tasks = sorted(proj_tasks, key=lambda x: x["date"])
        for i in range(1, len(sorted_tasks), 3):
            edge(sorted_tasks[i]["key"], sorted_tasks[i - 1]["key"], "depends_on")

    print(f"✅ {edge_count} edges created")
    print(f"📊 총 {len(ids)} nodes, {edge_count} edges")


if __name__ == "__main__":
    main()
