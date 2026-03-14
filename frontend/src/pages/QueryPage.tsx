import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';
import { useGraphStore } from '../store/graphStore';
import { NODE_TYPE_BADGE_COLORS } from '../constants/nodeTypes';
import type { GraphNode, GraphEdge } from '../types';

const MENU_ITEMS = [
  { label: '그래프', icon: '🔗' },
  { label: '검색', icon: '🔍' },
  { label: '업로드', icon: '📤' },
  { label: '경로', icon: '🗺️' },
  { label: '쿼리', icon: '🧪' },
];

const ROUTES: Record<string, string> = {
  '그래프': '/',
  '검색': '/search',
  '업로드': '/upload',
  '경로': '/path',
  '쿼리': '/query',
};

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

  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    void fetchNodes();
    void fetchEdges();
  }, [fetchNodes, fetchEdges]);

  // Get unique types from actual data
  const availableTypes = useMemo(() => {
    const types = new Set(nodes.map((n) => n.type));
    return Array.from(types).sort();
  }, [nodes]);

  // Filter nodes
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

  // Get connections for selected node
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
      <Header title="쿼리" userName={user?.name ?? ''} />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: filters + table */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          {/* Filters */}
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

          {/* Table */}
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
                        <span
                          className={`${badgeColor} text-white text-xs px-2 py-0.5 rounded-full`}
                        >
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

        {/* Right: detail panel */}
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
              <span
                className={`${NODE_TYPE_BADGE_COLORS[selectedNode.type] ?? 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded-full`}
              >
                {selectedNode.type}
              </span>
              <button
                onClick={() => handleGoToGraph(selectedNode)}
                className="text-accent text-xs hover:underline"
              >
                그래프에서 보기
              </button>
            </div>

            {/* Properties */}
            {Object.keys(selectedNode.properties).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-text-secondary mb-2">속성</h4>
                <div className="space-y-1">
                  {Object.entries(selectedNode.properties).map(([key, val]) => (
                    <div key={key} className="flex text-xs gap-2">
                      <span className="text-text-secondary min-w-[80px]">{key}</span>
                      <span className="text-text-primary">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incoming edges */}
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
                      <span
                        className={`${NODE_TYPE_BADGE_COLORS[e.node.type] ?? 'bg-gray-500'} text-white px-1.5 py-0.5 rounded-full`}
                      >
                        {e.node.type}
                      </span>
                      <span className="text-text-primary">{e.node.name}</span>
                      <span className="text-text-secondary ml-auto">{e.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing edges */}
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
                      <span
                        className={`${NODE_TYPE_BADGE_COLORS[e.node.type] ?? 'bg-gray-500'} text-white px-1.5 py-0.5 rounded-full`}
                      >
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
      </div>
    </AppLayout>
  );
}
