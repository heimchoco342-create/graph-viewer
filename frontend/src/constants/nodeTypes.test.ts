import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useDomainStore } from './nodeTypes'
import type { WorkspaceTemplate } from '../types'

const mockTemplate: WorkspaceTemplate = {
  id: 'tpl-1',
  name: 'default',
  description: 'Test domain',
  levels: [
    { level: 0, node_type: 'person', label: 'Person', color: '#3b82f6', badge_color: 'bg-blue-500', fixed: false },
    { level: 0, node_type: 'team', label: 'Team', color: '#8b5cf6', badge_color: 'bg-violet-500', fixed: false },
    { level: 1, node_type: 'k8s-pod', label: 'Pod', color: '#326ce5', badge_color: 'bg-blue-600', fixed: false },
  ],
  edge_rules: [
    { source_type: 'person', target_type: 'team' },
  ],
  created_by: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
}

describe('nodeTypes (templateStore)', () => {
  beforeEach(() => {
    useDomainStore.setState({ templates: [mockTemplate], activeTemplate: mockTemplate, loading: false, error: null })
  })

  afterEach(() => {
    useDomainStore.setState({ templates: [], activeTemplate: null, loading: false, error: null })
  })

  it('returns node type groups from active template', () => {
    const groups = useDomainStore.getState().nodeTypeGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('default')
    expect(groups[0].options).toHaveLength(3)
  })

  it('returns node type colors from active template', () => {
    const colors = useDomainStore.getState().nodeTypeColors()
    expect(colors.person).toBe('#3b82f6')
    expect(colors['k8s-pod']).toBe('#326ce5')
  })

  it('returns node type badge colors from active template', () => {
    const badges = useDomainStore.getState().nodeTypeBadgeColors()
    expect(badges.person).toBe('bg-blue-500')
    expect(badges['k8s-pod']).toBe('bg-blue-600')
  })

  it('returns edge rules via isEdgeAllowed', () => {
    expect(useDomainStore.getState().isEdgeAllowed('person', 'team')).toBe(true)
    expect(useDomainStore.getState().isEdgeAllowed('team', 'person')).toBe(false)
  })

  it('returns empty defaults when no active template', () => {
    useDomainStore.setState({ activeTemplate: null })
    expect(useDomainStore.getState().nodeTypeGroups()).toEqual([])
    expect(useDomainStore.getState().nodeTypeColors()).toEqual({})
    expect(useDomainStore.getState().nodeTypeBadgeColors()).toEqual({})
  })
})
