import { render, screen } from '@testing-library/react'
import { PathFinder } from './PathFinder'

describe('PathFinder', () => {
  it('renders title', () => {
    render(<PathFinder />)
    expect(screen.getByText('경로 탐색')).toBeInTheDocument()
  })

  it('renders source and target selects', () => {
    render(<PathFinder />)
    expect(screen.getByText('출발 노드')).toBeInTheDocument()
    expect(screen.getByText('도착 노드')).toBeInTheDocument()
  })

  it('renders search button', () => {
    render(<PathFinder />)
    expect(screen.getByText('경로 검색')).toBeInTheDocument()
  })

  it('renders path result when provided', () => {
    const pathResult = [
      { nodeId: '1', nodeLabel: 'A', edgeLabel: 'KNOWS' },
      { nodeId: '2', nodeLabel: 'B' },
    ]
    render(<PathFinder pathResult={pathResult} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('검색 결과')).toBeInTheDocument()
  })

  it('does not render result section without pathResult', () => {
    render(<PathFinder />)
    expect(screen.queryByText('검색 결과')).toBeNull()
  })
})
