import { render, screen } from '@testing-library/react'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('renders input with default placeholder', () => {
    render(<SearchBar />)
    expect(screen.getByPlaceholderText('노드 검색...')).toBeInTheDocument()
  })

  it('renders custom placeholder', () => {
    render(<SearchBar placeholder="Search nodes..." />)
    expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument()
  })

  it('renders search results when provided', () => {
    const results = [
      { id: '1', label: 'Alice', type: 'Person' },
      { id: '2', label: 'Bob', type: 'Person' },
    ]
    render(<SearchBar results={results} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('does not render dropdown when results are empty', () => {
    render(<SearchBar results={[]} />)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('calls onResultClick when result is clicked', () => {
    const onResultClick = vi.fn()
    const results = [{ id: '1', label: 'Alice', type: 'Person' }]
    render(<SearchBar results={results} onResultClick={onResultClick} />)
    screen.getByText('Alice').click()
    expect(onResultClick).toHaveBeenCalledWith(results[0])
  })
})
