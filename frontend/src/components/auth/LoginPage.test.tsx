import { render, screen } from '@testing-library/react'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByText('WNG')).toBeInTheDocument()
    expect(screen.getByText('이메일')).toBeInTheDocument()
    expect(screen.getByText('비밀번호')).toBeInTheDocument()
  })

  it('renders login button', () => {
    render(<LoginPage />)
    expect(screen.getByText('로그인')).toBeInTheDocument()
  })

  it('renders register link', () => {
    render(<LoginPage />)
    expect(screen.getByText('회원가입')).toBeInTheDocument()
  })

  it('calls onRegisterClick', () => {
    const onRegisterClick = vi.fn()
    render(<LoginPage onRegisterClick={onRegisterClick} />)
    screen.getByText('회원가입').click()
    expect(onRegisterClick).toHaveBeenCalledTimes(1)
  })
})
