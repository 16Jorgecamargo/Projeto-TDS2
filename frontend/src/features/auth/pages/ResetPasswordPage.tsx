import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordForm } from '../schemas';
import { useResetPassword } from '../queries';
import { AuthField } from '../components/AuthField';

export default function ResetPasswordPage() {
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
      <div className="mx-auto max-w-sm p-6 text-center">
        <h1 className="text-xl font-semibold">Nova senha</h1>
        <p className="mt-4 text-sm text-red-600">Link de redefinicao invalido ou incompleto.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Nova senha</h1>
      <input type="hidden" {...register('token')} />
      <AuthField label="Nova senha" type="password" {...register('password')} error={errors.password?.message} />
      <AuthField label="Confirmar senha" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
      {reset.isError ? <p className="text-sm text-red-600">Token invalido ou expirado</p> : null}
      <button type="submit" disabled={reset.isPending} className="rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        Redefinir
      </button>
    </form>
  );
}
