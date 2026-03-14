#!/usr/bin/env python3
"""Seed large-scale test data via REST API.

1 organization (알파테크), 2 teams (개발팀 + 재무팀),
1 leader + 4 members per team = 10 people,
10 tasks per week (5 working days), 90 days = ~18 weeks = ~180 tasks.

Node hierarchy:
  조직 → 프로젝트 (조직업무)
  팀 → 팀장 / 팀원
  팀원 → 작업 (개인업무)
  작업 → 프로젝트

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
]

TEAMS = [
    {"key": "dev_team", "org": "org_alpha", "name": "개발팀"},
    {"key": "finance_team", "org": "org_alpha", "name": "재무팀"},
]

# Each team: 1 leader + 4 members = 5 people, 2 teams = 10 people
PEOPLE = [
    # 개발팀
    {"key": "dev_lead", "team": "dev_team", "name": "김태호", "role": "개발팀장", "is_leader": True},
    {"key": "dev_m1", "team": "dev_team", "name": "이수진", "role": "시니어 백엔드"},
    {"key": "dev_m2", "team": "dev_team", "name": "박준영", "role": "프론트엔드 개발자"},
    {"key": "dev_m3", "team": "dev_team", "name": "정하은", "role": "풀스택 개발자"},
    {"key": "dev_m4", "team": "dev_team", "name": "최민재", "role": "주니어 개발자"},
    # 재무팀
    {"key": "fin_lead", "team": "finance_team", "name": "한소희", "role": "재무팀장", "is_leader": True},
    {"key": "fin_m1", "team": "finance_team", "name": "윤지우", "role": "시니어 회계사"},
    {"key": "fin_m2", "team": "finance_team", "name": "장서연", "role": "세무 담당"},
    {"key": "fin_m3", "team": "finance_team", "name": "오민서", "role": "예산 분석가"},
    {"key": "fin_m4", "team": "finance_team", "name": "배현우", "role": "주니어 회계"},
]

PROJECTS = [
    # 개발팀 프로젝트
    {"key": "proj_platform", "org": "org_alpha", "name": "SaaS 플랫폼 v3", "props": {"status": "진행중", "priority": "high"}},
    {"key": "proj_admin", "org": "org_alpha", "name": "어드민 대시보드", "props": {"status": "진행중", "priority": "medium"}},
    # 재무팀 프로젝트
    {"key": "proj_settlement", "org": "org_alpha", "name": "정산 시스템 개선", "props": {"status": "진행중", "priority": "high"}},
    {"key": "proj_audit", "org": "org_alpha", "name": "Q1 감사 준비", "props": {"status": "진행중", "priority": "medium"}},
]

TECH_STACK = [
    # 개발 도구
    {"key": "t_fastapi", "name": "FastAPI", "props": {"category": "framework"}},
    {"key": "t_react", "name": "React", "props": {"category": "framework"}},
    {"key": "t_pg", "name": "PostgreSQL", "props": {"category": "database"}},
    {"key": "t_redis", "name": "Redis", "props": {"category": "database"}},
    {"key": "t_k8s", "name": "Kubernetes", "props": {"category": "infra"}},
    {"key": "t_docker", "name": "Docker", "props": {"category": "infra"}},
    {"key": "t_ts", "name": "TypeScript", "props": {"category": "language"}},
    {"key": "t_python", "name": "Python", "props": {"category": "language"}},
    # 재무 도구
    {"key": "t_excel", "name": "Excel", "props": {"category": "tool"}},
    {"key": "t_sap", "name": "SAP", "props": {"category": "erp"}},
    {"key": "t_tableau", "name": "Tableau", "props": {"category": "analytics"}},
]

# ── 개발팀 작업 템플릿 ──
DEV_TASK_TEMPLATES = {
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
        "{proj} 배포 후 캐시 무효화 누락 수정",
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
}

# ── 재무팀 작업 템플릿 ──
FIN_TASK_TEMPLATES = {
    "정산": [
        "{proj} 월간 매출 정산 처리",
        "{proj} 파트너사 수수료 정산",
        "{proj} 환불 내역 정리 및 대사",
        "{proj} 결제 수수료 재계산",
        "{proj} 정산 리포트 생성 자동화",
    ],
    "세무": [
        "{proj} 부가세 신고 자료 준비",
        "{proj} 세금계산서 발행 오류 점검",
        "{proj} 원천징수 내역 검토",
        "{proj} 법인세 중간예납 준비",
        "{proj} 해외 거래 세무 처리",
    ],
    "감사": [
        "{proj} 내부 통제 점검 체크리스트 작성",
        "{proj} 외부 감사 자료 준비",
        "{proj} 전기 감사 지적사항 후속 조치",
        "{proj} 매출채권 연령 분석",
        "{proj} 재고자산 실사 준비",
    ],
    "예산": [
        "{proj} 부서별 예산 집행 현황 분석",
        "{proj} Q2 예산안 초안 작성",
        "{proj} 비용 절감 방안 보고서",
        "{proj} 투자 수익률(ROI) 분석",
        "{proj} 인건비 예산 대비 실적 비교",
    ],
    "보고": [
        "{proj} 주간 재무 현황 보고서",
        "{proj} 월간 손익 분석 보고",
        "{proj} 현금 흐름 예측 갱신",
    ],
}

SUMMARIES = {
    # 개발
    "기능추가": "신규 기능 구현 완료, 코드 리뷰 통과",
    "버그수정": "원인 분석 및 수정, 재현 테스트 통과",
    "리팩토링": "코드 정리 및 성능 개선, 기존 테스트 통과 확인",
    "인프라": "인프라 설정 완료, 팀 내 공유",
    # 재무
    "정산": "정산 처리 완료, 금액 대사 확인",
    "세무": "세무 자료 준비 완료, 세무사 검토 요청",
    "감사": "감사 자료 정리 완료, 경영진 보고",
    "예산": "예산 분석 완료, 관련 부서 회람",
    "보고": "보고서 작성 완료, 경영진 제출",
}


def generate_tasks(start_date: date, days: int = 90, tasks_per_week: int = 10):
    """Generate tasks: tasks_per_week tasks for each working week in the period.

    90 days ≈ 18 weeks → ~180 tasks, distributed on weekdays (Mon-Fri).
    Each task is assigned round-robin to team members (not leaders).
    """
    tasks = []
    members = [p for p in PEOPLE if not p.get("is_leader")]
    team_to_proj = {
        "dev_team": ["proj_platform", "proj_admin"],
        "finance_team": ["proj_settlement", "proj_audit"],
    }
    team_templates = {
        "dev_team": DEV_TASK_TEMPLATES,
        "finance_team": FIN_TASK_TEMPLATES,
    }
    proj_names = {p["key"]: p["name"] for p in PROJECTS}
    end_date = start_date + timedelta(days=days)
    member_idx = 0
    task_idx = 0

    # Iterate week by week
    current = start_date
    while current < end_date:
        # Collect working days (Mon=0 .. Fri=4) for this week
        week_days = []
        for d in range(7):
            day = current + timedelta(days=d)
            if day >= end_date:
                break
            if day.weekday() < 5:  # Mon-Fri
                week_days.append(day)
        if not week_days:
            break

        # Generate tasks_per_week tasks for this week
        for j in range(tasks_per_week):
            person = members[member_idx % len(members)]
            member_idx += 1
            team_key = person["team"]
            proj_key = random.choice(team_to_proj[team_key])
            proj_name = proj_names[proj_key]
            cat_templates = team_templates[team_key]
            categories = list(cat_templates.keys())
            category = random.choice(categories)
            cat_list = cat_templates[category]
            template = cat_list[task_idx % len(cat_list)]
            task_name = template.format(proj=proj_name)

            task_date = random.choice(week_days)

            # Status based on how old the task is
            days_ago = (end_date - task_date).days
            if days_ago > 30:
                status = "completed"
            elif days_ago > 7:
                status = random.choice(["completed", "completed", "in_progress"])
            else:
                status = random.choice(["in_progress", "in_progress", "todo"])

            task_idx += 1
            tasks.append({
                "key": f"task_{task_idx:03d}",
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

        current += timedelta(days=7)

    return tasks


def cleanup(token: str):
    """Delete all existing graphs, edges, and nodes."""
    h = {"Authorization": f"Bearer {token}"}
    # Delete graphs first (CASCADE deletes associated nodes/edges)
    graphs = requests.get(f"{BASE}/api/graph/graphs", headers=h).json()
    for g in graphs:
        requests.delete(f"{BASE}/api/graph/graphs/{g['id']}", headers=h)
    total_graphs = len(graphs)
    # Then clean up any orphan edges/nodes (graph_id=null)
    total_edges = total_nodes = 0
    while True:
        edges = requests.get(f"{BASE}/api/graph/edges", headers=h).json()
        if not edges:
            break
        for e in edges:
            requests.delete(f"{BASE}/api/graph/edges/{e['id']}", headers=h)
        total_edges += len(edges)
    while True:
        nodes = requests.get(f"{BASE}/api/graph/nodes", headers=h).json()
        if not nodes:
            break
        for n in nodes:
            requests.delete(f"{BASE}/api/graph/nodes/{n['id']}", headers=h)
        total_nodes += len(nodes)
    print(f"🗑️  Cleaned up {total_graphs} graphs, {total_edges} orphan edges, {total_nodes} orphan nodes")


def main():
    token = get_token()
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Clean existing data
    cleanup(token)

    # Create a Graph namespace
    r = requests.post(f"{BASE}/api/graph/graphs", json={
        "name": "알파테크", "scope": "org",
    }, headers=h)
    graph_id = r.json()["id"]
    print(f"📁 Graph created: {graph_id}")

    ids: dict[str, str] = {}
    edge_count = 0

    def node(key: str, ntype: str, name: str, props: dict = None):
        r = requests.post(f"{BASE}/api/graph/nodes", json={
            "type": ntype, "name": name, "properties": props or {},
            "graph_id": graph_id,
        }, headers=h)
        data = r.json()
        ids[key] = data["id"]

    def edge(src: str, tgt: str, etype: str, props: dict = None):
        nonlocal edge_count
        requests.post(f"{BASE}/api/graph/edges", json={
            "source_id": ids[src], "target_id": ids[tgt],
            "type": etype, "properties": props or {},
            "graph_id": graph_id,
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
    tasks = generate_tasks(start, days=90, tasks_per_week=10)
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
        "dev_team": ["proj_platform", "proj_admin"],
        "finance_team": ["proj_settlement", "proj_audit"],
    }
    for person in PEOPLE:
        etype = "manages" if person.get("is_leader") else "works_on"
        for proj_key in team_to_proj[person["team"]]:
            edge(person["key"], proj_key, etype)

    # ── 관계: 프로젝트 → 기술스택 ──
    proj_tech = {
        "proj_platform": ["t_fastapi", "t_python", "t_pg", "t_redis", "t_k8s", "t_docker"],
        "proj_admin": ["t_react", "t_ts", "t_python"],
        "proj_settlement": ["t_sap", "t_excel", "t_pg", "t_python"],
        "proj_audit": ["t_excel", "t_tableau", "t_sap"],
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
