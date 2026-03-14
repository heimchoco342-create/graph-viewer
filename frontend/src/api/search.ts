import apiClient from './client';
import type { GraphNode, SearchResponse } from '../types';

export async function searchNodes(q: string): Promise<GraphNode[]> {
  const { data } = await apiClient.get<SearchResponse>('/api/graph/search', { params: { q } });
  return data.nodes;
}
