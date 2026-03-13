import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEdges, createEdge, updateEdge, deleteEdge } from './edges';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockEdge = {
  id: 'e1',
  source_id: '1',
  target_id: '2',
  type: 'belongs_to',
  properties: {},
  weight: 1,
  created_at: '2024-01-01',
};

describe('edges API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getEdges fetches all edges', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [mockEdge] });
    const result = await getEdges();
    expect(apiClient.get).toHaveBeenCalledWith('/api/graph/edges');
    expect(result).toEqual([mockEdge]);
  });

  it('createEdge posts new edge', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockEdge });
    const result = await createEdge({ source_id: '1', target_id: '2', type: 'belongs_to' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/graph/edges', {
      source_id: '1',
      target_id: '2',
      type: 'belongs_to',
    });
    expect(result).toEqual(mockEdge);
  });

  it('updateEdge puts updated edge', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: mockEdge });
    const result = await updateEdge('e1', { type: 'updated' });
    expect(apiClient.put).toHaveBeenCalledWith('/api/graph/edges/e1', { type: 'updated' });
    expect(result).toEqual(mockEdge);
  });

  it('deleteEdge deletes edge', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { detail: 'deleted' } });
    const result = await deleteEdge('e1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/graph/edges/e1');
    expect(result).toEqual({ detail: 'deleted' });
  });
});
