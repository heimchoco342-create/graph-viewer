import { describe, it, expect, beforeEach } from 'vitest';
import apiClient from './client';

describe('apiClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should have baseURL set', () => {
    expect(apiClient.defaults.baseURL).toBe('/api');
  });

  it('should add Authorization header when token exists', () => {
    window.localStorage.setItem('token', 'test-jwt-token');

    const interceptors = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }[];
    };
    const handler = interceptors.handlers[0];
    const config = { headers: {} as Record<string, string> };
    const result = handler.fulfilled(config) as { headers: Record<string, string> };
    expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('should not add Authorization header when no token', () => {
    const interceptors = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }[];
    };
    const handler = interceptors.handlers[0];
    const config = { headers: {} as Record<string, string> };
    const result = handler.fulfilled(config) as { headers: Record<string, string> };
    expect(result.headers.Authorization).toBeUndefined();
  });
});
