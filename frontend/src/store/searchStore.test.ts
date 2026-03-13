import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSearchStore } from './searchStore';

vi.mock('../api/search', () => ({
  searchNodes: vi.fn(),
}));

import * as searchApi from '../api/search';

describe('searchStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchStore.setState({ query: '', results: [], error: null, loading: false });
  });

  it('search sets results', async () => {
    const nodes = [{ id: '1', type: 'person', name: 'Test', properties: {}, created_at: '', updated_at: '' }];
    vi.mocked(searchApi.searchNodes).mockResolvedValue(nodes);

    await useSearchStore.getState().search('Test');
    expect(useSearchStore.getState().results).toEqual(nodes);
    expect(useSearchStore.getState().query).toBe('Test');
  });

  it('search sets error on failure', async () => {
    vi.mocked(searchApi.searchNodes).mockRejectedValue(new Error('Search failed'));
    await useSearchStore.getState().search('Test');
    expect(useSearchStore.getState().error).toBe('Search failed');
  });

  it('clearResults resets state', () => {
    useSearchStore.setState({ query: 'test', results: [{ id: '1', type: 'a', name: 'b', properties: {}, created_at: '', updated_at: '' }] });
    useSearchStore.getState().clearResults();
    expect(useSearchStore.getState().query).toBe('');
    expect(useSearchStore.getState().results).toEqual([]);
  });

  it('setQuery updates query', () => {
    useSearchStore.getState().setQuery('hello');
    expect(useSearchStore.getState().query).toBe('hello');
  });
});
