import { useDomainStore } from '../store/domainStore'
import type { DomainConfig } from '../types'

const mockConfig: DomainConfig = {
  name: 'default',
  description: 'Test domain',
  node_type_groups: [
    {
      label: 'Organization',
      options: [
        { value: 'person', label: 'Person', color: '#3b82f6', badge_color: 'bg-blue-500' },
        { value: 'team', label: 'Team', color: '#8b5cf6', badge_color: 'bg-violet-500' },
      ],
    },
    {
      label: 'Kubernetes',
      options: [
        { value: 'k8s-pod', label: 'Pod', color: '#326ce5', badge_color: 'bg-blue-600' },
      ],
    },
  ],
  edge_type_groups: [
    {
      label: 'Organization',
      options: [
        { value: 'works_on', label: 'Works On' },
      ],
    },
  ],
  node_type_colors: { person: '#3b82f6', team: '#8b5cf6', 'k8s-pod': '#326ce5' },
  node_type_badge_colors: { person: 'bg-blue-500', team: 'bg-violet-500', 'k8s-pod': 'bg-blue-600' },
}

describe('domainStore', () => {
  beforeEach(() => {
    useDomainStore.setState({ config: mockConfig, loading: false, error: null })
  })

  afterEach(() => {
    useDomainStore.setState({ config: null, loading: false, error: null })
  })

  it('returns node type groups from config', () => {
    const groups = useDomainStore.getState().nodeTypeGroups()
    expect(groups).toHaveLength(2)
    expect(groups[0].label).toBe('Organization')
    expect(groups[1].label).toBe('Kubernetes')
  })

  it('returns node type colors from config', () => {
    const colors = useDomainStore.getState().nodeTypeColors()
    expect(colors.person).toBe('#3b82f6')
    expect(colors['k8s-pod']).toBe('#326ce5')
  })

  it('returns node type badge colors from config', () => {
    const badges = useDomainStore.getState().nodeTypeBadgeColors()
    expect(badges.person).toBe('bg-blue-500')
    expect(badges['k8s-pod']).toBe('bg-blue-600')
  })

  it('returns edge type groups from config', () => {
    const groups = useDomainStore.getState().edgeTypeGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].options[0].value).toBe('works_on')
  })

  it('returns empty arrays when config not loaded', () => {
    useDomainStore.setState({ config: null })
    expect(useDomainStore.getState().nodeTypeGroups()).toEqual([])
    expect(useDomainStore.getState().nodeTypeColors()).toEqual({})
    expect(useDomainStore.getState().nodeTypeBadgeColors()).toEqual({})
    expect(useDomainStore.getState().edgeTypeGroups()).toEqual([])
  })
})
