import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders label text', () => {
    render(<Badge label="New" />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('applies default color', () => {
    render(<Badge label="Tag" />)
    expect(screen.getByText('Tag').className).toContain('bg-accent')
  })

  it('applies custom color', () => {
    render(<Badge label="Custom" color="bg-success" />)
    expect(screen.getByText('Custom').className).toContain('bg-success')
  })
})
