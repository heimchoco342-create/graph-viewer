import { render, screen } from '@testing-library/react'
import { EdgeDetail } from './EdgeDetail'

describe('EdgeDetail', () => {
  it('renders source and target', () => {
    render(<EdgeDetail id="e1" source="A" target="B" />)
    expect(screen.getByText('A → B')).toBeInTheDocument()
  })

  it('renders label as badge', () => {
    render(<EdgeDetail id="e1" source="A" target="B" label="KNOWS" />)
    expect(screen.getByText('KNOWS')).toBeInTheDocument()
  })

  it('renders edge ID', () => {
    render(<EdgeDetail id="e1" source="A" target="B" />)
    expect(screen.getByText('ID: e1')).toBeInTheDocument()
  })

  it('renders properties', () => {
    render(
      <EdgeDetail
        id="e1"
        source="A"
        target="B"
        properties={{ since: '2024' }}
      />
    )
    expect(screen.getByText('since')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<EdgeDetail id="e1" source="A" target="B" onClose={onClose} />)
    screen.getByLabelText('Close edge detail').click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
