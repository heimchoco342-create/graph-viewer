import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePathStore } from './pathStore';

vi.mock('../api/path', () => ({
  findPath: vi.fn(),
}));

import * as pathApi from '../api/path';

describe('pathStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathStore.setState({ sourceNode: '', targetNode: '', pathResult: null, error: null, loading: false });
  });

  it('findPath sets pathResult', async () => {
    const result = { nodes: [], edges: [], total_weight: 0 };
    vi.mocked(pathApi.findPath).mockResolvedValue(result);

    usePathStore.setState({ sourceNode: '1', targetNode: '2' });
    await usePathStore.getState().findPath();
    expect(pathApi.findPath).toHaveBeenCalledWith('1', '2');
    expect(usePathStore.getState().pathResult).toEqual(result);
  });

  it('findPath uses explicit params when provided', async () => {
    const result = { nodes: [], edges: [], total_weight: 5 };
    vi.mocked(pathApi.findPath).mockResolvedValue(result);

    await usePathStore.getState().findPath('a', 'b');
    expect(pathApi.findPath).toHaveBeenCalledWith('a', 'b');
  });

  it('findPath sets error on failure', async () => {
    vi.mocked(pathApi.findPath).mockRejectedValue(new Error('Not found'));
    usePathStore.setState({ sourceNode: '1', targetNode: '2' });
    await usePathStore.getState().findPath();
    expect(usePathStore.getState().error).toBe('Not found');
  });

  it('setSourceNode and setTargetNode update state', () => {
    usePathStore.getState().setSourceNode('x');
    usePathStore.getState().setTargetNode('y');
    expect(usePathStore.getState().sourceNode).toBe('x');
    expect(usePathStore.getState().targetNode).toBe('y');
  });

  it('clear resets state', () => {
    usePathStore.setState({ sourceNode: '1', targetNode: '2', pathResult: { nodes: [], edges: [], total_weight: 0 } });
    usePathStore.getState().clear();
    expect(usePathStore.getState().sourceNode).toBe('');
    expect(usePathStore.getState().pathResult).toBeNull();
  });
});
