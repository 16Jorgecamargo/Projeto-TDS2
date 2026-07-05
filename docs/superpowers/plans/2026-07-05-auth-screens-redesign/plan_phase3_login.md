# Fase 3 — Redesign da LoginPage

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende das Fases 1 e 2 já mescladas.

**Goal desta fase:** Reescrever `LoginPage` usando `AuthLayout`, `AuthField` com ícones e toggle de senha, botão full-width, e trocar o erro de credenciais inválidas de texto inline para `Toast`.

**Files:**
- Modify: `frontend/src/features/auth/pages/LoginPage.tsx`
- Modify: `frontend/src/features/auth/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `AuthLayout` (Fase 1), `AuthField` (Fase 2, com `icon`/`endAdornment`), `useToast` de `frontend/src/components/ui/Toast.tsx` (já existe: `const { toast } = useToast(); toast(message, { tone: 'error' })`), `useLogin` de `../queries` (inalterado).

---

### Task 1: Redesign da `LoginPage`

**Conteúdo atual de `frontend/src/features/auth/pages/LoginPage.tsx`:**

```tsx
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema, type LoginForm } from '../schemas';
import { useLogin } from '../queries';
import { AuthField } from '../components/AuthField';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    await login.mutateAsync(values);
    navigate('/');
  });

  return (
    <div className="mx-auto max-w-sm p-6">
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-ink">Entrar</h1>
          <AuthField label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
          <AuthField label="Senha" type="password" {...register('password')} error={errors.password?.message} />
          {login.isError ? <p className="text-sm text-accent">Credenciais invalidas</p> : null}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </Button>
          <div className="flex justify-between text-sm">
            <Link to="/register" className="text-primary underline">Criar conta</Link>
            <Link to="/forgot-password" className="text-primary underline">Esqueci a senha</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/LoginPage.test.tsx` por:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './LoginPage';
import { authApi } from '../api';
import { useAuthStore } from '../../../stores/auth';
import { useToastStore } from '../../../components/ui/Toast';

vi.mock('../api', () => ({ authApi: { login: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  it('valida e-mail invalido antes de enviar', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nao-email' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText('E-mail invalido')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('envia credenciais validas', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'm@e.com', name: 'M', role: 'client' },
    });
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ email: 'm@e.com', password: 'S3nh@Forte' }, expect.anything()),
    );
  });

  it('mostra toast de erro quando as credenciais sao invalidas', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('unauthorized'));
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some((item) => item.message === 'Credenciais invalidas')).toBe(true),
    );
  });

  it('alterna a visibilidade da senha ao clicar no botao de mostrar/ocultar', () => {
    renderPage();
    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- LoginPage.test.tsx`
Expected: FAIL nos 3 testes novos (toast de erro, toggle de senha) — a implementação atual não usa `Toast` nem tem botão de mostrar/ocultar senha.

- [ ] **Step 3: Implementar o redesign**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/LoginPage.tsx` por:

```tsx
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
        <div className="relative">
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
          <Link to="/forgot-password" className="absolute right-0 top-0 text-sm text-primary underline">
            Esqueci a senha
          </Link>
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- LoginPage.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/pages/LoginPage.tsx frontend/src/features/auth/pages/LoginPage.test.tsx
git commit -m "feat: reconstroi LoginPage com AuthLayout, icones e toast de erro"
```
