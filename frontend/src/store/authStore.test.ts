import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage before importing store
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) { return this.store[key] ?? null; },
  setItem(key: string, value: string) { this.store[key] = value; },
  removeItem(key: string) { delete this.store[key]; },
  clear() { this.store = {}; },
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
}));

import * as authApi from '../api/auth';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    useAuthStore.setState({ token: null, user: null, error: null, loading: false });
  });

  it('login sets token and stores in localStorage', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: 'jwt123', token_type: 'bearer' });

    await useAuthStore.getState().login('test@example.com', 'pass');

    expect(useAuthStore.getState().token).toBe('jwt123');
    expect(localStorageMock.getItem('token')).toBe('jwt123');
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('login sets error on failure', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

    await expect(useAuthStore.getState().login('test@example.com', 'wrong')).rejects.toThrow();

    expect(useAuthStore.getState().error).toBe('Invalid credentials');
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('register sets token', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ access_token: 'jwt456', token_type: 'bearer' });

    await useAuthStore.getState().register('test@example.com', 'pass', 'Test');

    expect(useAuthStore.getState().token).toBe('jwt456');
    expect(localStorageMock.getItem('token')).toBe('jwt456');
  });

  it('register sets error on failure', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('Email taken'));

    await expect(useAuthStore.getState().register('test@example.com', 'pass', 'Test')).rejects.toThrow();

    expect(useAuthStore.getState().error).toBe('Email taken');
  });

  it('logout clears token and user', () => {
    localStorageMock.setItem('token', 'jwt123');
    useAuthStore.setState({ token: 'jwt123', user: { id: '1', email: 'a@b.c', name: 'Test', created_at: '' } });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    // Verify removeStoredToken was called (token should be removed from store)
    expect(localStorageMock.store['token']).toBeUndefined();
  });

  it('fetchMe sets user', async () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test', created_at: '2024-01-01' };
    vi.mocked(authApi.getMe).mockResolvedValue(user);

    await useAuthStore.getState().fetchMe();

    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('fetchMe clears token on failure', async () => {
    useAuthStore.setState({ token: 'jwt123' });
    vi.mocked(authApi.getMe).mockRejectedValue(new Error('Unauthorized'));

    await expect(useAuthStore.getState().fetchMe()).rejects.toThrow();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
