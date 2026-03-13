import apiClient from './client';
import type { GraphNode } from '../types';

export async function getNodes(): Promise<GraphNode[]> {
  const { data } = await apiClient.get<GraphNode[]>('/api/graph/nodes');
  return data;
}

export async function getNode(id: string): Promise<GraphNode> {
  const { data } = await apiClient.get<GraphNode>(`/api/graph/nodes/${id}`);
  return data;
}

export async function createNode(payload: { type: string; name: string; properties?: Record<string, unknown> }): Promise<GraphNode> {
  const { data } = await apiClient.post<GraphNode>('/api/graph/nodes', payload);
  return data;
}

export async function updateNode(id: string, payload: { type?: string; name?: string; properties?: Record<string, unknown> }): Promise<GraphNode> {
  const { data } = await apiClient.put<GraphNode>(`/api/graph/nodes/${id}`, payload);
  return data;
}

export async function deleteNode(id: string): Promise<{ detail: string }> {
  const { data } = await apiClient.delete<{ detail: string }>(`/api/graph/nodes/${id}`);
  return data;
}
