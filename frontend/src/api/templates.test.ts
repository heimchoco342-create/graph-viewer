import { describe, it, expect, vi } from 'vitest';
import { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate } from './templates';
import apiClient from './client';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockTemplate = {
  id: '00000000-0000-0000-0000-000000000001',
  name: '조직관리',
  description: null,
  levels: [
    { level: 0, node_type: 'user', label: '사용자', color: '#6366f1', badge_color: '#818cf8', fixed: true },
    { level: 1, node_type: 'group', label: '그룹', color: '#3b82f6', badge_color: '#60a5fa', fixed: true },
  ],
  edge_rules: [],
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('templates API', () => {
  it('listTemplates calls GET /api/templates', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [mockTemplate] });
    const result = await listTemplates();
    expect(apiClient.get).toHaveBeenCalledWith('/api/templates');
    expect(result).toEqual([mockTemplate]);
  });

  it('getTemplate calls GET /api/templates/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockTemplate });
    const result = await getTemplate(mockTemplate.id);
    expect(apiClient.get).toHaveBeenCalledWith(`/api/templates/${mockTemplate.id}`);
    expect(result).toEqual(mockTemplate);
  });

  it('createTemplate calls POST /api/templates', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockTemplate });
    const body = { name: '조직관리', description: null, levels: mockTemplate.levels, edge_rules: [] };
    const result = await createTemplate(body);
    expect(apiClient.post).toHaveBeenCalledWith('/api/templates', body);
    expect(result).toEqual(mockTemplate);
  });

  it('updateTemplate calls PUT /api/templates/:id', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: mockTemplate });
    const body = { name: 'updated' };
    const result = await updateTemplate(mockTemplate.id, body);
    expect(apiClient.put).toHaveBeenCalledWith(`/api/templates/${mockTemplate.id}`, body);
    expect(result).toEqual(mockTemplate);
  });

  it('deleteTemplate calls DELETE /api/templates/:id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({});
    await deleteTemplate(mockTemplate.id);
    expect(apiClient.delete).toHaveBeenCalledWith(`/api/templates/${mockTemplate.id}`);
  });
});
