import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock localStorage before importing client
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import after mocking
const { default: apiClient } = await import('./client');

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have baseURL set', () => {
    expect(apiClient.defaults.baseURL).toBe('http://localhost:8000');
  });

  it('should add Authorization header when token exists', () => {
    localStorageMock.getItem.mockReturnValue('test-jwt-token');

    const interceptors = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }[];
    };
    const handler = interceptors.handlers[0];
    const config = { headers: {} as Record<string, string> };
    const result = handler.fulfilled(config) as { headers: Record<string, string> };
    expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('should not add Authorization header when no token', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const interceptors = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }[];
    };
    const handler = interceptors.handlers[0];
    const config = { headers: {} as Record<string, string> };
    const result = handler.fulfilled(config) as { headers: Record<string, string> };
    expect(result.headers.Authorization).toBeUndefined();
  });
});
