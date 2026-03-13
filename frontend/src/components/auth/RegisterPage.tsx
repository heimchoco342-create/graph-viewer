import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

export interface RegisterPageProps {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  onLoginClick?: () => void
}

export function RegisterPage({ onSubmit, onLoginClick }: RegisterPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md rounded-xl bg-bg-secondary border border-border p-8">
        <h1 className="text-2xl font-bold text-text-primary text-center mb-6">
          회원가입
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="이름"
            placeholder="홍길동"
            type="text"
            name="name"
          />
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
            가입
          </Button>
        </form>
        <p className="text-sm text-text-muted text-center mt-4">
          이미 계정이 있으신가요?{' '}
          <button
            onClick={onLoginClick}
            className="text-accent hover:underline"
          >
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
