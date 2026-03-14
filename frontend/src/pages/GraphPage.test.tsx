import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GraphPage } from './GraphPage';
import { useAuthStore } from '../store/authStore';
import { useGraphStore } from '../store/graphStore';

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
