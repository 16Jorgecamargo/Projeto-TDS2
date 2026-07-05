import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordForm } from '../schemas';
import { useResetPassword } from '../queries';
import { AuthField } from '../components/AuthField';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordStrengthBar } from '../components/PasswordStrengthBar';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/Toast';

export default function ResetPasswordPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reset = useResetPassword();
  const token = params.get('token');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? '' },
  });

  const password = watch('password') ?? '';

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reset.mutateAsync({ token: values.token, password: values.password });
      toast('Senha redefinida com sucesso', { tone: 'success' });
      navigate('/login');
    } catch {
      toast('Token invalido ou expirado', { tone: 'error' });
    }
  });

  if (!token) {
    return (
      <AuthLayout title="Redefinir senha">
        <EmptyState
          variant="error"
          icon={<KeyRound size={32} />}
          title="Link inválido ou expirado"
          description="Solicite um novo link de redefinição de senha."
          action={
            <Button asChild>
              <Link to="/forgot-password">Solicitar novo link</Link>
            </Button>
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Redefinir senha">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h2 className="text-h4 font-semibold text-ink">Nova senha</h2>
        <input type="hidden" {...register('token')} />
        <div className="flex flex-col gap-2">
          <AuthField
            label="Nova senha"
            type="password"
            icon={<Lock size={16} />}
            {...register('password')}
            error={errors.password?.message}
          />
          <PasswordStrengthBar password={password} />
        </div>
        <AuthField
          label="Confirmar senha"
          type="password"
          icon={<Lock size={16} />}
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
        <Button type="submit" disabled={reset.isPending} className="w-full">
          {reset.isPending ? 'Redefinindo...' : 'Redefinir'}
        </Button>
      </form>
    </AuthLayout>
  );
}
