import apiClient from './client';
import type { WorkspaceTemplate } from '../types';

export async function listTemplates(): Promise<WorkspaceTemplate[]> {
  const { data } = await apiClient.get<WorkspaceTemplate[]>('/api/templates');
  return data;
}

export async function getTemplate(templateId: string): Promise<WorkspaceTemplate> {
  const { data } = await apiClient.get<WorkspaceTemplate>(`/api/templates/${templateId}`);
  return data;
}

export async function createTemplate(
  body: Pick<WorkspaceTemplate, 'name' | 'description' | 'levels' | 'edge_rules'>
): Promise<WorkspaceTemplate> {
  const { data } = await apiClient.post<WorkspaceTemplate>('/api/templates', body);
  return data;
}

export async function updateTemplate(
  templateId: string,
  body: Partial<Pick<WorkspaceTemplate, 'name' | 'description' | 'levels' | 'edge_rules'>>
): Promise<WorkspaceTemplate> {
  const { data } = await apiClient.put<WorkspaceTemplate>(`/api/templates/${templateId}`, body);
  return data;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`/api/templates/${templateId}`);
}

export async function getGraphTemplate(graphId: string): Promise<WorkspaceTemplate> {
  const { data } = await apiClient.get<WorkspaceTemplate>(`/api/templates/graph/${graphId}`);
  return data;
}
