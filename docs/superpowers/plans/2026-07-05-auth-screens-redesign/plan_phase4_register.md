# Fase 4 — Redesign da RegisterPage

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende das Fases 1 e 2 já mescladas.

**Goal desta fase:** Reescrever `RegisterPage` usando `AuthLayout`, trocar o `<select>` nativo de papel por dois `Card interactive selected` (padrão radiogroup acessível), adicionar `PasswordStrengthBar` e trocar o erro/sucesso de submit de texto inline para `Toast`.

**Files:**
- Modify: `frontend/src/features/auth/pages/RegisterPage.tsx`
- Modify: `frontend/src/features/auth/pages/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: `AuthLayout` (Fase 1), `AuthField` (Fase 2), `PasswordStrengthBar` (Fase 2, prop `password: string`), `Card` com `interactive`/`selected` (já existe, `role`/`aria-checked` passam via spread e sobrescrevem o `role="button"` interno — ver `frontend/src/components/ui/Card.tsx:73-88`), `useToast` (Fase de design system, já existe).

---

### Task 1: Redesign da `RegisterPage`

**Conteúdo atual de `frontend/src/features/auth/pages/RegisterPage.tsx`:**

```tsx
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
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/RegisterPage.test.tsx` por:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from './RegisterPage';
import { authApi } from '../api';
import { useToastStore } from '../../../components/ui/Toast';

vi.mock('../api', () => ({ authApi: { register: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  it('envia dados validos de cadastro com o papel padrao cliente', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'm@e.com', name: 'Maria', role: 'client' },
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999990000' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Maria', email: 'm@e.com', phone: '11999990000', role: 'client' }),
        expect.anything(),
      ),
    );
  });

  it('troca o papel para profissional ao clicar no card correspondente', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'p@e.com', name: 'Pedro', role: 'professional' },
    });

    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /quero oferecer servi/i }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Pedro' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'p@e.com' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999990000' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'professional' }),
        expect.anything(),
      ),
    );
  });

  it('mostra a barra de forca de senha ao digitar a senha', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Abcdefg1!' } });
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });

  it('mostra toast de erro quando o cadastro falha', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('email em uso'));
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999990000' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() =>
      expect(
        useToastStore.getState().toasts.some((item) => item.message === 'Nao foi possivel criar a conta'),
      ).toBe(true),
    );
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- RegisterPage.test.tsx`
Expected: FAIL nos testes de card de papel, barra de força e toast — a implementação atual usa `<select>` e texto inline.

- [ ] **Step 3: Implementar o redesign**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/RegisterPage.tsx` por:

```tsx
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- RegisterPage.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/pages/RegisterPage.tsx frontend/src/features/auth/pages/RegisterPage.test.tsx
git commit -m "feat: reconstroi RegisterPage com seletor de papel em cards e forca de senha"
```
