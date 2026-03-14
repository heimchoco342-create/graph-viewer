import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { PathFinder } from '../components/path/PathFinder';
import type { PathStep } from '../components/path/PathFinder';
import { useAuthStore } from '../store/authStore';
import { useGraphStore } from '../store/graphStore';
import { usePathStore } from '../store/pathStore';
import { NODE_TYPE_BADGE_COLORS } from '../constants/nodeTypes';
import { BfsSearchPanel } from '../components/graph/BfsSearchPanel';
import type { GraphNode, GraphEdge } from '../types';

const MENU_ITEMS = [
  { label: '그래프', icon: '🔗' },
  { label: '업로드', icon: '📤' },
  { label: '탐색', icon: '🔍' },
  { label: '도움말', icon: '❓' },
];

const ROUTES: Record<string, string> = {
  '그래프': '/',
  '업로드': '/upload',
  '탐색': '/query',
  '도움말': '/help',
};

type TabKey = 'nodes' | 'edges' | 'path' | 'stats' | 'bfs';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'nodes', label: '노드' },
  { key: 'edges', label: '엣지' },
  { key: 'path', label: '경로' },
  { key: 'stats', label: '통계' },
  { key: 'bfs', label: '그래프 탐색' },
];

export function QueryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const {
    nodes,
    edges,
    fetchNodes,
    fetchEdges,
    setSelectedNode,
  } = useGraphStore();
  const { sourceNode, targetNode, pathResult, setSourceNode, setTargetNode, findPath, error: pathError } = usePathStore();

  const [activeTab, setActiveTab] = useState<TabKey>('nodes');
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [edgeSearchText, setEdgeSearchText] = useState('');
  const [selectedEdgeType, setSelectedEdgeType] = useState<string>('all');

  useEffect(() => {
    void fetchNodes();
    void fetchEdges();
  }, [fetchNodes, fetchEdges]);

  // ── Node tab ──
  const availableTypes = useMemo(() => {
    const types = new Set(nodes.map((n) => n.type));
    return Array.from(types).sort();
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (selectedType !== 'all') {
      result = result.filter((n) => n.type === selectedType);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q) ||
          JSON.stringify(n.properties).toLowerCase().includes(q),
      );
    }
    return result;
  }, [nodes, selectedType, searchText]);

  // ── Edge tab ──
  const availableEdgeTypes = useMemo(() => {
    const types = new Set(edges.map((e) => e.type));
    return Array.from(types).sort();
  }, [edges]);

  const filteredEdges = useMemo(() => {
    let result = edges;
    if (selectedEdgeType !== 'all') {
      result = result.filter((e) => e.type === selectedEdgeType);
    }
    if (edgeSearchText.trim()) {
      const q = edgeSearchText.toLowerCase();
      result = result.filter((e) => {
        const srcNode = nodes.find((n) => n.id === e.source_id);
        const tgtNode = nodes.find((n) => n.id === e.target_id);
        return (
          e.type.toLowerCase().includes(q) ||
          (srcNode && srcNode.name.toLowerCase().includes(q)) ||
          (tgtNode && tgtNode.name.toLowerCase().includes(q))
        );
      });
    }
    return result;
  }, [edges, nodes, selectedEdgeType, edgeSearchText]);

  // ── Path tab ──
  const nodeOptions = useMemo(
    () => nodes.map((n) => ({ id: n.id, name: n.name, type: n.type })),
    [nodes],
  );

  const pathSteps: PathStep[] | undefined = pathResult
    ? pathResult.nodes.map((n, i) => ({
        nodeId: n.id,
        nodeLabel: n.name,
        edgeLabel: pathResult.edges[i]?.type,
      }))
    : undefined;

  // ── Stats tab ──
  const stats = useMemo(() => {
    const typeCounts = new Map<string, number>();
    nodes.forEach((n) => typeCounts.set(n.type, (typeCounts.get(n.type) ?? 0) + 1));

    const edgeTypeCounts = new Map<string, number>();
    edges.forEach((e) => edgeTypeCounts.set(e.type, (edgeTypeCounts.get(e.type) ?? 0) + 1));

    // Most connected nodes
    const connectionCount = new Map<string, number>();
    edges.forEach((e) => {
      connectionCount.set(e.source_id, (connectionCount.get(e.source_id) ?? 0) + 1);
      connectionCount.set(e.target_id, (connectionCount.get(e.target_id) ?? 0) + 1);
    });
    const topConnected = [...connectionCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ node: nodes.find((n) => n.id === id), count }))
      .filter((x) => x.node);

    return {
      typeCounts: [...typeCounts.entries()].sort((a, b) => b[1] - a[1]),
      edgeTypeCounts: [...edgeTypeCounts.entries()].sort((a, b) => b[1] - a[1]),
      topConnected,
    };
  }, [nodes, edges]);

  // ── Detail panel ──
  const nodeConnections = useMemo(() => {
    if (!selectedNodeId) return { incoming: [] as (GraphEdge & { node: GraphNode })[], outgoing: [] as (GraphEdge & { node: GraphNode })[] };
    const incoming = edges
      .filter((e) => e.target_id === selectedNodeId)
      .map((e) => ({ ...e, node: nodes.find((n) => n.id === e.source_id)! }))
      .filter((e) => e.node);
    const outgoing = edges
      .filter((e) => e.source_id === selectedNodeId)
      .map((e) => ({ ...e, node: nodes.find((n) => n.id === e.target_id)! }))
      .filter((e) => e.node);
    return { incoming, outgoing };
  }, [selectedNodeId, edges, nodes]);

  const handleRowClick = useCallback((node: GraphNode) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const handleGoToGraph = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
      navigate('/');
    },
    [setSelectedNode, navigate],
  );

  const menuItems = MENU_ITEMS.map((m) => ({
    ...m,
    active: location.pathname === ROUTES[m.label],
  }));

  const handleMenuClick = (label: string) => {
    const route = ROUTES[label];
    if (route) navigate(route);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <AppLayout sidebar={<Sidebar menuItems={menuItems} onMenuClick={handleMenuClick} />}>
      <Header title="탐색" userName={user?.name ?? ''} />

      {/* Tabs */}
      <div className="flex border-b border-border bg-bg-secondary px-4 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Nodes tab ── */}
        {activeTab === 'nodes' && (
          <>
            <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
              <div className="flex gap-3 items-center shrink-0">
                <input
                  type="text"
                  placeholder="노드 이름, 타입, 속성 검색..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
                />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="all">전체 타입</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>
                      {t} ({nodes.filter((n) => n.type === t).length})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-text-secondary whitespace-nowrap">
                  {filteredNodes.length} / {nodes.length}
                </span>
              </div>

              <div className="flex-1 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-bg-secondary sticky top-0">
                    <tr className="text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">타입</th>
                      <th className="px-3 py-2 font-medium">이름</th>
                      <th className="px-3 py-2 font-medium">속성</th>
                      <th className="px-3 py-2 font-medium w-16">연결</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredNodes.map((node) => {
                      const edgeCount = edges.filter(
                        (e) => e.source_id === node.id || e.target_id === node.id,
                      ).length;
                      const badgeColor = NODE_TYPE_BADGE_COLORS[node.type] ?? 'bg-gray-500';
                      return (
                        <tr
                          key={node.id}
                          onClick={() => handleRowClick(node)}
                          className={`cursor-pointer hover:bg-bg-secondary transition-colors ${
                            selectedNodeId === node.id ? 'bg-bg-secondary' : ''
                          }`}
                        >
                          <td className="px-3 py-2">
                            <span className={`${badgeColor} text-white text-xs px-2 py-0.5 rounded-full`}>
                              {node.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-text-primary font-medium">{node.name}</td>
                          <td className="px-3 py-2 text-text-secondary text-xs max-w-[300px] truncate">
                            {Object.entries(node.properties)
                              .slice(0, 3)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </td>
                          <td className="px-3 py-2 text-text-secondary text-center">{edgeCount}</td>
                        </tr>
                      );
                    })}
                    {filteredNodes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-text-secondary">
                          결과 없음
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Node detail panel */}
            {selectedNode && (
              <div className="w-[320px] shrink-0 border-l border-border bg-bg-primary overflow-y-auto p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-text-primary">{selectedNode.name}</h3>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="text-text-secondary hover:text-text-primary text-lg"
                  >
                    &times;
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${NODE_TYPE_BADGE_COLORS[selectedNode.type] ?? 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded-full`}>
                    {selectedNode.type}
                  </span>
                  <button
                    onClick={() => handleGoToGraph(selectedNode)}
                    className="text-accent text-xs hover:underline"
                  >
                    그래프에서 보기
                  </button>
                </div>
                {Object.keys(selectedNode.properties).length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-secondary mb-2">속성</h4>
                    <div className="space-y-1">
                      {Object.entries(selectedNode.properties).map(([key, val]) => (
                        <div key={key} className="flex text-xs gap-2">
                          <span className="text-text-secondary min-w-[80px]">{key}</span>
                          <span className="text-text-primary">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {nodeConnections.incoming.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-secondary mb-2">
                      들어오는 연결 ({nodeConnections.incoming.length})
                    </h4>
                    <div className="space-y-1">
                      {nodeConnections.incoming.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:bg-bg-secondary rounded px-1 py-0.5"
                          onClick={() => setSelectedNodeId(e.node.id)}
                        >
                          <span className={`${NODE_TYPE_BADGE_COLORS[e.node.type] ?? 'bg-gray-500'} text-white px-1.5 py-0.5 rounded-full`}>
                            {e.node.type}
                          </span>
                          <span className="text-text-primary">{e.node.name}</span>
                          <span className="text-text-secondary ml-auto">{e.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {nodeConnections.outgoing.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-secondary mb-2">
                      나가는 연결 ({nodeConnections.outgoing.length})
                    </h4>
                    <div className="space-y-1">
                      {nodeConnections.outgoing.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:bg-bg-secondary rounded px-1 py-0.5"
                          onClick={() => setSelectedNodeId(e.node.id)}
                        >
                          <span className={`${NODE_TYPE_BADGE_COLORS[e.node.type] ?? 'bg-gray-500'} text-white px-1.5 py-0.5 rounded-full`}>
                            {e.node.type}
                          </span>
                          <span className="text-text-primary">{e.node.name}</span>
                          <span className="text-text-secondary ml-auto">{e.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Edges tab ── */}
        {activeTab === 'edges' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
            <div className="flex gap-3 items-center shrink-0">
              <input
                type="text"
                placeholder="엣지 타입, 소스/타겟 노드 검색..."
                value={edgeSearchText}
                onChange={(e) => setEdgeSearchText(e.target.value)}
                className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
              />
              <select
                value={selectedEdgeType}
                onChange={(e) => setSelectedEdgeType(e.target.value)}
                className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="all">전체 타입</option>
                {availableEdgeTypes.map((t) => (
                  <option key={t} value={t}>
                    {t} ({edges.filter((e) => e.type === t).length})
                  </option>
                ))}
              </select>
              <span className="text-xs text-text-secondary whitespace-nowrap">
                {filteredEdges.length} / {edges.length}
              </span>
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary sticky top-0">
                  <tr className="text-left text-text-secondary">
                    <th className="px-3 py-2 font-medium">타입</th>
                    <th className="px-3 py-2 font-medium">소스</th>
                    <th className="px-3 py-2 font-medium w-8"></th>
                    <th className="px-3 py-2 font-medium">타겟</th>
                    <th className="px-3 py-2 font-medium w-16">가중치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEdges.map((edge) => {
                    const srcNode = nodes.find((n) => n.id === edge.source_id);
                    const tgtNode = nodes.find((n) => n.id === edge.target_id);
                    return (
                      <tr key={edge.id} className="hover:bg-bg-secondary transition-colors">
                        <td className="px-3 py-2">
                          <span className="bg-slate-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {edge.type}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {srcNode && (
                            <button
                              onClick={() => { setActiveTab('nodes'); setSelectedNodeId(srcNode.id); }}
                              className="text-text-primary hover:text-accent text-sm"
                            >
                              {srcNode.name}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-secondary text-center">→</td>
                        <td className="px-3 py-2">
                          {tgtNode && (
                            <button
                              onClick={() => { setActiveTab('nodes'); setSelectedNodeId(tgtNode.id); }}
                              className="text-text-primary hover:text-accent text-sm"
                            >
                              {tgtNode.name}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-secondary text-center text-xs">
                          {edge.weight}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEdges.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-text-secondary">
                        결과 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Path tab ── */}
        {activeTab === 'path' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              {pathError && (
                <div className="bg-danger text-white px-4 py-2 rounded-lg text-sm" role="alert">
                  {pathError}
                </div>
              )}
              <PathFinder
                nodes={nodeOptions}
                sourceValue={sourceNode}
                targetValue={targetNode}
                pathResult={pathSteps}
                onSourceChange={setSourceNode}
                onTargetChange={setTargetNode}
                onSearch={() => void findPath()}
              />
            </div>
          </div>
        )}

        {/* ── BFS Search tab ── */}
        {activeTab === 'bfs' && (
          <BfsSearchPanel nodes={nodes} edges={edges} />
        )}

        {/* ── Stats tab ── */}
        {activeTab === 'stats' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary cards */}
              <div className="col-span-full flex gap-4">
                <div className="flex-1 bg-bg-secondary rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{nodes.length}</div>
                  <div className="text-xs text-text-secondary mt-1">총 노드</div>
                </div>
                <div className="flex-1 bg-bg-secondary rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{edges.length}</div>
                  <div className="text-xs text-text-secondary mt-1">총 엣지</div>
                </div>
                <div className="flex-1 bg-bg-secondary rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{availableTypes.length}</div>
                  <div className="text-xs text-text-secondary mt-1">노드 타입</div>
                </div>
                <div className="flex-1 bg-bg-secondary rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{availableEdgeTypes.length}</div>
                  <div className="text-xs text-text-secondary mt-1">엣지 타입</div>
                </div>
              </div>

              {/* Node type distribution */}
              <div className="bg-bg-secondary rounded-lg border border-border p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">노드 타입 분포</h3>
                <div className="space-y-2">
                  {stats.typeCounts.map(([type, count]) => {
                    const pct = Math.round((count / nodes.length) * 100);
                    const badgeColor = NODE_TYPE_BADGE_COLORS[type] ?? 'bg-gray-500';
                    return (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <span className={`${badgeColor} text-white px-1.5 py-0.5 rounded-full min-w-[80px] text-center`}>
                          {type}
                        </span>
                        <div className="flex-1 bg-bg-primary rounded-full h-2 overflow-hidden">
                          <div className={`${badgeColor} h-full rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-text-secondary w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Edge type distribution */}
              <div className="bg-bg-secondary rounded-lg border border-border p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">엣지 타입 분포</h3>
                <div className="space-y-2">
                  {stats.edgeTypeCounts.map(([type, count]) => {
                    const pct = Math.round((count / edges.length) * 100);
                    return (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <span className="bg-slate-600 text-white px-1.5 py-0.5 rounded-full min-w-[80px] text-center">
                          {type}
                        </span>
                        <div className="flex-1 bg-bg-primary rounded-full h-2 overflow-hidden">
                          <div className="bg-slate-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-text-secondary w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top connected nodes */}
              <div className="col-span-full bg-bg-secondary rounded-lg border border-border p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">연결이 많은 노드 (Top 10)</h3>
                <div className="space-y-1">
                  {stats.topConnected.map(({ node, count }) => {
                    if (!node) return null;
                    const badgeColor = NODE_TYPE_BADGE_COLORS[node.type] ?? 'bg-gray-500';
                    return (
                      <div
                        key={node.id}
                        className="flex items-center gap-2 text-xs cursor-pointer hover:bg-bg-tertiary rounded px-2 py-1"
                        onClick={() => { setActiveTab('nodes'); setSelectedNodeId(node.id); }}
                      >
                        <span className={`${badgeColor} text-white px-1.5 py-0.5 rounded-full`}>
                          {node.type}
                        </span>
                        <span className="text-text-primary flex-1">{node.name}</span>
                        <span className="text-accent font-medium">{count} 연결</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
