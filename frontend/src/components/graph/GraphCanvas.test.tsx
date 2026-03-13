import { render, screen } from '@testing-library/react'
import { GraphCanvas } from './GraphCanvas'

// Mock ReactFlow since it requires a DOM environment with specific features
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Background: () => <div data-testid="rf-background" />,
  Controls: () => <div data-testid="rf-controls" />,
  MiniMap: () => <div data-testid="rf-minimap" />,
}))

describe('GraphCanvas', () => {
  it('renders without crashing', () => {
    render(<GraphCanvas nodes={[]} edges={[]} />)
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument()
  })

  it('renders ReactFlow with Background, Controls, and MiniMap', () => {
    render(<GraphCanvas nodes={[]} edges={[]} />)
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    expect(screen.getByTestId('rf-background')).toBeInTheDocument()
    expect(screen.getByTestId('rf-controls')).toBeInTheDocument()
    expect(screen.getByTestId('rf-minimap')).toBeInTheDocument()
  })
})
