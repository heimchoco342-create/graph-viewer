import { render } from '@testing-library/react'
import { WngLogo } from './WngLogo'

describe('WngLogo', () => {
  it('renders an SVG element', () => {
    const { container } = render(<WngLogo />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('applies the given size', () => {
    const { container } = render(<WngLogo size={48} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('48')
    expect(svg.getAttribute('height')).toBe('48')
  })

  it('uses default size of 32', () => {
    const { container } = render(<WngLogo />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })

  it('renders 6 circle nodes', () => {
    const { container } = render(<WngLogo />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(6)
  })
})
