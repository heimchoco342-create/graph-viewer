import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UploadPage } from './UploadPage';
import { useAuthStore } from '../store/authStore';
import { useIngestionStore } from '../store/ingestionStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { id: '1', email: 'a@b.c', name: 'User', created_at: '' } });
    useIngestionStore.setState({ jobs: [], suggestions: [], error: null, loading: false });
  });

  it('renders upload page', () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('파일 업로드')).toBeInTheDocument();
    expect(screen.getByTestId('upload-panel')).toBeInTheDocument();
  });

  it('displays error when set', () => {
    useIngestionStore.setState({ error: '업로드 실패' });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('업로드 실패');
  });
});
