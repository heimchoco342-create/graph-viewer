import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});

describe('applyDagreLayout', () => {
  const makeNode = (id: string): Node => ({
    id,
    position: { x: 0, y: 0 },
    data: { label: id },
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

  it('arranges orphan nodes in a grid pattern', () => {
    const nodes = Array.from({ length: 8 }, (_, i) => makeNode(`o${i}`));

    const result = applyDagreLayout(nodes, []);

    // First 6 should be on same row (y), 7th and 8th on next row
    const row0 = result.slice(0, 6);
    const row1 = result.slice(6);

    // All in row 0 should share same y
    const y0 = row0[0].position.y;
    row0.forEach((n) => expect(n.position.y).toBe(y0));

    // Row 1 should be above row 0 (smaller y = higher up)
    expect(row1[0].position.y).toBeLessThan(y0);
  });
});
