import type { JSX } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { loginSchema, type LoginForm } from '../schemas';
import { useLogin } from '../queries';
import { AuthField } from '../components/AuthField';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const login = useLogin();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      navigate('/');
    } catch {
      toast('Credenciais invalidas', { tone: 'error' });
    }
  });

  return (
    <AuthLayout title="Bem-vindo de volta" description="Entre com sua conta para continuar.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h2 className="text-h4 font-semibold text-ink">Entrar</h2>
        <AuthField
          label="E-mail"
          type="email"
          icon={<Mail size={16} />}
          {...register('email')}
          error={errors.email?.message}
        />
        <div className="flex flex-col gap-1">
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary underline">
              Esqueci a senha
            </Link>
          </div>
          <AuthField
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            icon={<Lock size={16} />}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            {...register('password')}
            error={errors.password?.message}
          />
        </div>
        <Button type="submit" disabled={login.isPending} className="w-full">
          {login.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
        <p className="text-center text-sm text-muted">
          Não tem conta?{' '}
          <Link to="/register" className="text-primary underline">
            Criar conta
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
