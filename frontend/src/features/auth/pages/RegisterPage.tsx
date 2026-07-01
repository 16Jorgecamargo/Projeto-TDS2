import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { registerSchema, type RegisterForm } from '../schemas';
import { useRegister } from '../queries';
import { AuthField } from '../components/AuthField';

export default function RegisterPage() {
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
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      <AuthField label="Nome" {...register('name')} error={errors.name?.message} />
      <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
      <AuthField label="Telefone" {...register('phone')} error={errors.phone?.message} />
      <AuthField label="Senha" type="password" {...register('password')} error={errors.password?.message} />
      <AuthField label="Confirmar senha" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Perfil</span>
        <select className="rounded-lg border border-slate-300 px-3 py-2" {...register('role')}>
          <option value="client">Cliente</option>
          <option value="professional">Profissional</option>
        </select>
      </label>
      {registerMutation.isError ? <p className="text-sm text-red-600">Nao foi possivel criar a conta</p> : null}
      <button type="submit" disabled={registerMutation.isPending} className="rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        {registerMutation.isPending ? 'Enviando...' : 'Cadastrar'}
      </button>
      <Link to="/login" className="text-sm text-slate-600 underline">Ja tenho conta</Link>
    </form>
  );
}
