from __future__ import annotations

import os

import pytest
from httpx import AsyncClient

from app.services.k8s_connector import parse_k8s_manifests, import_k8s_yaml, _extract_resource_info, _detect_edges

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "complex_k8s_cluster.yaml")


@pytest.fixture
def complex_yaml() -> str:
    with open(FIXTURE_PATH) as f:
        return f.read()


# ── Unit tests for parsing ──────────────────────────────────


def test_parse_k8s_manifests(complex_yaml: str):
    resources = parse_k8s_manifests(complex_yaml)
    assert len(resources) > 40  # We have 40+ resources in the fixture
    kinds = {r["kind"] for r in resources}
    assert "Namespace" in kinds
    assert "Deployment" in kinds
    assert "Pod" in kinds
    assert "Service" in kinds
    assert "Ingress" in kinds
    assert "StatefulSet" in kinds
    assert "DaemonSet" in kinds
    assert "CronJob" in kinds
    assert "Job" in kinds
    assert "HorizontalPodAutoscaler" in kinds
    assert "ConfigMap" in kinds
    assert "Secret" in kinds
    assert "PersistentVolumeClaim" in kinds
    assert "ReplicaSet" in kinds
    assert "Node" in kinds


def test_extract_resource_info():
    resource = {
        "kind": "Deployment",
        "metadata": {
            "name": "api-gateway",
            "namespace": "prod",
            "labels": {"app": "api-gateway"},
        },
        "spec": {
            "replicas": 3,
            "selector": {"matchLabels": {"app": "api-gateway"}},
        },
    }
    info = _extract_resource_info(resource)
    assert info["name"] == "prod/Deployment/api-gateway"
    assert info["type"] == "k8s-deployment"
    assert info["properties"]["replicas"] == 3
    assert info["kind"] == "Deployment"
    assert info["namespace"] == "prod"


def test_extract_namespace_resource_info():
    resource = {
        "kind": "Namespace",
        "metadata": {"name": "prod", "labels": {"env": "production"}},
        "spec": {},
    }
    info = _extract_resource_info(resource)
    # Namespace name should NOT be prefixed with namespace
    assert info["name"] == "prod"
    assert info["type"] == "k8s-namespace"


def test_detect_owner_reference_edges(complex_yaml: str):
    resources = parse_k8s_manifests(complex_yaml)
    resources_info = [_extract_resource_info(r) for r in resources]

    # Simulate node IDs
    node_map = {info["name"]: f"id-{i}" for i, info in enumerate(resources_info)}

    edges = _detect_edges(resources_info, node_map)

    # Find ownerReference edges
    owns_edges = [e for e in edges if e["type"] == "owns"]
    assert len(owns_edges) > 0, "Should detect ownerReference edges"

    # Deployment -> ReplicaSet ownership
    rs_names = [info["name"] for info in resources_info if info["kind"] == "ReplicaSet"]
    for rs_name in rs_names:
        rs_id = node_map[rs_name]
        assert any(
            e["target_id"] == rs_id and e["type"] == "owns" for e in edges
        ), f"ReplicaSet {rs_name} should have an 'owns' edge from its Deployment"


def test_detect_service_selector_edges(complex_yaml: str):
    resources = parse_k8s_manifests(complex_yaml)
    resources_info = [_extract_resource_info(r) for r in resources]
    node_map = {info["name"]: f"id-{i}" for i, info in enumerate(resources_info)}

    edges = _detect_edges(resources_info, node_map)
    selects_edges = [e for e in edges if e["type"] == "selects"]

    # api-gateway Service should select all 3 api-gateway pods
    svc_info = next(
        info for info in resources_info
        if info["kind"] == "Service" and info["raw_name"] == "api-gateway"
    )
    svc_id = node_map[svc_info["name"]]
    svc_targets = [e["target_id"] for e in selects_edges if e["source_id"] == svc_id]
    assert len(svc_targets) >= 3, f"api-gateway Service should select ≥3 pods, got {len(svc_targets)}"


def test_detect_ingress_routes(complex_yaml: str):
    resources = parse_k8s_manifests(complex_yaml)
    resources_info = [_extract_resource_info(r) for r in resources]
    node_map = {info["name"]: f"id-{i}" for i, info in enumerate(resources_info)}

    edges = _detect_edges(resources_info, node_map)
    routes = [e for e in edges if e["type"] == "routes_to"]

    # Ingress should route to 4 services
    assert len(routes) == 4, f"Ingress should route to 4 services, got {len(routes)}"


def test_detect_volume_mount_edges(complex_yaml: str):
    resources = parse_k8s_manifests(complex_yaml)
    resources_info = [_extract_resource_info(r) for r in resources]
    node_map = {info["name"]: f"id-{i}" for i, info in enumerate(resources_info)}

    edges = _detect_edges(resources_info, node_map)
    mounts = [e for e in edges if e["type"] == "mounts"]

    # Many pods mount configmaps, secrets, PVCs
    assert len(mounts) > 15, f"Should have many mount edges, got {len(mounts)}"

    # PostgreSQL pod should mount postgres-data-pvc
    pg_pod = next(info for info in resources_info if info["raw_name"] == "postgresql-primary-0")
    pg_id = node_map[pg_pod["name"]]
    pg_mounts = [e for e in mounts if e["source_id"] == pg_id]
    mount_targets = {e["target_id"] for e in pg_mounts}
    pvc_info = next(info for info in resources_info if info["raw_name"] == "postgres-data-pvc")
    assert node_map[pvc_info["name"]] in mount_targets, "PG pod should mount postgres-data-pvc"


def test_detect_namespace_contains_edges(complex_yaml: str):
    resources = parse_k8s_manifests(complex_yaml)
    resources_info = [_extract_resource_info(r) for r in resources]
    node_map = {info["name"]: f"id-{i}" for i, info in enumerate(resources_info)}

    edges = _detect_edges(resources_info, node_map)
    contains = [e for e in edges if e["type"] == "contains"]

    # Two namespaces: prod and monitoring
    ns_ids = {
        node_map[info["name"]]
        for info in resources_info
        if info["kind"] == "Namespace"
    }
    assert len(ns_ids) == 2

    # All non-namespace resources should have a 'contains' edge from their namespace
    non_ns_resources = [info for info in resources_info if info["kind"] not in ("Namespace", "Node")]
    assert len(contains) >= len(non_ns_resources) - 2  # allow some slack for cluster-scoped


def test_detect_hpa_scales_edges(complex_yaml: str):
    resources = parse_k8s_manifests(complex_yaml)
    resources_info = [_extract_resource_info(r) for r in resources]
    node_map = {info["name"]: f"id-{i}" for i, info in enumerate(resources_info)}

    edges = _detect_edges(resources_info, node_map)
    scales = [e for e in edges if e["type"] == "scales"]
    assert len(scales) == 2, f"Should have 2 HPA→Deployment edges, got {len(scales)}"


def test_detect_cronjob_chain(complex_yaml: str):
    resources = parse_k8s_manifests(complex_yaml)
    resources_info = [_extract_resource_info(r) for r in resources]
    node_map = {info["name"]: f"id-{i}" for i, info in enumerate(resources_info)}

    edges = _detect_edges(resources_info, node_map)
    owns = [e for e in edges if e["type"] == "owns"]

    # CronJob → Job
    cj_info = next(info for info in resources_info if info["kind"] == "CronJob")
    job_info = next(info for info in resources_info if info["kind"] == "Job")
    cj_id = node_map[cj_info["name"]]
    job_id = node_map[job_info["name"]]
    assert any(
        e["source_id"] == cj_id and e["target_id"] == job_id for e in owns
    ), "CronJob should own Job"

    # Job → Pod
    backup_pod = next(
        info for info in resources_info
        if info["raw_name"] == "db-backup-28450000-abc12"
    )
    pod_id = node_map[backup_pod["name"]]
    assert any(
        e["source_id"] == job_id and e["target_id"] == pod_id for e in owns
    ), "Job should own backup Pod"


def test_total_edge_count(complex_yaml: str):
    """Verify total complexity: should have many edges from all relationship types."""
    resources = parse_k8s_manifests(complex_yaml)
    resources_info = [_extract_resource_info(r) for r in resources]
    node_map = {info["name"]: f"id-{i}" for i, info in enumerate(resources_info)}

    edges = _detect_edges(resources_info, node_map)

    edge_types = {}
    for e in edges:
        edge_types[e["type"]] = edge_types.get(e["type"], 0) + 1

    assert edge_types.get("owns", 0) >= 15, f"owns: {edge_types.get('owns', 0)}"
    assert edge_types.get("selects", 0) >= 10, f"selects: {edge_types.get('selects', 0)}"
    assert edge_types.get("routes_to", 0) == 4, f"routes_to: {edge_types.get('routes_to', 0)}"
    assert edge_types.get("mounts", 0) >= 15, f"mounts: {edge_types.get('mounts', 0)}"
    assert edge_types.get("contains", 0) >= 30, f"contains: {edge_types.get('contains', 0)}"
    assert edge_types.get("scales", 0) == 2, f"scales: {edge_types.get('scales', 0)}"

    total = len(edges)
    assert total >= 80, f"Total edges should be ≥80 for complex cluster, got {total}"


# ── Integration tests (API endpoint) ──────────────────────


@pytest.mark.asyncio
async def test_k8s_import_endpoint(auth_client: AsyncClient, complex_yaml: str):
    resp = await auth_client.post(
        "/api/k8s/import",
        files={"file": ("cluster.yaml", complex_yaml.encode(), "text/yaml")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["nodes_created"] > 40
    assert data["edges_created"] > 80


@pytest.mark.asyncio
async def test_k8s_import_with_namespace_filter(auth_client: AsyncClient, complex_yaml: str):
    resp = await auth_client.post(
        "/api/k8s/import",
        files={"file": ("cluster.yaml", complex_yaml.encode(), "text/yaml")},
        params={"namespace": "monitoring"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # monitoring namespace + its resources (Namespace counted always)
    assert data["nodes_created"] >= 7  # ns + daemonset + 2 pods + deployment + rs + pod + service + configmap + pvc
    assert data["nodes_created"] <= 15


@pytest.mark.asyncio
async def test_k8s_import_requires_auth(client: AsyncClient, complex_yaml: str):
    resp = await client.post(
        "/api/k8s/import",
        files={"file": ("cluster.yaml", complex_yaml.encode(), "text/yaml")},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_imported_nodes_searchable(auth_client: AsyncClient, complex_yaml: str):
    """After import, K8s resources should be searchable via graph search."""
    await auth_client.post(
        "/api/k8s/import",
        files={"file": ("cluster.yaml", complex_yaml.encode(), "text/yaml")},
    )

    # Search for api-gateway
    resp = await auth_client.get("/api/graph/search", params={"q": "api-gateway"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    names = [n["name"] for n in data["nodes"]]
    assert any("api-gateway" in name for name in names)


@pytest.mark.asyncio
async def test_imported_edges_in_graph(auth_client: AsyncClient, complex_yaml: str):
    """Imported edges should show up when listing edges."""
    await auth_client.post(
        "/api/k8s/import",
        files={"file": ("cluster.yaml", complex_yaml.encode(), "text/yaml")},
    )

    resp = await auth_client.get("/api/graph/edges")
    assert resp.status_code == 200
    edges = resp.json()
    edge_types = {e["type"] for e in edges}
    assert "owns" in edge_types
    assert "selects" in edge_types
    assert "contains" in edge_types
    assert "mounts" in edge_types


@pytest.mark.asyncio
async def test_path_finding_through_k8s_resources(auth_client: AsyncClient, complex_yaml: str):
    """After import, should be able to find paths between K8s resources."""
    import_resp = await auth_client.post(
        "/api/k8s/import",
        files={"file": ("cluster.yaml", complex_yaml.encode(), "text/yaml")},
    )
    data = import_resp.json()
    nodes = data["nodes"]

    # Find Ingress and a Pod - they should be connected via Ingress→Service→Pod(selects)
    ingress = next((n for n in nodes if n["type"] == "k8s-ingress"), None)
    pod = next((n for n in nodes if n["type"] == "k8s-pod" and "api-gateway" in n["name"]), None)

    if ingress and pod:
        resp = await auth_client.get(
            "/api/path/find",
            params={"source_id": ingress["id"], "target_id": pod["id"]},
        )
        assert resp.status_code == 200
        path_data = resp.json()
        assert path_data["found"] is True
        assert len(path_data["nodes"]) >= 2
