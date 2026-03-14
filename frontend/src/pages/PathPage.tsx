import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { PathFinder } from '../components/path/PathFinder';
import type { PathStep } from '../components/path/PathFinder';
import { usePathStore } from '../store/pathStore';
import { useGraphStore } from '../store/graphStore';
import { useAuthStore } from '../store/authStore';
import { getMenuItemsWithActive, navigateByLabel } from '../constants/navigation';

export function PathPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { nodes, fetchNodes } = useGraphStore();
  const { sourceNode, targetNode, pathResult, setSourceNode, setTargetNode, findPath, error } = usePathStore();

  useEffect(() => {
    if (nodes.length === 0) void fetchNodes();
  }, [nodes.length, fetchNodes]);

  const nodeOptions = nodes.map((n) => ({ id: n.id, name: n.name, type: n.type }));

  const pathSteps: PathStep[] | undefined = pathResult
    ? pathResult.nodes.map((n, i) => ({
        nodeId: n.id,
        nodeLabel: n.name,
        edgeLabel: pathResult.edges[i]?.type,
      }))
    : undefined;

  const menuItems = getMenuItemsWithActive(location.pathname);
  const handleMenuClick = (label: string) => navigateByLabel(label, navigate);

  return (
    <AppLayout sidebar={<Sidebar menuItems={menuItems} onMenuClick={handleMenuClick} />}>
      <Header title="경로 탐색" userName={user?.name ?? ''} />
      <div className="p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {error && (
          <div className="bg-danger text-white px-4 py-2 rounded-lg" role="alert">
            {error}
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
    </AppLayout>
  );
}
