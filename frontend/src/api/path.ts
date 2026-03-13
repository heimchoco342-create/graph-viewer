import apiClient from './client';
import type { PathResult } from '../types';

export async function findPath(sourceId: string, targetId: string, weighted = false): Promise<PathResult> {
  const { data } = await apiClient.get<PathResult>('/api/path/find', {
    params: { source_id: sourceId, target_id: targetId, weighted },
  });
  return data;
}
