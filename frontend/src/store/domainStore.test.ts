import { describe, it, expect, beforeEach } from 'vitest'
import { useDomainStore } from './domainStore'
import type { DomainConfig } from '../types'

const mockConfig: DomainConfig = {
  name: 'test',
  description: 'Test',
  node_type_groups: [
    {
      label: 'Test',
      options: [
        { value: 'person', label: 'Person', color: '#3b82f6', badge_color: 'bg-blue-500' },
      ],
    },
  ],
  edge_type_groups: [
    {
      label: 'Edges',
      options: [{ value: 'works_on', label: 'Works On' }],
    },
  ],
  node_type_colors: { person: '#3b82f6' },
  node_type_badge_colors: { person: 'bg-blue-500' },
}

describe('domainStore', () => {
  beforeEach(() => {
    useDomainStore.setState({ config: null, loading: false, error: null })
  })

  it('returns empty defaults when no config loaded', () => {
    expect(useDomainStore.getState().nodeTypeGroups()).toEqual([])
    expect(useDomainStore.getState().nodeTypeColors()).toEqual({})
    expect(useDomainStore.getState().nodeTypeBadgeColors()).toEqual({})
    expect(useDomainStore.getState().edgeTypeGroups()).toEqual([])
  })

  it('returns config data when loaded', () => {
    useDomainStore.setState({ config: mockConfig })

    expect(useDomainStore.getState().nodeTypeGroups()).toHaveLength(1)
    expect(useDomainStore.getState().nodeTypeColors()).toEqual({ person: '#3b82f6' })
    expect(useDomainStore.getState().nodeTypeBadgeColors()).toEqual({ person: 'bg-blue-500' })
    expect(useDomainStore.getState().edgeTypeGroups()).toHaveLength(1)
  })

  it('does not refetch if config already loaded', async () => {
    useDomainStore.setState({ config: mockConfig })

    // fetchConfig should be a no-op when config exists
    await useDomainStore.getState().fetchConfig()

    // Config should remain unchanged
    expect(useDomainStore.getState().config).toEqual(mockConfig)
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
