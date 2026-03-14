import apiClient from './client';
import type { GraphMeta, GraphDetail } from '../types';

export async function getGraphs(): Promise<GraphMeta[]> {
  const { data } = await apiClient.get<GraphMeta[]>('/api/graph/graphs');
  return data;
}

export async function getGraphDetail(graphId: string): Promise<GraphDetail> {
  const { data } = await apiClient.get<GraphDetail>(`/api/graph/graphs/${graphId}`);
  return data;
}
