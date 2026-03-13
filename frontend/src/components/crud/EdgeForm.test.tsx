import { render, screen } from '@testing-library/react'
import { EdgeForm } from './EdgeForm'

describe('EdgeForm', () => {
  it('renders form fields', () => {
    render(<EdgeForm />)
    expect(screen.getByText('출발 노드')).toBeInTheDocument()
    expect(screen.getByText('도착 노드')).toBeInTheDocument()
    expect(screen.getByText('관계 이름')).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    render(<EdgeForm />)
    expect(screen.getByText('저장')).toBeInTheDocument()
    expect(screen.getByText('취소')).toBeInTheDocument()
  })

  it('renders node options in selects', () => {
    const opts = [
      { value: '1', label: 'Node A' },
      { value: '2', label: 'Node B' },
    ]
    render(<EdgeForm nodeOptions={opts} />)
    expect(screen.getAllByText('Node A')).toHaveLength(2) // in both selects
    expect(screen.getAllByText('Node B')).toHaveLength(2)
  })
})
