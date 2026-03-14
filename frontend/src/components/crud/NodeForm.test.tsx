import { render, screen } from '@testing-library/react'
import { NodeForm } from './NodeForm'

describe('NodeForm', () => {
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

  it('renders Organization and Kubernetes type groups', () => {
    render(<NodeForm />)
    const groups = screen.getAllByRole('group')
    expect(groups.length).toBe(2)
  })

  it('includes K8s type options like Pod and Deployment', () => {
    render(<NodeForm />)
    expect(screen.getByText('Pod')).toBeInTheDocument()
    expect(screen.getByText('Deployment')).toBeInTheDocument()
    expect(screen.getByText('Service')).toBeInTheDocument()
    expect(screen.getByText('ConfigMap')).toBeInTheDocument()
    expect(screen.getByText('Secret')).toBeInTheDocument()
  })

  it('still includes original organization types', () => {
    render(<NodeForm />)
    expect(screen.getByText('Person')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })
})
