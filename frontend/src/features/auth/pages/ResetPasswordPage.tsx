import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordForm } from '../schemas';
import { useResetPassword } from '../queries';
import { AuthField } from '../components/AuthField';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function ResetPasswordPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reset = useResetPassword();
  const token = params.get('token');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await reset.mutateAsync({ token: values.token, password: values.password });
    navigate('/login');
  });

  if (!token) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <Card className="text-center">
          <h1 className="text-xl font-semibold text-ink">Nova senha</h1>
          <p className="mt-4 text-sm text-accent">Link de redefinicao invalido ou incompleto.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-ink">Nova senha</h1>
          <input type="hidden" {...register('token')} />
          <AuthField label="Nova senha" type="password" {...register('password')} error={errors.password?.message} />
          <AuthField
            label="Confirmar senha"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          {reset.isError ? <p className="text-sm text-accent">Token invalido ou expirado</p> : null}
          <Button type="submit" disabled={reset.isPending}>
            Redefinir
          </Button>
        </form>
      </Card>
    </div>
  );
}
