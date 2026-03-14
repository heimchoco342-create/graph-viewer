import apiClient from './client';
import type { GraphNode, SearchResponse } from '../types';

export async function searchNodes(q: string): Promise<GraphNode[]> {
  const { data } = await apiClient.get<SearchResponse>('/api/graph/search', { params: { q } });
  return data.nodes;
}

export interface TraverseResult {
  node_id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  depth: number;
  score: number;
}

export interface TraverseResponse {
  query: string;
  seed_count: number;
  total_traversed: number;
  results: TraverseResult[];
}

export async function traverseGraph(q: string, graphId?: string): Promise<TraverseResponse> {
  const params: Record<string, string> = { q };
  if (graphId) params.graph_id = graphId;
  const { data } = await apiClient.get<TraverseResponse>('/api/graph/traverse', { params });
  return data;
}
