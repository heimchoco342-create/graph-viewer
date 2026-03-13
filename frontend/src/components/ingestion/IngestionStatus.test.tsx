import { render, screen } from '@testing-library/react'
import { IngestionStatus } from './IngestionStatus'

describe('IngestionStatus', () => {
  it('renders empty state', () => {
    render(<IngestionStatus jobs={[]} />)
    expect(screen.getByText('처리 중인 작업이 없습니다.')).toBeInTheDocument()
  })

  it('renders job file names', () => {
    const jobs = [
      { id: '1', fileName: 'data.csv', status: 'completed' as const },
      { id: '2', fileName: 'nodes.json', status: 'processing' as const, progress: 50 },
    ]
    render(<IngestionStatus jobs={jobs} />)
    expect(screen.getByText('data.csv')).toBeInTheDocument()
    expect(screen.getByText('nodes.json')).toBeInTheDocument()
  })

  it('renders status badges', () => {
    const jobs = [
      { id: '1', fileName: 'data.csv', status: 'completed' as const },
    ]
    render(<IngestionStatus jobs={jobs} />)
    expect(screen.getByText('완료')).toBeInTheDocument()
  })

  it('renders progress percentage', () => {
    const jobs = [
      { id: '1', fileName: 'data.csv', status: 'processing' as const, progress: 75 },
    ]
    render(<IngestionStatus jobs={jobs} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })
})
