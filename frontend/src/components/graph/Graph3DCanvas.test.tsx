import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Graph3DCanvas, type Graph3DNode, type Graph3DLink } from './Graph3DCanvas';

// Mock react-force-graph-3d since it requires WebGL
vi.mock('react-force-graph-3d', () => {
  const MockForceGraph3D = vi.fn().mockImplementation(() => null);
  // Make it work as both default export and forwardRef
  return {
    __esModule: true,
    default: vi.fn((props: Record<string, unknown>) => (
      <div data-testid="mock-force-graph-3d" data-node-count={(props.graphData as { nodes: unknown[] })?.nodes?.length} />
    )),
  };
});

vi.mock('three', () => ({
  Group: vi.fn(),
  SphereGeometry: vi.fn(),
  MeshLambertMaterial: vi.fn(),
  Mesh: vi.fn(),
  CanvasTexture: vi.fn(),
  SpriteMaterial: vi.fn(),
  Sprite: vi.fn().mockImplementation(() => ({
    scale: { set: vi.fn() },
    position: { set: vi.fn() },
  })),
}));

const NODES: Graph3DNode[] = [
  { id: '1', name: 'Node A', type: 'person' },
  { id: '2', name: 'Node B', type: 'team' },
  { id: '3', name: 'Node C', type: 'project' },
];

const LINKS: Graph3DLink[] = [
  { id: 'e1', source: '1', target: '2', type: 'belongs_to' },
  { id: 'e2', source: '2', target: '3', type: 'owns' },
];

describe('Graph3DCanvas', () => {
  it('renders the 3d canvas container', () => {
    render(<Graph3DCanvas nodes={NODES} links={LINKS} />);
    expect(screen.getByTestId('graph-3d-canvas')).toBeInTheDocument();
  });

  it('renders ForceGraph3D with correct node count', () => {
    render(<Graph3DCanvas nodes={NODES} links={LINKS} />);
    const graph = screen.getByTestId('mock-force-graph-3d');
    expect(graph).toHaveAttribute('data-node-count', '3');
  });

  it('passes width and height props', () => {
    render(<Graph3DCanvas nodes={NODES} links={LINKS} width={1000} height={600} />);
    expect(screen.getByTestId('graph-3d-canvas')).toBeInTheDocument();
  });

  it('renders with empty data', () => {
    render(<Graph3DCanvas nodes={[]} links={[]} />);
    const graph = screen.getByTestId('mock-force-graph-3d');
    expect(graph).toHaveAttribute('data-node-count', '0');
  });
});
