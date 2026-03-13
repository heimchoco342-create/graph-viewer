import { useNavigate } from 'react-router-dom';
import { LoginPage as LoginPageUI } from '../components/auth/LoginPage';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // error is set in store
    }
  };

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-danger text-white px-4 py-2 rounded-lg z-50" role="alert">
          {error}
        </div>
      )}
      <LoginPageUI onSubmit={handleSubmit} onRegisterClick={() => navigate('/register')} />
    </>
  );
}
