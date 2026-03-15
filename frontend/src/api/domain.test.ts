import { describe, it, expect, vi } from 'vitest';
import { getDomainConfig } from './domain';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockResponse = {
  name: 'default',
  description: 'Test',
  node_type_groups: [],
  edge_type_groups: [],
  node_type_colors: {},
  node_type_badge_colors: {},
};

describe('domain API', () => {
  it('calls /api/domain/config', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockResponse });

    const result = await getDomainConfig();

    expect(apiClient.get).toHaveBeenCalledWith('/api/domain/config');
    expect(result).toEqual(mockResponse);
  });
});
