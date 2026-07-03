import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas';
import { useForgotPassword } from '../queries';
import { AuthField } from '../components/AuthField';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function ForgotPasswordPage(): JSX.Element {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => forgot.mutate(values.email));

  return (
    <div className="mx-auto max-w-sm p-6">
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-ink">Recuperar senha</h1>
          <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
          {forgot.isSuccess ? (
            <p className="text-sm text-primary">Se o e-mail existir, enviamos as instrucoes.</p>
          ) : null}
          <Button type="submit" disabled={forgot.isPending}>
            Enviar
          </Button>
        </form>
      </Card>
    </div>
  );
}
