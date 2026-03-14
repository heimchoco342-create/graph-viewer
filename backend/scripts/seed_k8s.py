#!/usr/bin/env python3
"""Seed Kubernetes infrastructure graph via REST API.

Creates a separate "K8s Cluster" graph with namespaces, deployments,
services, pods, configmaps, secrets, ingress, HPA, PVC, cronjobs, and nodes.

Usage:
    cd backend && .venv/bin/python scripts/seed_k8s.py
"""
from __future__ import annotations

import os
import requests

BASE = os.environ.get("WNG_API_URL", "http://localhost:8000")
EMAIL = "test@wng.com"
PASSWORD = "test1234"


def get_token() -> str:
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code == 200:
        return r.json()["access_token"]
    requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL, "password": PASSWORD, "name": "테스트관리자"})
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    return r.json()["access_token"]


def main():
    token = get_token()
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    ids: dict[str, str] = {}

    # Create K8s graph
    r = requests.post(f"{BASE}/api/graph/graphs", json={
        "name": "K8s Cluster", "scope": "org",
    }, headers=h)
    graph_id = r.json()["id"]
    print(f"📁 Graph created: {graph_id}")

    def node(key: str, ntype: str, name: str, props: dict = None):
        r = requests.post(f"{BASE}/api/graph/nodes", json={
            "type": ntype, "name": name, "properties": props or {},
            "graph_id": graph_id,
        }, headers=h)
        ids[key] = r.json()["id"]

    edge_count = 0

    def edge(src: str, tgt: str, etype: str, props: dict = None):
        nonlocal edge_count
        requests.post(f"{BASE}/api/graph/edges", json={
            "source_id": ids[src], "target_id": ids[tgt],
            "type": etype, "properties": props or {},
            "graph_id": graph_id,
        }, headers=h)
        edge_count += 1

    # ── Namespaces ──
    node("ns_prod", "k8s-namespace", "production", {"k8s_kind": "Namespace"})
    node("ns_staging", "k8s-namespace", "staging", {"k8s_kind": "Namespace"})
    node("ns_monitoring", "k8s-namespace", "monitoring", {"k8s_kind": "Namespace"})

    # ── Cluster nodes ──
    node("node_w1", "k8s-node", "worker-node-01", {
        "k8s_kind": "Node", "k8s_labels": {"role": "worker"},
    })
    node("node_w2", "k8s-node", "worker-node-02", {
        "k8s_kind": "Node", "k8s_labels": {"role": "worker"},
    })
    node("node_w3", "k8s-node", "worker-node-03", {
        "k8s_kind": "Node", "k8s_labels": {"role": "worker"},
    })

    # ── production: order-api ──
    node("deploy_api", "k8s-deployment", "production/Deployment/order-api", {
        "k8s_kind": "Deployment", "k8s_namespace": "production",
        "replicas": 3, "k8s_labels": {"app": "order-api"},
    })
    node("svc_api", "k8s-service", "production/Service/order-api-svc", {
        "k8s_kind": "Service", "k8s_namespace": "production",
        "service_type": "ClusterIP", "selector": {"app": "order-api"},
        "ports": [{"port": 8000, "targetPort": 8000}],
    })
    node("pod_api_1", "k8s-pod", "production/Pod/order-api-6d8f9-abc01", {
        "k8s_kind": "Pod", "k8s_namespace": "production",
        "k8s_labels": {"app": "order-api"}, "containers": ["order-api"],
    })
    node("pod_api_2", "k8s-pod", "production/Pod/order-api-6d8f9-abc02", {
        "k8s_kind": "Pod", "k8s_namespace": "production",
        "k8s_labels": {"app": "order-api"}, "containers": ["order-api"],
    })
    node("pod_api_3", "k8s-pod", "production/Pod/order-api-6d8f9-abc03", {
        "k8s_kind": "Pod", "k8s_namespace": "production",
        "k8s_labels": {"app": "order-api"}, "containers": ["order-api"],
    })
    node("hpa_api", "k8s-hpa", "production/HPA/order-api-hpa", {
        "k8s_kind": "HorizontalPodAutoscaler", "k8s_namespace": "production",
        "min_replicas": 2, "max_replicas": 10,
        "scale_target": "Deployment/order-api",
    })

    # ── production: wng-web ──
    node("deploy_web", "k8s-deployment", "production/Deployment/wng-web", {
        "k8s_kind": "Deployment", "k8s_namespace": "production",
        "replicas": 2, "k8s_labels": {"app": "wng-web"},
    })
    node("svc_web", "k8s-service", "production/Service/wng-web-svc", {
        "k8s_kind": "Service", "k8s_namespace": "production",
        "service_type": "ClusterIP", "selector": {"app": "wng-web"},
        "ports": [{"port": 80, "targetPort": 5173}],
    })
    node("pod_web_1", "k8s-pod", "production/Pod/wng-web-7c4e2-xyz01", {
        "k8s_kind": "Pod", "k8s_namespace": "production",
        "k8s_labels": {"app": "wng-web"}, "containers": ["wng-web"],
    })
    node("pod_web_2", "k8s-pod", "production/Pod/wng-web-7c4e2-xyz02", {
        "k8s_kind": "Pod", "k8s_namespace": "production",
        "k8s_labels": {"app": "wng-web"}, "containers": ["wng-web"],
    })

    # ── production: postgres ──
    node("sts_pg", "k8s-statefulset", "production/StatefulSet/postgres", {
        "k8s_kind": "StatefulSet", "k8s_namespace": "production",
        "replicas": 1, "k8s_labels": {"app": "postgres"},
    })
    node("pod_pg", "k8s-pod", "production/Pod/postgres-0", {
        "k8s_kind": "Pod", "k8s_namespace": "production",
        "k8s_labels": {"app": "postgres"}, "containers": ["postgres"],
    })
    node("svc_pg", "k8s-service", "production/Service/postgres-svc", {
        "k8s_kind": "Service", "k8s_namespace": "production",
        "service_type": "ClusterIP", "selector": {"app": "postgres"},
        "ports": [{"port": 5432, "targetPort": 5432}],
    })
    node("pvc_pg", "k8s-pvc", "production/PVC/postgres-data", {
        "k8s_kind": "PersistentVolumeClaim", "k8s_namespace": "production",
    })

    # ── production: shared resources ──
    node("ingress_main", "k8s-ingress", "production/Ingress/wng-ingress", {
        "k8s_kind": "Ingress", "k8s_namespace": "production",
        "rules": [
            {"host": "wng.example.com", "paths": ["/", "/api"]},
        ],
    })
    node("cm_api", "k8s-configmap", "production/ConfigMap/order-api-config", {
        "k8s_kind": "ConfigMap", "k8s_namespace": "production",
    })
    node("cm_web", "k8s-configmap", "production/ConfigMap/wng-web-config", {
        "k8s_kind": "ConfigMap", "k8s_namespace": "production",
    })
    node("secret_db", "k8s-secret", "production/Secret/db-credentials", {
        "k8s_kind": "Secret", "k8s_namespace": "production",
    })
    node("secret_tls", "k8s-secret", "production/Secret/tls-cert", {
        "k8s_kind": "Secret", "k8s_namespace": "production",
    })
    node("cj_backup", "k8s-cronjob", "production/CronJob/db-backup", {
        "k8s_kind": "CronJob", "k8s_namespace": "production",
        "schedule": "0 2 * * *",
    })

    # ── staging ──
    node("deploy_api_stg", "k8s-deployment", "staging/Deployment/order-api", {
        "k8s_kind": "Deployment", "k8s_namespace": "staging",
        "replicas": 1, "k8s_labels": {"app": "order-api"},
    })
    node("svc_api_stg", "k8s-service", "staging/Service/order-api-svc", {
        "k8s_kind": "Service", "k8s_namespace": "staging",
        "service_type": "ClusterIP", "selector": {"app": "order-api"},
    })
    node("pod_api_stg", "k8s-pod", "staging/Pod/order-api-5a3b1-stg01", {
        "k8s_kind": "Pod", "k8s_namespace": "staging",
        "k8s_labels": {"app": "order-api"}, "containers": ["order-api"],
    })
    node("deploy_web_stg", "k8s-deployment", "staging/Deployment/wng-web", {
        "k8s_kind": "Deployment", "k8s_namespace": "staging",
        "replicas": 1, "k8s_labels": {"app": "wng-web"},
    })
    node("pod_web_stg", "k8s-pod", "staging/Pod/wng-web-stg-001", {
        "k8s_kind": "Pod", "k8s_namespace": "staging",
        "k8s_labels": {"app": "wng-web"}, "containers": ["wng-web"],
    })

    # ── monitoring ──
    node("deploy_prom", "k8s-deployment", "monitoring/Deployment/prometheus", {
        "k8s_kind": "Deployment", "k8s_namespace": "monitoring",
        "replicas": 1, "k8s_labels": {"app": "prometheus"},
    })
    node("deploy_grafana", "k8s-deployment", "monitoring/Deployment/grafana", {
        "k8s_kind": "Deployment", "k8s_namespace": "monitoring",
        "replicas": 1, "k8s_labels": {"app": "grafana"},
    })
    node("svc_prom", "k8s-service", "monitoring/Service/prometheus-svc", {
        "k8s_kind": "Service", "k8s_namespace": "monitoring",
        "service_type": "ClusterIP", "selector": {"app": "prometheus"},
        "ports": [{"port": 9090, "targetPort": 9090}],
    })
    node("svc_grafana", "k8s-service", "monitoring/Service/grafana-svc", {
        "k8s_kind": "Service", "k8s_namespace": "monitoring",
        "service_type": "ClusterIP", "selector": {"app": "grafana"},
        "ports": [{"port": 3000, "targetPort": 3000}],
    })
    node("pod_prom", "k8s-pod", "monitoring/Pod/prometheus-0", {
        "k8s_kind": "Pod", "k8s_namespace": "monitoring",
        "k8s_labels": {"app": "prometheus"}, "containers": ["prometheus"],
    })
    node("pod_grafana", "k8s-pod", "monitoring/Pod/grafana-abc01", {
        "k8s_kind": "Pod", "k8s_namespace": "monitoring",
        "k8s_labels": {"app": "grafana"}, "containers": ["grafana"],
    })
    node("ds_fluentd", "k8s-daemonset", "monitoring/DaemonSet/fluentd", {
        "k8s_kind": "DaemonSet", "k8s_namespace": "monitoring",
        "k8s_labels": {"app": "fluentd"},
    })

    print(f"✅ {len(ids)} nodes created")

    # ══════════════════════════════════════════════════
    # Edges
    # ══════════════════════════════════════════════════

    # namespace contains resources
    for res in ["deploy_api", "svc_api", "pod_api_1", "pod_api_2", "pod_api_3",
                 "hpa_api", "deploy_web", "svc_web", "pod_web_1", "pod_web_2",
                 "sts_pg", "pod_pg", "svc_pg", "pvc_pg",
                 "ingress_main", "cm_api", "cm_web", "secret_db", "secret_tls",
                 "cj_backup"]:
        edge("ns_prod", res, "contains")
    for res in ["deploy_api_stg", "svc_api_stg", "pod_api_stg",
                 "deploy_web_stg", "pod_web_stg"]:
        edge("ns_staging", res, "contains")
    for res in ["deploy_prom", "deploy_grafana", "svc_prom", "svc_grafana",
                 "pod_prom", "pod_grafana", "ds_fluentd"]:
        edge("ns_monitoring", res, "contains")

    # deployment/statefulset → pod (owns)
    edge("deploy_api", "pod_api_1", "owns")
    edge("deploy_api", "pod_api_2", "owns")
    edge("deploy_api", "pod_api_3", "owns")
    edge("deploy_web", "pod_web_1", "owns")
    edge("deploy_web", "pod_web_2", "owns")
    edge("sts_pg", "pod_pg", "owns")
    edge("deploy_api_stg", "pod_api_stg", "owns")
    edge("deploy_web_stg", "pod_web_stg", "owns")
    edge("deploy_prom", "pod_prom", "owns")
    edge("deploy_grafana", "pod_grafana", "owns")

    # service → pod (selects)
    edge("svc_api", "pod_api_1", "selects")
    edge("svc_api", "pod_api_2", "selects")
    edge("svc_api", "pod_api_3", "selects")
    edge("svc_web", "pod_web_1", "selects")
    edge("svc_web", "pod_web_2", "selects")
    edge("svc_pg", "pod_pg", "selects")
    edge("svc_api_stg", "pod_api_stg", "selects")
    edge("svc_prom", "pod_prom", "selects")
    edge("svc_grafana", "pod_grafana", "selects")

    # ingress → service (routes_to)
    edge("ingress_main", "svc_web", "routes_to")
    edge("ingress_main", "svc_api", "routes_to")

    # pod → configmap/secret (mounts)
    edge("pod_api_1", "cm_api", "mounts")
    edge("pod_api_1", "secret_db", "mounts")
    edge("pod_api_2", "cm_api", "mounts")
    edge("pod_api_2", "secret_db", "mounts")
    edge("pod_api_3", "cm_api", "mounts")
    edge("pod_api_3", "secret_db", "mounts")
    edge("pod_web_1", "cm_web", "mounts")
    edge("pod_web_2", "cm_web", "mounts")
    edge("pod_pg", "secret_db", "mounts")
    edge("ingress_main", "secret_tls", "mounts")

    # pod → pvc (mounts)
    edge("pod_pg", "pvc_pg", "mounts")

    # pod → node (scheduled_on)
    edge("pod_api_1", "node_w1", "scheduled_on")
    edge("pod_api_2", "node_w2", "scheduled_on")
    edge("pod_api_3", "node_w3", "scheduled_on")
    edge("pod_web_1", "node_w1", "scheduled_on")
    edge("pod_web_2", "node_w2", "scheduled_on")
    edge("pod_pg", "node_w3", "scheduled_on")
    edge("pod_api_stg", "node_w1", "scheduled_on")
    edge("pod_web_stg", "node_w1", "scheduled_on")
    edge("pod_prom", "node_w2", "scheduled_on")
    edge("pod_grafana", "node_w3", "scheduled_on")

    # hpa → deployment (scales)
    edge("hpa_api", "deploy_api", "scales")

    # daemonset runs on all nodes
    edge("ds_fluentd", "node_w1", "runs_on")
    edge("ds_fluentd", "node_w2", "runs_on")
    edge("ds_fluentd", "node_w3", "runs_on")

    # api pods → postgres service (connects_to)
    edge("pod_api_1", "svc_pg", "connects_to")
    edge("pod_api_2", "svc_pg", "connects_to")
    edge("pod_api_3", "svc_pg", "connects_to")

    print(f"✅ {edge_count} edges created")
    print(f"📊 총 {len(ids)} nodes, {edge_count} edges")


if __name__ == "__main__":
    main()
