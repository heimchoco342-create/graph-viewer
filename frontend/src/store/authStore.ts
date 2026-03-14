import { create } from 'zustand';
import type { User } from '../types';
import * as authApi from '../api/auth';

export interface AuthState {
  token: string | null;
  user: User | null;
  error: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

function getStoredToken(): string | null {
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (storage && typeof storage.getItem === 'function') {
      return storage.getItem('token');
    }
    return null;
  } catch {
    return null;
  }
}

function setStoredToken(token: string): void {
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem('token', token);
    }
  } catch {
    // ignore
  }
}

function removeStoredToken(): void {
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem('token');
    }
  } catch {
    // ignore
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: null,
  error: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      setStoredToken(res.access_token);
      set({ token: res.access_token, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '로그인 실패';
      set({ error: message, loading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.register(email, password, name);
      setStoredToken(res.access_token);
      set({ token: res.access_token, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원가입 실패';
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: () => {
    removeStoredToken();
    set({ token: null, user: null });
  },

  fetchMe: async () => {
    set({ loading: true, error: null });
    try {
      const user = await authApi.getMe();
      set({ user, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '사용자 정보 조회 실패';
      set({ error: message, loading: false, token: null, user: null });
      removeStoredToken();
      throw err;
    }
  },
}));
