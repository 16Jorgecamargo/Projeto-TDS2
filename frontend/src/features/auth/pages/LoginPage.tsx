import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema, type LoginForm } from '../schemas';
import { useLogin } from '../queries';
import { AuthField } from '../components/AuthField';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function LoginPage(): JSX.Element {
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
    <div className="mx-auto max-w-sm p-6">
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-ink">Entrar</h1>
          <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
          <AuthField label="Senha" type="password" {...register('password')} error={errors.password?.message} />
          {login.isError ? <p className="text-sm text-accent">Credenciais invalidas</p> : null}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </Button>
          <div className="flex justify-between text-sm">
            <Link to="/register" className="text-primary underline">Criar conta</Link>
            <Link to="/forgot-password" className="text-primary underline">Esqueci a senha</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
