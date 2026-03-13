import apiClient from './client';
import type { GraphEdge } from '../types';

export async function getEdges(): Promise<GraphEdge[]> {
  const { data } = await apiClient.get<GraphEdge[]>('/api/graph/edges');
  return data;
}

export async function createEdge(payload: {
  source_id: string;
  target_id: string;
  type: string;
  properties?: Record<string, unknown>;
  weight?: number;
}): Promise<GraphEdge> {
  const { data } = await apiClient.post<GraphEdge>('/api/graph/edges', payload);
  return data;
}

export async function updateEdge(id: string, payload: Partial<{
  source_id: string;
  target_id: string;
  type: string;
  properties: Record<string, unknown>;
  weight: number;
}>): Promise<GraphEdge> {
  const { data } = await apiClient.put<GraphEdge>(`/api/graph/edges/${id}`, payload);
  return data;
}

export async function deleteEdge(id: string): Promise<{ detail: string }> {
  const { data } = await apiClient.delete<{ detail: string }>(`/api/graph/edges/${id}`);
  return data;
}
