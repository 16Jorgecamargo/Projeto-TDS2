import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas';
import { useForgotPassword } from '../queries';
import { AuthField } from '../components/AuthField';

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => forgot.mutate(values.email));

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Recuperar senha</h1>
      <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
      {forgot.isSuccess ? <p className="text-sm text-green-600">Se o e-mail existir, enviamos as instrucoes.</p> : null}
      <button type="submit" disabled={forgot.isPending} className="rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        Enviar
      </button>
    </form>
  );
}
