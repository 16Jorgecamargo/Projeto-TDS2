import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, Lock, Mail, Phone, User } from 'lucide-react';
import { registerSchema, type RegisterForm } from '../schemas';
import { useRegister } from '../queries';
import { AuthField } from '../components/AuthField';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordStrengthBar } from '../components/PasswordStrengthBar';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';

const ROLE_OPTIONS = [
  {
    value: 'client' as const,
    title: 'Quero contratar',
    description: 'Publique demandas e contrate profissionais.',
    icon: User,
  },
  {
    value: 'professional' as const,
    title: 'Quero oferecer serviços',
    description: 'Encontre clientes e feche contratos.',
    icon: Briefcase,
  },
];

export default function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'client' } });

  const role = watch('role');
  const password = watch('password') ?? '';

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerMutation.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: values.role,
      });
      toast('Conta criada com sucesso', { tone: 'success' });
      navigate('/verify-email');
    } catch {
      toast('Nao foi possivel criar a conta', { tone: 'error' });
    }
  });

  return (
    <AuthLayout title="Crie sua conta" description="Leva menos de um minuto.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h2 className="text-h4 font-semibold text-ink">Criar conta</h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Perfil">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.value}
                interactive
                selected={role === option.value}
                role="radio"
                aria-checked={role === option.value}
                onClick={() => setValue('role', option.value, { shouldValidate: true })}
                className="flex flex-col items-center gap-2 p-4 text-center"
              >
                <Icon size={20} aria-hidden="true" />
                <span className="text-sm font-semibold text-ink">{option.title}</span>
                <span className="text-xs text-muted">{option.description}</span>
              </Card>
            );
          })}
        </div>
        <AuthField label="Nome" icon={<User size={16} />} {...register('name')} error={errors.name?.message} />
        <AuthField
          label="E-mail"
          type="email"
          icon={<Mail size={16} />}
          {...register('email')}
          error={errors.email?.message}
        />
        <AuthField label="Telefone" icon={<Phone size={16} />} {...register('phone')} error={errors.phone?.message} />
        <div className="flex flex-col gap-2">
          <AuthField
            label="Senha"
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
        <Button type="submit" disabled={registerMutation.isPending} className="w-full">
          {registerMutation.isPending ? 'Enviando...' : 'Cadastrar'}
        </Button>
        <p className="text-center text-sm text-muted">
          Já tenho conta?{' '}
          <Link to="/login" className="text-primary underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
