import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema, type LoginForm } from '../schemas';
import { useLogin } from '../queries';
import { AuthField } from '../components/AuthField';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    await login.mutateAsync(values);
    navigate('/');
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
      <AuthField label="Senha" type="password" {...register('password')} error={errors.password?.message} />
      {login.isError ? <p className="text-sm text-red-600">Credenciais invalidas</p> : null}
      <button type="submit" disabled={login.isPending} className="rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </button>
      <div className="flex justify-between text-sm">
        <Link to="/register" className="text-slate-600 underline">Criar conta</Link>
        <Link to="/forgot-password" className="text-slate-600 underline">Esqueci a senha</Link>
      </div>
    </form>
  );
}
