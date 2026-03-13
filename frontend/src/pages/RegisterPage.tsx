import { useNavigate } from 'react-router-dom';
import { RegisterPage as RegisterPageUI } from '../components/auth/RegisterPage';
import { useAuthStore } from '../store/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const error = useAuthStore((s) => s.error);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      await register(email, password, name);
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
      <RegisterPageUI onSubmit={handleSubmit} onLoginClick={() => navigate('/login')} />
    </>
  );
}
