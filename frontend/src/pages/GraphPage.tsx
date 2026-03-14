import { useEffect, useState, useCallback } from 'react';
import { type Node, type Edge, useNodesState, useEdgesState } from '@xyflow/react';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { NodeDetail } from '../components/graph/NodeDetail';
import { EdgeDetail } from '../components/graph/EdgeDetail';
import { NodeForm } from '../components/crud/NodeForm';
import { EdgeForm } from '../components/crud/EdgeForm';
import { Modal } from '../components/ui/Modal';
import { useGraphStore } from '../store/graphStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';

function toFlowNodes(graphNodes: { id: string; name: string; type: string }[]): Node[] {
  return graphNodes.map((n, i) => ({
    id: n.id,
    position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 150 },
    data: { label: n.name },
    type: 'default',
  }));
}

function toFlowEdges(graphEdges: { id: string; source_id: string; target_id: string; type: string }[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source_id,
    target: e.target_id,
    label: e.type,
  }));
}

export function GraphPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const {
    nodes: graphNodes,
    edges: graphEdges,
    selectedNode,
    selectedEdge,
    fetchNodes,
    fetchEdges,
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

  useEffect(() => {
    void fetchNodes();
    void fetchEdges();
  }, [fetchNodes, fetchEdges]);

  useEffect(() => {
    setFlowNodes(toFlowNodes(graphNodes));
  }, [graphNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(toFlowEdges(graphEdges));
  }, [graphEdges, setFlowEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
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

  const menuItems = [
    { label: '그래프', icon: '🔗', active: location.pathname === '/' },
    { label: '검색', icon: '🔍', active: location.pathname === '/search' },
    { label: '업로드', icon: '📤', active: location.pathname === '/upload' },
    { label: '경로', icon: '🗺️', active: location.pathname === '/path' },
  ];

  const handleMenuClick = (label: string) => {
    const routes: Record<string, string> = { '그래프': '/', '검색': '/search', '업로드': '/upload', '경로': '/path' };
    const route = routes[label];
    if (route) navigate(route);
  };

  return (
    <AppLayout sidebar={<Sidebar menuItems={menuItems} onMenuClick={handleMenuClick} />}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary shrink-0 whitespace-nowrap">
        <h2 className="text-base font-semibold text-text-primary">그래프 뷰어</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNodeForm(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-500"
          >
            + 노드
          </button>
          <button
            onClick={() => setShowEdgeForm(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-500"
          >
            + 엣지
          </button>
          <span className="text-sm text-text-secondary">{user?.name}</span>
          <button
            onClick={logout}
            className="text-sm text-red-400 hover:text-red-300"
          >
            로그아웃
          </button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <GraphCanvas
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        </div>

        {(selectedNode || selectedEdge) && <div className="w-[280px] shrink-0 border-l border-border bg-bg-primary overflow-y-auto p-4 flex flex-col gap-4">
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
            <button
              onClick={() => void deleteNode(selectedNode.id)}
              className="text-danger text-sm hover:underline"
            >
              노드 삭제
            </button>
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
        </div>}
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
