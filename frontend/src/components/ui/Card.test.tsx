import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card body</p></Card>)
    expect(screen.getByText('Card body')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Card title="Card Title"><p>Body</p></Card>)
    expect(screen.getByText('Card Title')).toBeInTheDocument()
  })

  it('does not render title when not provided', () => {
    render(<Card><p>Body only</p></Card>)
    expect(screen.queryByRole('heading')).toBeNull()
  })
})
