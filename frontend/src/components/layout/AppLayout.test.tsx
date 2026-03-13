import { render, screen } from '@testing-library/react'
import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  it('renders sidebar and children', () => {
    render(
      <AppLayout sidebar={<div>Sidebar</div>}>
        <div>Main Content</div>
      </AppLayout>
    )
    expect(screen.getByText('Sidebar')).toBeInTheDocument()
    expect(screen.getByText('Main Content')).toBeInTheDocument()
  })

  it('has flex layout', () => {
    const { container } = render(
      <AppLayout sidebar={<div>S</div>}>
        <div>M</div>
      </AppLayout>
    )
    expect(container.firstChild).toHaveClass('flex')
  })
})
