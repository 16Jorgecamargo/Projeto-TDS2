import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { registerSchema, type RegisterForm } from '../schemas';
import { useRegister } from '../queries';
import { AuthField } from '../components/AuthField';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'client' } });

  const onSubmit = handleSubmit(async (values) => {
    await registerMutation.mutateAsync({
      name: values.name,
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: values.role,
    });
    navigate('/verify-email');
  });

  return (
    <div className="mx-auto max-w-sm p-6">
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-ink">Criar conta</h1>
          <AuthField label="Nome" {...register('name')} error={errors.name?.message} />
          <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
          <AuthField label="Telefone" {...register('phone')} error={errors.phone?.message} />
          <AuthField label="Senha" type="password" {...register('password')} error={errors.password?.message} />
          <AuthField
            label="Confirmar senha"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Perfil</span>
            <select className="rounded-sm border border-surface px-3 py-2 text-ink" {...register('role')}>
              <option value="client">Cliente</option>
              <option value="professional">Profissional</option>
            </select>
          </label>
          {registerMutation.isError ? <p className="text-sm text-accent">Nao foi possivel criar a conta</p> : null}
          <Button type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Enviando...' : 'Cadastrar'}
          </Button>
          <Link to="/login" className="text-sm text-primary underline">Ja tenho conta</Link>
        </form>
      </Card>
    </div>
  );
}
