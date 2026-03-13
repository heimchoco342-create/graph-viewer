import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchPage } from './SearchPage';
import { useAuthStore } from '../store/authStore';
import { useSearchStore } from '../store/searchStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { id: '1', email: 'a@b.c', name: 'User', created_at: '' } });
    useSearchStore.setState({ query: '', results: [], error: null, loading: false });
  });

  it('renders search page with header', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '검색' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('노드 검색...')).toBeInTheDocument();
  });
});
