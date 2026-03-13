import { render, screen } from '@testing-library/react'
import { RegisterPage } from './RegisterPage'

describe('RegisterPage', () => {
  it('renders register form', () => {
    render(<RegisterPage />)
    expect(screen.getByText('회원가입')).toBeInTheDocument()
    expect(screen.getByText('이름')).toBeInTheDocument()
    expect(screen.getByText('이메일')).toBeInTheDocument()
    expect(screen.getByText('비밀번호')).toBeInTheDocument()
  })

  it('renders register button', () => {
    render(<RegisterPage />)
    expect(screen.getByText('가입')).toBeInTheDocument()
  })

  it('renders login link', () => {
    render(<RegisterPage />)
    expect(screen.getByText('로그인')).toBeInTheDocument()
  })

  it('calls onLoginClick', () => {
    const onLoginClick = vi.fn()
    render(<RegisterPage onLoginClick={onLoginClick} />)
    screen.getByText('로그인').click()
    expect(onLoginClick).toHaveBeenCalledTimes(1)
  })
})
