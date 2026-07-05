# Fase 6 — Redesign da ResetPasswordPage

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende das Fases 1 e 2 já mescladas.

**Goal desta fase:** Reescrever `ResetPasswordPage` usando `AuthLayout`, trocar a mensagem solta de token ausente/inválido por `EmptyState` com ação "Solicitar novo link" (corrige o dead-end atual), adicionar `PasswordStrengthBar` e usar `Toast` para erro/sucesso do submit.

**Files:**
- Modify: `frontend/src/features/auth/pages/ResetPasswordPage.tsx`
- Modify: `frontend/src/features/auth/pages/ResetPasswordPage.test.tsx`

**Interfaces:**
- Consumes: `AuthLayout` (Fase 1), `AuthField` (Fase 2), `PasswordStrengthBar` (Fase 2), `EmptyState` (com `variant="error"` e `action`, já existe), `Button asChild` (já existe, usa `frontend/src/lib/slot.tsx`), `useToast` (já existe).

---

### Task 1: Redesign da `ResetPasswordPage`

**Conteúdo atual de `frontend/src/features/auth/pages/ResetPasswordPage.tsx`:**

```tsx
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
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/ResetPasswordPage.test.tsx` por:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResetPasswordPage from './ResetPasswordPage';
import { authApi } from '../api';
import { useToastStore } from '../../../components/ui/Toast';

vi.mock('../api', () => ({ authApi: { resetPassword: vi.fn() } }));

function renderPage(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ResetPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  it('mostra EmptyState com acao para solicitar novo link quando nao ha token na url', () => {
    renderPage('/reset-password');
    expect(screen.getByText('Link inválido ou expirado')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /solicitar novo link/i });
    expect(link).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('envia nova senha quando token esta presente', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);
    renderPage('/reset-password?token=abc123');
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith(
        { token: 'abc123', password: 'S3nh@Forte' },
        expect.anything(),
      ),
    );
  });

  it('mostra toast de erro quando o token e invalido ou expirado no submit', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(new Error('token invalido'));
    renderPage('/reset-password?token=abc123');
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'S3nh@Forte' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    await waitFor(() =>
      expect(
        useToastStore.getState().toasts.some((item) => item.message === 'Token invalido ou expirado'),
      ).toBe(true),
    );
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- ResetPasswordPage.test.tsx`
Expected: FAIL — a implementação atual não tem `EmptyState`, nem link "Solicitar novo link", nem toast.

- [ ] **Step 3: Implementar o redesign**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/ResetPasswordPage.tsx` por:

```tsx
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- ResetPasswordPage.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/pages/ResetPasswordPage.tsx frontend/src/features/auth/pages/ResetPasswordPage.test.tsx
git commit -m "feat: reconstroi ResetPasswordPage com EmptyState de erro e acao de novo link"
```
