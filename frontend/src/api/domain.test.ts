import { describe, it, expect, vi } from 'vitest';
import { listTemplates } from './templates';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockTemplates = [
  {
    id: 'tpl-1',
    name: 'default',
    description: 'Test',
    levels: [],
    edge_rules: [],
    created_by: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
];

describe('templates API', () => {
  it('calls /api/templates', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockTemplates });

    const result = await listTemplates();

    expect(apiClient.get).toHaveBeenCalledWith('/api/templates');
    expect(result).toEqual(mockTemplates);
  });
});
