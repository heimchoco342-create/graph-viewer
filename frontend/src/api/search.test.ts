import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchNodes } from './search';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('search API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('searchNodes sends query param', async () => {
    const nodes = [{ id: '1', type: 'person', name: 'Test', properties: {}, created_at: '', updated_at: '' }];
    vi.mocked(apiClient.get).mockResolvedValue({ data: nodes });

    const result = await searchNodes('Test');
    expect(apiClient.get).toHaveBeenCalledWith('/api/graph/search', { params: { q: 'Test' } });
    expect(result).toEqual(nodes);
  });
});
