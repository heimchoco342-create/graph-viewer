import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('renders logo text', () => {
    render(<Sidebar />)
    expect(screen.getByText('WNG')).toBeInTheDocument()
  })

  it('renders default menu items', () => {
    render(<Sidebar />)
    expect(screen.getByText('그래프')).toBeInTheDocument()
    expect(screen.getByText('업로드')).toBeInTheDocument()
    expect(screen.getByText('탐색')).toBeInTheDocument()
  })

  it('calls onMenuClick when item is clicked', () => {
    const onMenuClick = vi.fn()
    render(<Sidebar onMenuClick={onMenuClick} />)
    fireEvent.click(screen.getByText('탐색'))
    expect(onMenuClick).toHaveBeenCalledWith('탐색')
  })

  it('collapses when toggle button is clicked', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByLabelText('메뉴 접기'))
    expect(screen.queryByText('WNG')).not.toBeInTheDocument()
    expect(screen.queryByText('그래프')).not.toBeInTheDocument()
    expect(screen.getByText('🔗')).toBeInTheDocument()
  })

  it('expands when toggle button is clicked again', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByLabelText('메뉴 접기'))
    fireEvent.click(screen.getByLabelText('메뉴 펼치기'))
    expect(screen.getByText('WNG')).toBeInTheDocument()
    expect(screen.getByText('그래프')).toBeInTheDocument()
  })

  it('shows tooltip on icons when collapsed', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByLabelText('메뉴 접기'))
    const graphBtn = screen.getByText('🔗').closest('button')
    expect(graphBtn).toHaveAttribute('title', '그래프')
  })
})
