import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNodes, getNode, createNode, updateNode, deleteNode } from './nodes';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockNode = {
  id: '1',
  type: 'person',
  name: 'Test',
  properties: {},
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('nodes API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getNodes fetches all nodes', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [mockNode] });
    const result = await getNodes();
    expect(apiClient.get).toHaveBeenCalledWith('/api/graph/nodes');
    expect(result).toEqual([mockNode]);
  });

  it('getNode fetches single node', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockNode });
    const result = await getNode('1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/graph/nodes/1');
    expect(result).toEqual(mockNode);
  });

  it('createNode posts new node', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockNode });
    const result = await createNode({ type: 'person', name: 'Test' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/graph/nodes', { type: 'person', name: 'Test' });
    expect(result).toEqual(mockNode);
  });

  it('updateNode puts updated node', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: mockNode });
    const result = await updateNode('1', { name: 'Updated' });
    expect(apiClient.put).toHaveBeenCalledWith('/api/graph/nodes/1', { name: 'Updated' });
    expect(result).toEqual(mockNode);
  });

  it('deleteNode deletes node', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { detail: 'deleted' } });
    const result = await deleteNode('1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/graph/nodes/1');
    expect(result).toEqual({ detail: 'deleted' });
  });
});
