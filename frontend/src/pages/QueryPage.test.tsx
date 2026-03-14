import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryPage } from './QueryPage';
import { useAuthStore } from '../store/authStore';
import { useGraphStore } from '../store/graphStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

// Mock BfsSearchPanel to avoid React Flow dependency in QueryPage tests
vi.mock('../components/graph/BfsSearchPanel', () => ({
  BfsSearchPanel: () => <div data-testid="bfs-search-panel">BFS Panel</div>,
}));

const MOCK_NODES = [
  { id: '1', name: '김철수', type: 'person', properties: { role: '백엔드 시니어' }, created_at: '', updated_at: '' },
  { id: '2', name: 'FastAPI', type: 'tech', properties: { category: 'framework' }, created_at: '', updated_at: '' },
  { id: '3', name: '주문 API', type: 'project', properties: { status: '진행중' }, created_at: '', updated_at: '' },
  { id: '4', name: '이영희', type: 'person', properties: { role: '주니어' }, created_at: '', updated_at: '' },
];

const MOCK_EDGES = [
  { id: 'e1', source_id: '1', target_id: '3', type: 'works_on', properties: {}, weight: 1, created_at: '' },
  { id: 'e2', source_id: '3', target_id: '2', type: 'uses', properties: {}, weight: 1, created_at: '' },
];

describe('QueryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.c', name: 'User', created_at: '' },
      token: 'jwt',
    });
    useGraphStore.setState({
      nodes: MOCK_NODES,
      edges: MOCK_EDGES,
      selectedNode: null,
      selectedEdge: null,
      error: null,
      loading: false,
    });
  });

  it('renders tabs', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('노드')).toBeInTheDocument();
    expect(screen.getByText('엣지')).toBeInTheDocument();
    expect(screen.getByText('경로')).toBeInTheDocument();
    expect(screen.getByText('통계')).toBeInTheDocument();
    expect(screen.getByText('재귀 탐색')).toBeInTheDocument();
  });

  it('renders query page with filter controls (nodes tab default)', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText(/노드 이름/)).toBeInTheDocument();
    expect(screen.getByText('전체 타입')).toBeInTheDocument();
    expect(screen.getByText('4 / 4')).toBeInTheDocument();
  });

  it('displays all nodes in the table', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('FastAPI')).toBeInTheDocument();
    expect(screen.getByText('주문 API')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
  });

  it('filters nodes by type', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );

    const select = screen.getByDisplayValue('전체 타입');
    fireEvent.change(select, { target: { value: 'person' } });

    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.queryByText('FastAPI')).not.toBeInTheDocument();
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
  });

  it('filters nodes by search text', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/노드 이름/);
    fireEvent.change(input, { target: { value: '김' } });

    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.queryByText('이영희')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });

  it('shows node detail panel on row click', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('김철수'));

    expect(screen.getByText('그래프에서 보기')).toBeInTheDocument();
    expect(screen.getByText('나가는 연결 (1)')).toBeInTheDocument();
  });

  it('shows connection count in table', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );

    const rows = screen.getAllByRole('row');
    // Header + 4 data rows
    expect(rows).toHaveLength(5);
  });

  it('searches in properties', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/노드 이름/);
    fireEvent.change(input, { target: { value: 'framework' } });

    expect(screen.getByText('FastAPI')).toBeInTheDocument();
    expect(screen.queryByText('김철수')).not.toBeInTheDocument();
  });

  it('switches to edges tab and shows edges', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('엣지'));

    expect(screen.getByText('works_on')).toBeInTheDocument();
    expect(screen.getByText('uses')).toBeInTheDocument();
  });

  it('switches to stats tab and shows summary', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('통계'));

    expect(screen.getByText('총 노드')).toBeInTheDocument();
    expect(screen.getByText('총 엣지')).toBeInTheDocument();
    expect(screen.getByText('노드 타입 분포')).toBeInTheDocument();
    expect(screen.getByText('엣지 타입 분포')).toBeInTheDocument();
  });

  it('switches to path tab', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('경로'));

    expect(screen.getByText('경로 탐색')).toBeInTheDocument();
    expect(screen.getByText('경로 검색')).toBeInTheDocument();
  });

  it('switches to recursive traverse tab', () => {
    render(
      <MemoryRouter>
        <QueryPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('재귀 탐색'));

    expect(screen.getByTestId('bfs-search-panel')).toBeInTheDocument();
  });
});
