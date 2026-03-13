import { create } from 'zustand';
import type { GraphNode } from '../types';
import * as searchApi from '../api/search';

export interface SearchState {
  query: string;
  results: GraphNode[];
  error: string | null;
  loading: boolean;
  setQuery: (query: string) => void;
  search: (q: string) => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  error: null,
  loading: false,

  setQuery: (query) => set({ query }),

  search: async (q) => {
    set({ loading: true, error: null, query: q });
    try {
      const results = await searchApi.searchNodes(q);
      set({ results, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '검색 실패';
      set({ error: message, loading: false });
    }
  },

  clearResults: () => set({ results: [], query: '' }),
}));
