import { render, screen } from '@testing-library/react'
import { UploadPanel } from './UploadPanel'

describe('UploadPanel', () => {
  it('renders upload area', () => {
    render(<UploadPanel />)
    expect(screen.getByTestId('upload-panel')).toBeInTheDocument()
  })

  it('renders instruction text', () => {
    render(<UploadPanel />)
    expect(
      screen.getByText('파일을 드래그하거나 클릭하여 업로드')
    ).toBeInTheDocument()
  })

  it('shows accepted formats', () => {
    render(<UploadPanel acceptedFormats=".csv,.json" />)
    expect(screen.getByText('지원 형식: .csv,.json')).toBeInTheDocument()
  })

  it('renders file select button', () => {
    render(<UploadPanel />)
    expect(screen.getByText('파일 선택')).toBeInTheDocument()
  })
})
