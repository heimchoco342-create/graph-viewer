import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

export interface LoginPageProps {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  onRegisterClick?: () => void
}

export function LoginPage({ onSubmit, onRegisterClick }: LoginPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md rounded-xl bg-bg-secondary border border-border p-8">
        <h1 className="text-2xl font-bold text-text-primary text-center mb-6">
          WNG
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="이메일"
            placeholder="you@example.com"
            type="email"
            name="email"
          />
          <Input
            label="비밀번호"
            placeholder="비밀번호 입력"
            type="password"
            name="password"
          />
          <Button type="submit" size="lg">
            로그인
          </Button>
        </form>
        <p className="text-sm text-text-muted text-center mt-4">
          계정이 없으신가요?{' '}
          <button
            onClick={onRegisterClick}
            className="text-accent hover:underline"
          >
            회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
