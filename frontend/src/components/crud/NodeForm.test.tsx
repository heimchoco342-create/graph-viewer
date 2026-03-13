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
})
