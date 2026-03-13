import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findPath } from './path';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('path API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findPath sends correct params', async () => {
    const pathResult = { nodes: [], edges: [], total_weight: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: pathResult });

    const result = await findPath('1', '2', true);
    expect(apiClient.get).toHaveBeenCalledWith('/api/path/find', {
      params: { source_id: '1', target_id: '2', weighted: true },
    });
    expect(result).toEqual(pathResult);
  });
});
