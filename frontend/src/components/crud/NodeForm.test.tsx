import { render, screen } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { NodeForm } from './NodeForm'
import { useTemplateStore } from '../../store/templateStore'
import type { WorkspaceTemplate } from '../../types'

const mockTemplate: WorkspaceTemplate = {
  id: 'tpl-1',
  name: 'WNG',
  description: 'Test',
  levels: [
    { level: 0, node_type: 'person', label: 'Person', color: '#3b82f6', badge_color: 'bg-blue-500', fixed: false },
    { level: 0, node_type: 'team', label: 'Team', color: '#8b5cf6', badge_color: 'bg-violet-500', fixed: false },
    { level: 0, node_type: 'system', label: 'System', color: '#10b981', badge_color: 'bg-green-500', fixed: false },
  ],
  edge_rules: [],
  created_by: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
}

describe('NodeForm', () => {
  beforeEach(() => {
    useTemplateStore.setState({
      templates: [mockTemplate],
      activeTemplate: mockTemplate,
      loading: false,
      error: null,
    })
  })

  it('renders form fields', () => {
    render(<NodeForm />)
    expect(screen.getByText('이름')).toBeInTheDocument()
    expect(screen.getByText('타입')).toBeInTheDocument()
    expect(screen.getByText('설명')).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    render(<NodeForm />)
    expect(screen.getByText('저장')).toBeInTheDocument()
    expect(screen.getByText('취소')).toBeInTheDocument()
  })

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn()
    render(<NodeForm onCancel={onCancel} />)
    screen.getByText('취소').click()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders a type group from the active template', () => {
    render(<NodeForm />)
    const groups = screen.getAllByRole('group')
    expect(groups.length).toBe(1)
  })

  it('includes node type options from the template levels', () => {
    render(<NodeForm />)
    expect(screen.getByText('Person')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('renders no type options when no active template', () => {
    useTemplateStore.setState({ activeTemplate: null })
    render(<NodeForm />)
    const select = screen.getByRole('combobox')
    // No optgroup or options rendered
    expect(select.querySelectorAll('optgroup')).toHaveLength(0)
  })
})
