import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from './templateStore'
import type { WorkspaceTemplate } from '../types'

const mockTemplate: WorkspaceTemplate = {
  id: '00000000-0000-0000-0000-000000000001',
  name: '조직관리',
  description: '테스트 템플릿',
  levels: [
    { level: 0, node_type: 'user', label: '사용자', color: '#6366f1', badge_color: '#818cf8', fixed: true },
    { level: 1, node_type: 'group', label: '그룹', color: '#3b82f6', badge_color: '#60a5fa', fixed: true },
    { level: 2, node_type: 'task', label: '태스크', color: '#10b981', badge_color: '#34d399', fixed: false },
  ],
  edge_rules: [
    { source_type: 'group', target_type: 'user' },
    { source_type: 'group', target_type: 'task' },
  ],
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('templateStore', () => {
  beforeEach(() => {
    useTemplateStore.setState({
      templates: [],
      activeTemplate: null,
      loading: false,
      error: null,
    })
  })

  it('returns empty defaults when no template loaded', () => {
    expect(useTemplateStore.getState().nodeTypeColors()).toEqual({})
    expect(useTemplateStore.getState().nodeTypeBadgeColors()).toEqual({})
    expect(useTemplateStore.getState().getLevels()).toEqual([])
    expect(useTemplateStore.getState().nodeTypeGroups()).toEqual([])
  })

  it('returns node type colors from active template', () => {
    useTemplateStore.setState({ activeTemplate: mockTemplate })
    const colors = useTemplateStore.getState().nodeTypeColors()
    expect(colors).toEqual({
      user: '#6366f1',
      group: '#3b82f6',
      task: '#10b981',
    })
  })

  it('returns node type badge colors from active template', () => {
    useTemplateStore.setState({ activeTemplate: mockTemplate })
    const badges = useTemplateStore.getState().nodeTypeBadgeColors()
    expect(badges).toEqual({
      user: '#818cf8',
      group: '#60a5fa',
      task: '#34d399',
    })
  })

  it('returns levels from active template', () => {
    useTemplateStore.setState({ activeTemplate: mockTemplate })
    const levels = useTemplateStore.getState().getLevels()
    expect(levels).toHaveLength(3)
    expect(levels[0].node_type).toBe('user')
    expect(levels[2].node_type).toBe('task')
  })

  it('returns node types at specific level', () => {
    useTemplateStore.setState({ activeTemplate: mockTemplate })
    expect(useTemplateStore.getState().getNodeTypesAtLevel(0)).toEqual(['user'])
    expect(useTemplateStore.getState().getNodeTypesAtLevel(2)).toEqual(['task'])
    expect(useTemplateStore.getState().getNodeTypesAtLevel(99)).toEqual([])
  })

  it('checks edge rule allowance', () => {
    useTemplateStore.setState({ activeTemplate: mockTemplate })
    expect(useTemplateStore.getState().isEdgeAllowed('group', 'user')).toBe(true)
    expect(useTemplateStore.getState().isEdgeAllowed('group', 'task')).toBe(true)
    expect(useTemplateStore.getState().isEdgeAllowed('task', 'user')).toBe(false)
  })

  it('allows all edges when no template', () => {
    expect(useTemplateStore.getState().isEdgeAllowed('anything', 'goes')).toBe(true)
  })

  it('returns nodeTypeGroups for Select compat', () => {
    useTemplateStore.setState({ activeTemplate: mockTemplate })
    const groups = useTemplateStore.getState().nodeTypeGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('조직관리')
    expect(groups[0].options).toHaveLength(3)
    expect(groups[0].options[0]).toEqual({ value: 'user', label: '사용자' })
  })

  it('sets active template', () => {
    useTemplateStore.getState().setActiveTemplate(mockTemplate)
    expect(useTemplateStore.getState().activeTemplate).toEqual(mockTemplate)
  })

  it('tracks loading state', () => {
    useTemplateStore.setState({ loading: true })
    expect(useTemplateStore.getState().loading).toBe(true)
  })

  it('tracks error state', () => {
    useTemplateStore.setState({ error: 'Something failed' })
    expect(useTemplateStore.getState().error).toBe('Something failed')
  })
})
