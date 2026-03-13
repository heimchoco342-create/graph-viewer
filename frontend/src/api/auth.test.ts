import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, register, getMe } from './auth';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login sends correct payload and returns token', async () => {
    const mockResponse = { data: { access_token: 'jwt123', token_type: 'bearer' } };
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    const result = await login('test@example.com', 'password');
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'test@example.com',
      password: 'password',
    });
    expect(result).toEqual({ access_token: 'jwt123', token_type: 'bearer' });
  });

  it('register sends correct payload and returns token', async () => {
    const mockResponse = { data: { access_token: 'jwt456', token_type: 'bearer' } };
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    const result = await register('test@example.com', 'password', 'Test');
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
      email: 'test@example.com',
      password: 'password',
      name: 'Test',
    });
    expect(result).toEqual({ access_token: 'jwt456', token_type: 'bearer' });
  });

  it('getMe returns user data', async () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test', created_at: '2024-01-01' };
    vi.mocked(apiClient.get).mockResolvedValue({ data: user });

    const result = await getMe();
    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me');
    expect(result).toEqual(user);
  });
});
