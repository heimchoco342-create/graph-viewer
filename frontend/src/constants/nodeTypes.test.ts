import {
  NODE_TYPE_GROUPS,
  ALL_NODE_TYPE_OPTIONS,
  NODE_TYPE_COLORS,
  NODE_TYPE_BADGE_COLORS,
} from './nodeTypes'

describe('nodeTypes constants', () => {
  it('has Organization and Kubernetes groups', () => {
    const groupLabels = NODE_TYPE_GROUPS.map((g) => g.label)
    expect(groupLabels).toContain('Organization')
    expect(groupLabels).toContain('Kubernetes')
  })

  it('Organization group has 6 types', () => {
    const org = NODE_TYPE_GROUPS.find((g) => g.label === 'Organization')!
    expect(org.options).toHaveLength(6)
  })

  it('Kubernetes group has k8s-prefixed values', () => {
    const k8s = NODE_TYPE_GROUPS.find((g) => g.label === 'Kubernetes')!
    expect(k8s.options.length).toBeGreaterThanOrEqual(7)
    k8s.options.forEach((opt) => {
      expect(opt.value).toMatch(/^k8s-/)
    })
  })

  it('ALL_NODE_TYPE_OPTIONS is flat list of all options', () => {
    const totalFromGroups = NODE_TYPE_GROUPS.reduce((sum, g) => sum + g.options.length, 0)
    expect(ALL_NODE_TYPE_OPTIONS).toHaveLength(totalFromGroups)
  })

  it('every type has a color mapping', () => {
    ALL_NODE_TYPE_OPTIONS.forEach((opt) => {
      expect(NODE_TYPE_COLORS[opt.value]).toBeDefined()
      expect(NODE_TYPE_BADGE_COLORS[opt.value]).toBeDefined()
    })
  })
})
