import { useEffect, useState, useCallback, useMemo } from 'react';
import { type Node, type Edge, useNodesState, useEdgesState } from '@xyflow/react';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { CircleNode } from '../components/graph/CircleNode';
import { NodeDetail } from '../components/graph/NodeDetail';
import { EdgeDetail } from '../components/graph/EdgeDetail';
import { NodeForm } from '../components/crud/NodeForm';
import { EdgeForm } from '../components/crud/EdgeForm';
import { Modal } from '../components/ui/Modal';
import { useGraphStore } from '../store/graphStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDomainStore } from '../store/domainStore';
import { getMenuItemsWithActive, navigateByLabel } from '../constants/navigation';

import Dagre from '@dagrejs/dagre';

const customNodeTypes = { circle: CircleNode };

/** Extract short display name: "prod/Deployment/api-gateway" → "api-gateway" */
function shortLabel(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): Node[] {
  // Separate connected vs orphan (no edges) nodes
  const connectedIds = new Set<string>();
  edges.forEach((edge) => {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  });

  const connectedNodes = nodes.filter((n) => connectedIds.has(n.id));
  const orphanNodes = nodes.filter((n) => !connectedIds.has(n.id));

  // Layout connected nodes with Dagre
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120, edgesep: 30 });

  connectedNodes.forEach((node) => g.setNode(node.id, { width: 44, height: 44 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  Dagre.layout(g);

  const layoutedConnected = connectedNodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - 22, y: pos.y - 22 } };
  });

  // Find bounding box of connected graph to place orphans above-left
  let minX = 0;
  let minY = 0;
  if (layoutedConnected.length > 0) {
    minX = Math.min(...layoutedConnected.map((n) => n.position.x));
    minY = Math.min(...layoutedConnected.map((n) => n.position.y));
  }

  // Group orphan nodes by type, then lay out each group in its own row
  const ORPHAN_GAP_X = 70;
  const ORPHAN_GAP_Y = 80;
  const ORPHAN_OFFSET_Y = minY - 150; // above the main graph

  const orphansByType = new Map<string, Node[]>();
  orphanNodes.forEach((node) => {
    const nodeType = (node.data as Record<string, unknown>)?.nodeType as string ?? 'unknown';
    if (!orphansByType.has(nodeType)) orphansByType.set(nodeType, []);
    orphansByType.get(nodeType)!.push(node);
  });

  const layoutedOrphans: Node[] = [];
  let rowIndex = 0;
  for (const [, group] of orphansByType) {
    group.forEach((node, col) => {
      layoutedOrphans.push({
        ...node,
        position: {
          x: minX + col * ORPHAN_GAP_X,
          y: ORPHAN_OFFSET_Y - rowIndex * ORPHAN_GAP_Y,
        },
      });
    });
    rowIndex++;
  }

  return [...layoutedOrphans, ...layoutedConnected];
}

function toFlowNodes(graphNodes: { id: string; name: string; type: string }[], colorMap: Record<string, string>): Node[] {
  return graphNodes.map((n) => ({
    id: n.id,
    position: { x: 0, y: 0 },
    data: { label: shortLabel(n.name), color: colorMap[n.type] ?? '#6b7280', nodeType: n.type },
    type: 'circle',
  }));
}

function toFlowEdges(graphEdges: { id: string; source_id: string; target_id: string; type: string }[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source_id,
    target: e.target_id,
    style: { stroke: '#475569', strokeWidth: 1 },
    animated: e.type === 'owns',
    markerEnd: { type: 'arrowclosed' as const, color: '#475569', width: 12, height: 12 },
  }));
}

export function GraphPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const nodeTypeColors = useDomainStore((s) => s.nodeTypeColors)();
  const {
    graphs,
    selectedGraphId,
    nodes: graphNodes,
    edges: graphEdges,
    selectedNode,
    selectedEdge,
    fetchGraphs,
    selectGraph,
    createNode,
    deleteNode,
    createEdge,
    deleteEdge,
    setSelectedNode,
    setSelectedEdge,
  } = useGraphStore();

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showEdgeForm, setShowEdgeForm] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<'direct' | 'waterfall'>('direct');
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    void fetchGraphs();
  }, [fetchGraphs]);

  // Auto-select first graph
  useEffect(() => {
    if (graphs.length > 0 && !selectedGraphId) {
      void selectGraph(graphs[0].id);
    }
  }, [graphs, selectedGraphId, selectGraph]);

  useEffect(() => {
    const nodes = toFlowNodes(graphNodes, nodeTypeColors);
    const edges = toFlowEdges(graphEdges);
    const layouted = applyDagreLayout(nodes, edges);
    setFlowNodes(layouted);
    setFlowEdges(edges);
    setLayoutKey((k) => k + 1);
  }, [graphNodes, graphEdges, nodeTypeColors, setFlowNodes, setFlowEdges]);

  // Build set of connected node IDs for the focused node
  const connectedNodeIds = useMemo(() => {
    if (!focusedNodeId) return null;
    const ids = new Set<string>([focusedNodeId]);

    if (focusMode === 'direct') {
      // 1-hop: direct neighbors only
      graphEdges.forEach((e) => {
        if (e.source_id === focusedNodeId) ids.add(e.target_id);
        if (e.target_id === focusedNodeId) ids.add(e.source_id);
      });
    } else {
      // Waterfall: BFS downstream (source→target direction) + upstream parents
      // Upstream: follow target→source direction to find ancestors
      const upQueue = [focusedNodeId];
      while (upQueue.length > 0) {
        const current = upQueue.shift()!;
        graphEdges.forEach((e) => {
          if (e.target_id === current && !ids.has(e.source_id)) {
            ids.add(e.source_id);
            upQueue.push(e.source_id);
          }
        });
      }
      // Downstream: follow source→target direction to find descendants
      const downQueue = [focusedNodeId];
      while (downQueue.length > 0) {
        const current = downQueue.shift()!;
        graphEdges.forEach((e) => {
          if (e.source_id === current && !ids.has(e.target_id)) {
            ids.add(e.target_id);
            downQueue.push(e.target_id);
          }
        });
      }
    }

    return ids;
  }, [focusedNodeId, focusMode, graphEdges]);

  // Apply dim/highlight styles based on focus
  const displayNodes = useMemo(() => {
    if (!connectedNodeIds) return flowNodes;
    return flowNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        dimmed: !connectedNodeIds.has(node.id),
      },
    }));
  }, [flowNodes, connectedNodeIds]);

  const displayEdges = useMemo(() => {
    if (!connectedNodeIds) return flowEdges;
    return flowEdges.map((edge) => {
      const isConnected =
        connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target);
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isConnected ? '#60a5fa' : '#475569',
          strokeWidth: isConnected ? 2 : 1,
          opacity: isConnected ? 1 : 0.2,
        },
        animated: isConnected ? true : false,
      };
    });
  }, [flowEdges, connectedNodeIds]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
      const found = graphNodes.find((n) => n.id === node.id);
      if (found) setSelectedNode(found);
    },
    [graphNodes, setSelectedNode],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const found = graphEdges.find((e) => e.id === edge.id);
      if (found) setSelectedEdge(found);
    },
    [graphEdges, setSelectedEdge],
  );

  const handlePaneClick = useCallback(() => {
    setFocusedNodeId(null);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  const handleDownloadSubgraph = useCallback(() => {
    if (!selectedNode) return;

    // BFS: collect all downstream nodes from selectedNode
    const visitedNodeIds = new Set<string>();
    const queue = [selectedNode.id];
    visitedNodeIds.add(selectedNode.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of graphEdges) {
        if (edge.source_id === current && !visitedNodeIds.has(edge.target_id)) {
          visitedNodeIds.add(edge.target_id);
          queue.push(edge.target_id);
        }
      }
    }

    const subNodes = graphNodes.filter((n) => visitedNodeIds.has(n.id));
    const subEdges = graphEdges.filter(
      (e) => visitedNodeIds.has(e.source_id) && visitedNodeIds.has(e.target_id),
    );

    const payload = {
      root: selectedNode.name,
      exported_at: new Date().toISOString(),
      nodes: subNodes,
      edges: subEdges,
      summary: { node_count: subNodes.length, edge_count: subEdges.length },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subgraph-${shortLabel(selectedNode.name)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedNode, graphNodes, graphEdges]);

  const handleNodeFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createNode({
      name: fd.get('label') as string,
      type: fd.get('type') as string,
      properties: { description: fd.get('description') as string },
    });
    setShowNodeForm(false);
  };

  const handleEdgeFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createEdge({
      source_id: fd.get('source') as string,
      target_id: fd.get('target') as string,
      type: fd.get('label') as string,
    });
    setShowEdgeForm(false);
  };

  const nodeOptions = graphNodes.map((n) => ({ value: n.id, label: n.name }));

  const menuItems = getMenuItemsWithActive(location.pathname);
  const handleMenuClick = (label: string) => navigateByLabel(label, navigate);

  const sidebarBottomSlot = (
    <>
      <div className="flex bg-bg-primary rounded-lg border border-border text-sm">
        <button
          onClick={() => setFocusMode('direct')}
          className={`flex-1 px-3 py-1.5 rounded-l-lg transition-colors ${focusMode === 'direct' ? 'bg-blue-600 text-white' : 'text-text-secondary hover:text-text-primary'}`}
          title="직접 연결된 노드만 하이라이트"
        >
          직접
        </button>
        <button
          onClick={() => setFocusMode('waterfall')}
          className={`flex-1 px-3 py-1.5 rounded-r-lg transition-colors ${focusMode === 'waterfall' ? 'bg-blue-600 text-white' : 'text-text-secondary hover:text-text-primary'}`}
          title="상위/하위 트리 전체 하이라이트"
        >
          워터폴
        </button>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => setShowNodeForm(true)}
          className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-500"
        >
          + 노드
        </button>
        <button
          onClick={() => setShowEdgeForm(true)}
          className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-500"
        >
          + 엣지
        </button>
      </div>
    </>
  );

  return (
    <AppLayout sidebar={<Sidebar menuItems={menuItems} onMenuClick={handleMenuClick} bottomSlot={sidebarBottomSlot} />}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary shrink-0">
        <div className="flex items-center gap-2">
          {graphs.length > 0 && (
            <select
              value={selectedGraphId ?? ''}
              onChange={(e) => void selectGraph(e.target.value)}
              className="bg-bg-primary text-text-primary text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
            >
              {graphs.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
          {graphs.length === 0 && (
            <span className="text-sm text-text-secondary">그래프 없음</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">{user?.name}</span>
          <button
            onClick={logout}
            className="text-sm text-red-400 hover:text-red-300"
          >
            로그아웃
          </button>
        </div>
      </header>
      {/* Graph summary bar */}
      {selectedGraphId && graphNodes.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-1.5 border-b border-border bg-bg-primary text-xs text-text-secondary shrink-0 overflow-x-auto">
          <span>
            <span className="text-text-primary font-medium">{graphNodes.length}</span> 노드
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="text-text-primary font-medium">{graphEdges.length}</span> 엣지
          </span>
          <span className="text-border">|</span>
          <span>
            타입: {Array.from(new Set(graphNodes.map((n) => n.type))).sort().map((t) => {
              const count = graphNodes.filter((n) => n.type === t).length;
              const badgeColor = nodeTypeColors[t] ?? '#6b7280';
              return (
                <span key={t} className="inline-flex items-center gap-1 mr-2">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: badgeColor }} />
                  {t}
                  <span className="text-text-secondary">({count})</span>
                </span>
              );
            })}
          </span>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <GraphCanvas
            key={layoutKey}
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={customNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
          />
        </div>

        {(selectedNode || selectedEdge) && (
          <div className="shrink-0 border-l border-border bg-bg-primary flex flex-col relative">
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="absolute -left-6 top-3 w-6 h-8 bg-bg-secondary border border-border border-r-0 rounded-l-md flex items-center justify-center text-text-secondary hover:text-text-primary text-xs z-10"
              title={drawerOpen ? '패널 접기' : '패널 펼치기'}
            >
              {drawerOpen ? '▶' : '◀'}
            </button>
            {drawerOpen && (
              <div className="w-[280px] overflow-y-auto p-4 flex flex-col gap-4">
                {selectedNode && (
                  <NodeDetail
                    id={selectedNode.id}
                    label={selectedNode.name}
                    type={selectedNode.type}
                    properties={selectedNode.properties as Record<string, string>}
                    onClose={() => setSelectedNode(null)}
                  />
                )}
                {selectedNode && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDownloadSubgraph}
                      className="text-accent text-sm hover:underline"
                    >
                      서브그래프 다운로드
                    </button>
                    <button
                      onClick={() => void deleteNode(selectedNode.id)}
                      className="text-danger text-sm hover:underline"
                    >
                      노드 삭제
                    </button>
                  </div>
                )}
                {selectedEdge && (
                  <EdgeDetail
                    id={selectedEdge.id}
                    source={selectedEdge.source_id}
                    target={selectedEdge.target_id}
                    label={selectedEdge.type}
                    properties={selectedEdge.properties as Record<string, string>}
                    onClose={() => setSelectedEdge(null)}
                  />
                )}
                {selectedEdge && (
                  <button
                    onClick={() => void deleteEdge(selectedEdge.id)}
                    className="text-danger text-sm hover:underline"
                  >
                    엣지 삭제
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={showNodeForm} title="노드 추가" onClose={() => setShowNodeForm(false)}>
        <NodeForm onSubmit={handleNodeFormSubmit} onCancel={() => setShowNodeForm(false)} />
      </Modal>

      <Modal isOpen={showEdgeForm} title="엣지 추가" onClose={() => setShowEdgeForm(false)}>
        <EdgeForm nodeOptions={nodeOptions} onSubmit={handleEdgeFormSubmit} onCancel={() => setShowEdgeForm(false)} />
      </Modal>
    </AppLayout>
  );
}
