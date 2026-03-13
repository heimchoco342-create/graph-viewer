import apiClient from './client';
import type { GraphNode } from '../types';

export async function searchNodes(q: string): Promise<GraphNode[]> {
  const { data } = await apiClient.get<GraphNode[]>('/api/graph/search', { params: { q } });
  return data;
}
