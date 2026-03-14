from __future__ import annotations

"""Kubernetes connector: parse K8s resource manifests and auto-create graph nodes + edges.

Supports reading from:
1. Raw YAML/JSON manifests (for testing without a live cluster)
2. Live cluster via kubeconfig (future enhancement)

Automatically detects relationships:
- ownerReferences → parent-child edges
- Service selector → service-to-pod edges
- Ingress rules → ingress-to-service edges
- Pod volumes → pod-to-configmap/secret/pvc edges
- Pod spec.nodeName → pod-to-node edges
- All resources → namespace membership edges
"""

import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

import yaml
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.node import Node
from app.models.edge import Edge
from app.services import graph_service

logger = logging.getLogger(__name__)

# K8s kind → our node type mapping
KIND_TO_TYPE: Dict[str, str] = {
    "Pod": "k8s-pod",
    "Service": "k8s-service",
    "Deployment": "k8s-deployment",
    "DaemonSet": "k8s-daemonset",
    "StatefulSet": "k8s-statefulset",
    "ConfigMap": "k8s-configmap",
    "Secret": "k8s-secret",
    "Ingress": "k8s-ingress",
    "Namespace": "k8s-namespace",
    "Node": "k8s-node",
    "PersistentVolumeClaim": "k8s-pvc",
    "CronJob": "k8s-cronjob",
    "Job": "k8s-job",
    "ReplicaSet": "k8s-replicaset",
    "HorizontalPodAutoscaler": "k8s-hpa",
}


def parse_k8s_manifests(yaml_content: str) -> List[Dict[str, Any]]:
    """Parse multi-document YAML into list of K8s resource dicts."""
    resources = []
    for doc in yaml.safe_load_all(yaml_content):
        if doc and isinstance(doc, dict) and "kind" in doc:
            resources.append(doc)
    return resources


def _extract_resource_info(resource: Dict[str, Any]) -> Dict[str, Any]:
    """Extract node-relevant info from a K8s resource manifest."""
    kind = resource.get("kind", "Unknown")
    metadata = resource.get("metadata", {})
    spec = resource.get("spec", {})

    name = metadata.get("name", "unnamed")
    namespace = metadata.get("namespace", "default")
    labels = metadata.get("labels", {})
    annotations = metadata.get("annotations", {})
    owner_refs = metadata.get("ownerReferences", [])

    node_type = KIND_TO_TYPE.get(kind, f"k8s-{kind.lower()}")

    properties: Dict[str, Any] = {
        "k8s_kind": kind,
        "k8s_namespace": namespace,
        "k8s_labels": labels,
    }

    if annotations:
        properties["k8s_annotations"] = annotations

    # Kind-specific properties
    if kind == "Deployment":
        properties["replicas"] = spec.get("replicas", 1)
        properties["selector"] = spec.get("selector", {})
    elif kind == "Service":
        properties["service_type"] = spec.get("type", "ClusterIP")
        properties["selector"] = spec.get("selector", {})
        properties["ports"] = spec.get("ports", [])
    elif kind == "Pod":
        properties["node_name"] = spec.get("nodeName", "")
        properties["containers"] = [
            c.get("name", "") for c in spec.get("containers", [])
        ]
    elif kind == "Ingress":
        properties["rules"] = spec.get("rules", [])
    elif kind == "HorizontalPodAutoscaler":
        properties["min_replicas"] = spec.get("minReplicas", 1)
        properties["max_replicas"] = spec.get("maxReplicas", 1)
        ref = spec.get("scaleTargetRef", {})
        properties["scale_target"] = f"{ref.get('kind', '')}/{ref.get('name', '')}"
    elif kind == "CronJob":
        properties["schedule"] = spec.get("schedule", "")

    return {
        "name": f"{namespace}/{kind}/{name}" if kind != "Namespace" else name,
        "type": node_type,
        "properties": properties,
        "owner_refs": owner_refs,
        "labels": labels,
        "spec": spec,
        "kind": kind,
        "namespace": namespace,
        "raw_name": name,
    }


def _detect_edges(
    resources_info: List[Dict[str, Any]],
    node_map: Dict[str, str],
) -> List[Dict[str, Any]]:
    """Detect relationships between K8s resources and return edge definitions.

    Args:
        resources_info: List of extracted resource info dicts
        node_map: Maps "namespace/name" (or kind/namespace/name key) to node DB id

    Returns:
        List of edge dicts with source_id, target_id, type
    """
    edges = []

    # Build indexes for matching
    # key: "namespace/name" -> resource_info
    by_name: Dict[str, Dict[str, Any]] = {}
    # key: (namespace, kind, name) -> node_id
    by_kind_name: Dict[Tuple[str, str, str], str] = {}
    # key: namespace -> list of pod resource_infos
    pods_by_ns: Dict[str, List[Dict[str, Any]]] = {}

    for r in resources_info:
        name_key = r["name"]
        by_name[name_key] = r
        by_kind_name[(r["namespace"], r["kind"], r["raw_name"])] = node_map.get(name_key, "")
        if r["kind"] == "Pod":
            pods_by_ns.setdefault(r["namespace"], []).append(r)

    for r in resources_info:
        source_id = node_map.get(r["name"])
        if not source_id:
            continue

        # 1. ownerReferences
        for ref in r.get("owner_refs", []):
            owner_key = (r["namespace"], ref.get("kind", ""), ref.get("name", ""))
            owner_id = by_kind_name.get(owner_key)
            if owner_id:
                edges.append({
                    "source_id": owner_id,
                    "target_id": source_id,
                    "type": "owns",
                })

        # 2. Service → Pod (selector matching)
        if r["kind"] == "Service":
            selector = r["spec"].get("selector", {})
            if selector:
                for pod in pods_by_ns.get(r["namespace"], []):
                    pod_labels = pod.get("labels", {})
                    if _labels_match(selector, pod_labels):
                        pod_id = node_map.get(pod["name"])
                        if pod_id:
                            edges.append({
                                "source_id": source_id,
                                "target_id": pod_id,
                                "type": "selects",
                            })

        # 3. Ingress → Service
        if r["kind"] == "Ingress":
            for rule in r["spec"].get("rules", []):
                http = rule.get("http", {})
                for path in http.get("paths", []):
                    backend = path.get("backend", {})
                    svc = backend.get("service", {})
                    svc_name = svc.get("name", "")
                    if svc_name:
                        svc_key = (r["namespace"], "Service", svc_name)
                        svc_id = by_kind_name.get(svc_key)
                        if svc_id:
                            edges.append({
                                "source_id": source_id,
                                "target_id": svc_id,
                                "type": "routes_to",
                            })

        # 4. Pod → ConfigMap/Secret/PVC (volumes)
        if r["kind"] == "Pod":
            for vol in r["spec"].get("volumes", []):
                cm = vol.get("configMap", {})
                if cm.get("name"):
                    cm_key = (r["namespace"], "ConfigMap", cm["name"])
                    cm_id = by_kind_name.get(cm_key)
                    if cm_id:
                        edges.append({
                            "source_id": source_id,
                            "target_id": cm_id,
                            "type": "mounts",
                        })
                secret = vol.get("secret", {})
                if secret.get("secretName"):
                    s_key = (r["namespace"], "Secret", secret["secretName"])
                    s_id = by_kind_name.get(s_key)
                    if s_id:
                        edges.append({
                            "source_id": source_id,
                            "target_id": s_id,
                            "type": "mounts",
                        })
                pvc = vol.get("persistentVolumeClaim", {})
                if pvc.get("claimName"):
                    pvc_key = (r["namespace"], "PersistentVolumeClaim", pvc["claimName"])
                    pvc_id = by_kind_name.get(pvc_key)
                    if pvc_id:
                        edges.append({
                            "source_id": source_id,
                            "target_id": pvc_id,
                            "type": "mounts",
                        })

            # 5. Pod → Node (scheduling)
            node_name = r["spec"].get("nodeName", "")
            if node_name:
                node_key = (r["namespace"], "Node", node_name)
                n_id = by_kind_name.get(node_key)
                if not n_id:
                    # Node is cluster-scoped, try without namespace
                    for key, nid in by_kind_name.items():
                        if key[1] == "Node" and key[2] == node_name:
                            n_id = nid
                            break
                if n_id:
                    edges.append({
                        "source_id": source_id,
                        "target_id": n_id,
                        "type": "scheduled_on",
                    })

        # 6. HPA → target
        if r["kind"] == "HorizontalPodAutoscaler":
            ref = r["spec"].get("scaleTargetRef", {})
            target_kind = ref.get("kind", "")
            target_name = ref.get("name", "")
            if target_kind and target_name:
                t_key = (r["namespace"], target_kind, target_name)
                t_id = by_kind_name.get(t_key)
                if t_id:
                    edges.append({
                        "source_id": source_id,
                        "target_id": t_id,
                        "type": "scales",
                    })

    # 7. All resources → Namespace
    ns_nodes: Dict[str, str] = {}
    for r in resources_info:
        if r["kind"] == "Namespace":
            ns_nodes[r["raw_name"]] = node_map.get(r["name"], "")

    for r in resources_info:
        if r["kind"] == "Namespace":
            continue
        ns_id = ns_nodes.get(r["namespace"])
        if ns_id:
            source_id = node_map.get(r["name"])
            if source_id:
                edges.append({
                    "source_id": ns_id,
                    "target_id": source_id,
                    "type": "contains",
                })

    return edges


def _labels_match(selector: Dict[str, str], labels: Dict[str, str]) -> bool:
    """Check if all selector key-value pairs exist in labels."""
    return all(labels.get(k) == v for k, v in selector.items())


async def import_k8s_yaml(
    db: AsyncSession,
    yaml_content: str,
    *,
    namespace_filter: Optional[str] = None,
) -> Dict[str, Any]:
    """Import K8s resources from YAML into the graph.

    Returns summary of created nodes and edges.
    """
    resources = parse_k8s_manifests(yaml_content)

    if namespace_filter:
        resources = [
            r for r in resources
            if r.get("metadata", {}).get("namespace", "default") == namespace_filter
            or r.get("kind") == "Namespace"
        ]

    # Extract info from all resources
    resources_info = [_extract_resource_info(r) for r in resources]

    # Create nodes
    node_map: Dict[str, str] = {}  # name -> node DB id (as string)
    created_nodes = []

    for info in resources_info:
        node = await graph_service.create_node(
            db,
            type=info["type"],
            name=info["name"],
            properties=info["properties"],
        )
        node_map[info["name"]] = str(node.id)
        created_nodes.append({
            "id": str(node.id),
            "name": info["name"],
            "type": info["type"],
        })

    # Detect and create edges
    edge_defs = _detect_edges(resources_info, node_map)
    created_edges = []

    for edef in edge_defs:
        edge = await graph_service.create_edge(
            db,
            source_id=uuid.UUID(edef["source_id"]),
            target_id=uuid.UUID(edef["target_id"]),
            type=edef["type"],
        )
        created_edges.append({
            "id": str(edge.id),
            "source_id": edef["source_id"],
            "target_id": edef["target_id"],
            "type": edef["type"],
        })

    return {
        "nodes_created": len(created_nodes),
        "edges_created": len(created_edges),
        "nodes": created_nodes,
        "edges": created_edges,
    }
