import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIngestionStore } from './ingestionStore';

vi.mock('../api/ingestion', () => ({
  uploadFile: vi.fn(),
  getIngestionStatus: vi.fn(),
  getSuggestions: vi.fn(),
}));

import * as ingestionApi from '../api/ingestion';

describe('ingestionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIngestionStore.setState({ jobs: [], suggestions: [], error: null, loading: false });
  });

  it('upload adds job to list', async () => {
    vi.mocked(ingestionApi.uploadFile).mockResolvedValue({
      job_id: 'j1',
      filename: 'test.csv',
      status: 'pending',
    });

    const file = new File(['data'], 'test.csv');
    await useIngestionStore.getState().upload(file);

    expect(useIngestionStore.getState().jobs).toHaveLength(1);
    expect(useIngestionStore.getState().jobs[0].id).toBe('j1');
    expect(useIngestionStore.getState().jobs[0].filename).toBe('test.csv');
  });

  it('upload sets error on failure', async () => {
    vi.mocked(ingestionApi.uploadFile).mockRejectedValue(new Error('Upload failed'));
    await useIngestionStore.getState().upload(new File([''], 'test.csv'));
    expect(useIngestionStore.getState().error).toBe('Upload failed');
  });

  it('checkStatus updates job', async () => {
    const updated = { id: 'j1', filename: 'test.csv', status: 'completed', created_at: '' };
    useIngestionStore.setState({
      jobs: [{ id: 'j1', filename: 'test.csv', status: 'pending', created_at: '' }],
    });
    vi.mocked(ingestionApi.getIngestionStatus).mockResolvedValue(updated);

    await useIngestionStore.getState().checkStatus('j1');
    expect(useIngestionStore.getState().jobs[0].status).toBe('completed');
  });

  it('getSuggestions sets suggestions', async () => {
    const suggestions = [{ id: 's1', label: 'suggestion' }];
    vi.mocked(ingestionApi.getSuggestions).mockResolvedValue(suggestions);

    await useIngestionStore.getState().getSuggestions('node1');
    expect(useIngestionStore.getState().suggestions).toEqual(suggestions);
  });
});
