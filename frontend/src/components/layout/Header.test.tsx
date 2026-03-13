import { render, screen } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('renders title', () => {
    render(<Header title="Dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders userName when provided', () => {
    render(<Header title="Dashboard" userName="Alice" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('does not render userName when not provided', () => {
    render(<Header title="Dashboard" />)
    expect(screen.queryByText('Alice')).toBeNull()
  })
})
