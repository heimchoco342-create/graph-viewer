import { create } from 'zustand';
import type { IngestionJob, Suggestion } from '../types';
import * as ingestionApi from '../api/ingestion';

export interface IngestionState {
  jobs: IngestionJob[];
  suggestions: Suggestion[];
  error: string | null;
  loading: boolean;
  upload: (file: File) => Promise<void>;
  checkStatus: (jobId: string) => Promise<void>;
  getSuggestions: (nodeId: string) => Promise<void>;
}

export const useIngestionStore = create<IngestionState>((set, get) => ({
  jobs: [],
  suggestions: [],
  error: null,
  loading: false,

  upload: async (file) => {
    set({ loading: true, error: null });
    try {
      const res = await ingestionApi.uploadFile(file);
      const job: IngestionJob = {
        id: res.job_id,
        filename: res.filename,
        status: res.status,
        created_at: new Date().toISOString(),
      };
      set({ jobs: [...get().jobs, job], loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '업로드 실패';
      set({ error: message, loading: false });
    }
  },

  checkStatus: async (jobId) => {
    set({ error: null });
    try {
      const updated = await ingestionApi.getIngestionStatus(jobId);
      set({
        jobs: get().jobs.map((j) => (j.id === jobId ? updated : j)),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '상태 조회 실패';
      set({ error: message });
    }
  },

  getSuggestions: async (nodeId) => {
    set({ loading: true, error: null });
    try {
      const suggestions = await ingestionApi.getSuggestions(nodeId);
      set({ suggestions, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '제안 조회 실패';
      set({ error: message, loading: false });
    }
  },
}));
