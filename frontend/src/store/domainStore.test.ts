import { describe, it, expect, beforeEach } from 'vitest'
import { useDomainStore } from './domainStore'
import type { WorkspaceTemplate } from '../types'

const mockTemplate: WorkspaceTemplate = {
  id: 'tpl-1',
  name: 'test',
  description: 'Test',
  levels: [
    { level: 0, node_type: 'person', label: 'Person', color: '#3b82f6', badge_color: 'bg-blue-500', fixed: false },
  ],
  edge_rules: [
    { source_type: 'person', target_type: 'person' },
  ],
  created_by: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
}

describe('domainStore (templateStore compat)', () => {
  beforeEach(() => {
    useDomainStore.setState({ templates: [], activeTemplate: null, loading: false, error: null })
  })

  it('returns empty defaults when no active template', () => {
    expect(useDomainStore.getState().nodeTypeGroups()).toEqual([])
    expect(useDomainStore.getState().nodeTypeColors()).toEqual({})
    expect(useDomainStore.getState().nodeTypeBadgeColors()).toEqual({})
  })

  it('returns derived data when active template is set', () => {
    useDomainStore.setState({ templates: [mockTemplate], activeTemplate: mockTemplate })

    expect(useDomainStore.getState().nodeTypeGroups()).toHaveLength(1)
    expect(useDomainStore.getState().nodeTypeColors()).toEqual({ person: '#3b82f6' })
    expect(useDomainStore.getState().nodeTypeBadgeColors()).toEqual({ person: 'bg-blue-500' })
  })

  it('does not refetch if templates already loaded', async () => {
    useDomainStore.setState({ templates: [mockTemplate], activeTemplate: mockTemplate })

    await useDomainStore.getState().fetchConfig()

    // Templates should remain unchanged (fetchConfig skips when templates exist)
    expect(useDomainStore.getState().templates).toEqual([mockTemplate])
  })

  it('tracks loading state', () => {
    useDomainStore.setState({ loading: true })
    expect(useDomainStore.getState().loading).toBe(true)
  })

  it('tracks error state', () => {
    useDomainStore.setState({ error: 'Something failed' })
    expect(useDomainStore.getState().error).toBe('Something failed')
  })
})
