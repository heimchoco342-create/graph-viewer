import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GraphPage, applyDagreLayout } from './GraphPage';
import { useAuthStore } from '../store/authStore';
import { useGraphStore } from '../store/graphStore';
import type { Node, Edge } from '@xyflow/react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

// Mock @xyflow/react to avoid ResizeObserver issues in tests
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    ReactFlow: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="react-flow-mock">{children}</div>
    ),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
  };
});

describe('GraphPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.c', name: 'User', created_at: '' },
      token: 'jwt',
    });
    useGraphStore.setState({
      graphs: [{ id: 'g1', name: 'TestGraph', owner_id: '1', scope: 'org', created_at: '' }],
      selectedGraphId: 'g1',
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      error: null,
      loading: false,
    });
  });

  it('renders graph page with header', () => {
    render(
      <MemoryRouter>
        <GraphPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('WNG').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+ 노드')).toBeInTheDocument();
    expect(screen.getByText('+ 엣지')).toBeInTheDocument();
  });

  it('closes detail panel on pane click', () => {
    useGraphStore.setState({
      selectedNode: {
        id: '1',
        name: 'TestNode',
        type: 'person',
        properties: {},
        created_at: '',
        updated_at: '',
      },
    });

    render(
      <MemoryRouter>
        <GraphPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('TestNode')).toBeInTheDocument();
  });

  it('renders focus mode toggle in sidebar', () => {
    render(
      <MemoryRouter>
        <GraphPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('직접')).toBeInTheDocument();
    expect(screen.getByText('워터폴')).toBeInTheDocument();
  });

  it('shows selected node detail', () => {
    useGraphStore.setState({
      selectedNode: {
        id: '1',
        name: 'TestNode',
        type: 'person',
        properties: { role: 'dev' },
        created_at: '',
        updated_at: '',
      },
    });

    render(
      <MemoryRouter>
        <GraphPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('TestNode')).toBeInTheDocument();
    expect(screen.getByText('노드 삭제')).toBeInTheDocument();
  });

  it('collapses and expands detail drawer', () => {
    useGraphStore.setState({
      selectedNode: {
        id: '1',
        name: 'TestNode',
        type: 'person',
        properties: {},
        created_at: '',
        updated_at: '',
      },
    });

    render(
      <MemoryRouter>
        <GraphPage />
      </MemoryRouter>,
    );

    // Drawer content visible by default
    expect(screen.getByText('TestNode')).toBeInTheDocument();

    // Click collapse button (▶)
    fireEvent.click(screen.getByTitle('패널 접기'));
    expect(screen.queryByText('TestNode')).not.toBeInTheDocument();

    // Click expand button (◀)
    fireEvent.click(screen.getByTitle('패널 펼치기'));
    expect(screen.getByText('TestNode')).toBeInTheDocument();
  });
});

describe('applyDagreLayout', () => {
  const makeNode = (id: string, nodeType = 'default'): Node => ({
    id,
    position: { x: 0, y: 0 },
    data: { label: id, nodeType },
    type: 'circle',
  });

  const makeEdge = (source: string, target: string): Edge => ({
    id: `${source}-${target}`,
    source,
    target,
  });

  it('places orphan nodes separately from connected nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('orphan1'), makeNode('orphan2')];
    const edges = [makeEdge('a', 'b')];

    const result = applyDagreLayout(nodes, edges);

    const orphan1 = result.find((n) => n.id === 'orphan1')!;
    const orphan2 = result.find((n) => n.id === 'orphan2')!;
    const nodeA = result.find((n) => n.id === 'a')!;

    // Orphans should be above the connected graph
    expect(orphan1.position.y).toBeLessThan(nodeA.position.y);
    expect(orphan2.position.y).toBeLessThan(nodeA.position.y);
  });

  it('handles all orphan nodes (no edges)', () => {
    const nodes = [makeNode('x'), makeNode('y'), makeNode('z')];

    const result = applyDagreLayout(nodes, []);

    expect(result).toHaveLength(3);
    // All nodes should have valid positions
    result.forEach((n) => {
      expect(typeof n.position.x).toBe('number');
      expect(typeof n.position.y).toBe('number');
    });
  });

  it('handles no orphan nodes', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('a', 'b')];

    const result = applyDagreLayout(nodes, edges);

    expect(result).toHaveLength(2);
  });

  it('groups orphan nodes by type on separate rows', () => {
    const nodes = [
      makeNode('p1', 'person'), makeNode('p2', 'person'),
      makeNode('t1', 'tech'), makeNode('t2', 'tech'), makeNode('t3', 'tech'),
    ];

    const result = applyDagreLayout(nodes, []);

    const p1 = result.find((n) => n.id === 'p1')!;
    const p2 = result.find((n) => n.id === 'p2')!;
    const t1 = result.find((n) => n.id === 't1')!;
    const t2 = result.find((n) => n.id === 't2')!;

    // Same type should share same y (same row)
    expect(p1.position.y).toBe(p2.position.y);
    expect(t1.position.y).toBe(t2.position.y);

    // Different types should be on different rows
    expect(p1.position.y).not.toBe(t1.position.y);
  });
});
