# Fase 5 — Redesign da ForgotPasswordPage

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende da Fase 1 já mesclada.

**Goal desta fase:** Reescrever `ForgotPasswordPage` usando `AuthLayout`, trocar o texto de sucesso solto por `EmptyState`, e corrigir o gap de navegação: adicionar link "Voltar ao login" sempre visível (tanto no estado de formulário quanto no de sucesso).

**Files:**
- Modify: `frontend/src/features/auth/pages/ForgotPasswordPage.tsx`
- Modify: `frontend/src/features/auth/pages/ForgotPasswordPage.test.tsx`

**Interfaces:**
- Consumes: `AuthLayout` (Fase 1), `AuthField` (Fase 2), `EmptyState` de `frontend/src/components/ui/EmptyState.tsx` (já existe: `{ icon?, title, description?, action?, variant? }`), `fadeVariants` de `frontend/src/lib/motion.ts` (já existe).

---

### Task 1: Redesign da `ForgotPasswordPage`

**Conteúdo atual de `frontend/src/features/auth/pages/ForgotPasswordPage.tsx`:**

```tsx
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
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/ForgotPasswordPage.test.tsx` por:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForgotPasswordPage from './ForgotPasswordPage';
import { authApi } from '../api';

vi.mock('../api', () => ({ authApi: { forgotPassword: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sempre mostra o link de volta ao login no estado de formulario', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /voltar ao login/i })).toBeInTheDocument();
  });

  it('envia o e-mail e mostra o estado de sucesso com link de volta', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => expect(screen.getByText('Verifique seu e-mail')).toBeInTheDocument());
    expect(authApi.forgotPassword).toHaveBeenCalledWith('m@e.com', expect.anything());
    expect(screen.getByRole('link', { name: /voltar ao login/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- ForgotPasswordPage.test.tsx`
Expected: FAIL — não há link "Voltar ao login" na implementação atual, nem `MemoryRouter` era necessário antes (o `Link` novo exige contexto de router).

- [ ] **Step 3: Implementar o redesign**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/ForgotPasswordPage.tsx` por:

```tsx
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, MailCheck } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas';
import { useForgotPassword } from '../queries';
import { AuthField } from '../components/AuthField';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { fadeVariants } from '../../../lib/motion';

export default function ForgotPasswordPage(): JSX.Element {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => forgot.mutate(values.email));

  return (
    <AuthLayout title="Esqueceu sua senha?" description="Enviamos um link de redefinição para seu e-mail.">
      <AnimatePresence mode="wait">
        {forgot.isSuccess ? (
          <motion.div key="success" initial="hidden" animate="visible" exit="hidden" variants={fadeVariants}>
            <EmptyState
              icon={<MailCheck size={32} />}
              title="Verifique seu e-mail"
              description="Se o e-mail existir em nossa base, enviamos as instruções de redefinição."
            />
            <Link to="/login" className="mt-6 block text-center text-sm text-primary underline">
              Voltar ao login
            </Link>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={fadeVariants}
            onSubmit={onSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <h2 className="text-h4 font-semibold text-ink">Recuperar senha</h2>
            <AuthField
              label="E-mail"
              type="email"
              icon={<Mail size={16} />}
              {...register('email')}
              error={errors.email?.message}
            />
            <Button type="submit" disabled={forgot.isPending} className="w-full">
              {forgot.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
            <Link to="/login" className="text-center text-sm text-primary underline">
              Voltar ao login
            </Link>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- ForgotPasswordPage.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/pages/ForgotPasswordPage.tsx frontend/src/features/auth/pages/ForgotPasswordPage.test.tsx
git commit -m "feat: reconstroi ForgotPasswordPage com EmptyState e link de volta ao login"
```
