import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFile, getIngestionStatus, getSuggestions } from './ingestion';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('ingestion API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploadFile sends multipart form data', async () => {
    const mockResponse = { job_id: 'j1', filename: 'test.csv', status: 'pending' };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse });

    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    const result = await uploadFile(file);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/ingestion/upload',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    expect(result).toEqual(mockResponse);
  });

  it('getIngestionStatus fetches job status', async () => {
    const job = { id: 'j1', filename: 'test.csv', status: 'completed', created_at: '' };
    vi.mocked(apiClient.get).mockResolvedValue({ data: job });

    const result = await getIngestionStatus('j1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/ingestion/status/j1');
    expect(result).toEqual(job);
  });

  it('getSuggestions fetches suggestions for a node', async () => {
    const suggestions = [{ id: 's1', label: 'suggestion' }];
    vi.mocked(apiClient.get).mockResolvedValue({ data: suggestions });

    const result = await getSuggestions('node1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/ingestion/suggestions/node1');
    expect(result).toEqual(suggestions);
  });
});
