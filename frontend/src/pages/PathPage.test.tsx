import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PathPage } from './PathPage';
import { useAuthStore } from '../store/authStore';
import { useGraphStore } from '../store/graphStore';
import { usePathStore } from '../store/pathStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('PathPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { id: '1', email: 'a@b.c', name: 'User', created_at: '' } });
    useGraphStore.setState({ nodes: [], edges: [], selectedNode: null, selectedEdge: null, error: null, loading: false });
    usePathStore.setState({ sourceNode: '', targetNode: '', pathResult: null, error: null, loading: false });
  });

  it('renders path page', () => {
    render(
      <MemoryRouter>
        <PathPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('경로 탐색')).toBeInTheDocument();
    expect(screen.getByText('경로 검색')).toBeInTheDocument();
  });

  it('displays error when set', () => {
    usePathStore.setState({ error: '경로 탐색 실패' });

    render(
      <MemoryRouter>
        <PathPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('경로 탐색 실패');
  });
});
