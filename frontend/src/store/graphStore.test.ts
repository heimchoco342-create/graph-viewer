import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGraphStore } from './graphStore';

vi.mock('../api/nodes', () => ({
  getNodes: vi.fn(),
  createNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
}));

vi.mock('../api/edges', () => ({
  getEdges: vi.fn(),
  createEdge: vi.fn(),
  updateEdge: vi.fn(),
  deleteEdge: vi.fn(),
}));

import * as nodesApi from '../api/nodes';
import * as edgesApi from '../api/edges';

const mockNode = { id: '1', type: 'person', name: 'Test', properties: {}, created_at: '', updated_at: '' };
const mockEdge = { id: 'e1', source_id: '1', target_id: '2', type: 'rel', properties: {}, weight: 1, created_at: '' };

describe('graphStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGraphStore.setState({
      graphs: [],
      selectedGraphId: null,
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      error: null,
      loading: false,
    });
  });

  it('fetchNodes sets nodes', async () => {
    vi.mocked(nodesApi.getNodes).mockResolvedValue([mockNode]);
    await useGraphStore.getState().fetchNodes();
    expect(useGraphStore.getState().nodes).toEqual([mockNode]);
  });

  it('fetchEdges sets edges', async () => {
    vi.mocked(edgesApi.getEdges).mockResolvedValue([mockEdge]);
    await useGraphStore.getState().fetchEdges();
    expect(useGraphStore.getState().edges).toEqual([mockEdge]);
  });

  it('createNode adds to nodes list', async () => {
    vi.mocked(nodesApi.createNode).mockResolvedValue(mockNode);
    const result = await useGraphStore.getState().createNode({ type: 'person', name: 'Test' });
    expect(result).toEqual(mockNode);
    expect(useGraphStore.getState().nodes).toEqual([mockNode]);
  });

  it('updateNode updates in nodes list', async () => {
    const updated = { ...mockNode, name: 'Updated' };
    useGraphStore.setState({ nodes: [mockNode] });
    vi.mocked(nodesApi.updateNode).mockResolvedValue(updated);
    await useGraphStore.getState().updateNode('1', { name: 'Updated' });
    expect(useGraphStore.getState().nodes[0].name).toBe('Updated');
  });

  it('deleteNode removes from nodes list', async () => {
    useGraphStore.setState({ nodes: [mockNode], selectedNode: mockNode });
    vi.mocked(nodesApi.deleteNode).mockResolvedValue({ detail: 'deleted' });
    await useGraphStore.getState().deleteNode('1');
    expect(useGraphStore.getState().nodes).toEqual([]);
    expect(useGraphStore.getState().selectedNode).toBeNull();
  });

  it('createEdge adds to edges list', async () => {
    vi.mocked(edgesApi.createEdge).mockResolvedValue(mockEdge);
    await useGraphStore.getState().createEdge({ source_id: '1', target_id: '2', type: 'rel' });
    expect(useGraphStore.getState().edges).toEqual([mockEdge]);
  });

  it('deleteEdge removes from edges list', async () => {
    useGraphStore.setState({ edges: [mockEdge], selectedEdge: mockEdge });
    vi.mocked(edgesApi.deleteEdge).mockResolvedValue({ detail: 'deleted' });
    await useGraphStore.getState().deleteEdge('e1');
    expect(useGraphStore.getState().edges).toEqual([]);
    expect(useGraphStore.getState().selectedEdge).toBeNull();
  });

  it('setSelectedNode sets node and clears edge', () => {
    useGraphStore.setState({ selectedEdge: mockEdge });
    useGraphStore.getState().setSelectedNode(mockNode);
    expect(useGraphStore.getState().selectedNode).toEqual(mockNode);
    expect(useGraphStore.getState().selectedEdge).toBeNull();
  });

  it('fetchNodes sets error on failure', async () => {
    vi.mocked(nodesApi.getNodes).mockRejectedValue(new Error('Network error'));
    await useGraphStore.getState().fetchNodes();
    expect(useGraphStore.getState().error).toBe('Network error');
  });
});
