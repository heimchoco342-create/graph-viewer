import { render, screen } from '@testing-library/react'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false}>
        <p>Content</p>
      </Modal>
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders content when isOpen is true', () => {
    render(
      <Modal isOpen={true}>
        <p>Modal Content</p>
      </Modal>
    )
    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} title="My Modal">
        <p>Body</p>
      </Modal>
    )
    expect(screen.getByText('My Modal')).toBeInTheDocument()
  })

  it('renders close button', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Body</p>
      </Modal>
    )
    screen.getByLabelText('Close modal').click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
