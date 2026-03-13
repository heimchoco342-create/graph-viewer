import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('renders logo text', () => {
    render(<Sidebar />)
    expect(screen.getByText('Knowledge Graph')).toBeInTheDocument()
  })

  it('renders default menu items', () => {
    render(<Sidebar />)
    expect(screen.getByText('그래프')).toBeInTheDocument()
    expect(screen.getByText('검색')).toBeInTheDocument()
    expect(screen.getByText('업로드')).toBeInTheDocument()
    expect(screen.getByText('설정')).toBeInTheDocument()
  })

  it('calls onMenuClick when item is clicked', () => {
    const onMenuClick = vi.fn()
    render(<Sidebar onMenuClick={onMenuClick} />)
    screen.getByText('검색').click()
    expect(onMenuClick).toHaveBeenCalledWith('검색')
  })
})
