import { render, screen } from '@testing-library/react'
import { NodeDetail } from './NodeDetail'

describe('NodeDetail', () => {
  it('renders node label', () => {
    render(<NodeDetail id="1" label="Alice" type="Person" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders node type as badge', () => {
    render(<NodeDetail id="1" label="Alice" type="Person" />)
    expect(screen.getByText('Person')).toBeInTheDocument()
  })

  it('renders node ID', () => {
    render(<NodeDetail id="1" label="Alice" type="Person" />)
    expect(screen.getByText('ID: 1')).toBeInTheDocument()
  })

  it('renders properties', () => {
    render(
      <NodeDetail
        id="1"
        label="Alice"
        type="Person"
        properties={{ role: 'Developer' }}
      />
    )
    expect(screen.getByText('role')).toBeInTheDocument()
    expect(screen.getByText('Developer')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<NodeDetail id="1" label="Alice" type="Person" onClose={onClose} />)
    screen.getByLabelText('Close node detail').click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
