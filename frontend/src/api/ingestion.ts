import apiClient from './client';
import type { IngestionJob, Suggestion } from '../types';

export async function uploadFile(file: File): Promise<{ job_id: string; filename: string; status: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<{ job_id: string; filename: string; status: string }>(
    '/api/ingestion/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function getIngestionStatus(jobId: string): Promise<IngestionJob> {
  const { data } = await apiClient.get<IngestionJob>(`/api/ingestion/status/${jobId}`);
  return data;
}

export async function getSuggestions(nodeId: string): Promise<Suggestion[]> {
  const { data } = await apiClient.get<Suggestion[]>(`/api/ingestion/suggestions/${nodeId}`);
  return data;
}
