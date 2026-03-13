import { create } from 'zustand';
import type { PathResult } from '../types';
import * as pathApi from '../api/path';

export interface PathState {
  sourceNode: string;
  targetNode: string;
  pathResult: PathResult | null;
  error: string | null;
  loading: boolean;
  setSourceNode: (id: string) => void;
  setTargetNode: (id: string) => void;
  findPath: (sourceId?: string, targetId?: string) => Promise<void>;
  clear: () => void;
}

export const usePathStore = create<PathState>((set, get) => ({
  sourceNode: '',
  targetNode: '',
  pathResult: null,
  error: null,
  loading: false,

  setSourceNode: (id) => set({ sourceNode: id }),
  setTargetNode: (id) => set({ targetNode: id }),

  findPath: async (sourceId?, targetId?) => {
    const src = sourceId ?? get().sourceNode;
    const tgt = targetId ?? get().targetNode;
    set({ loading: true, error: null });
    try {
      const pathResult = await pathApi.findPath(src, tgt);
      set({ pathResult, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '경로 탐색 실패';
      set({ error: message, loading: false });
    }
  },

  clear: () => set({ pathResult: null, sourceNode: '', targetNode: '' }),
}));
