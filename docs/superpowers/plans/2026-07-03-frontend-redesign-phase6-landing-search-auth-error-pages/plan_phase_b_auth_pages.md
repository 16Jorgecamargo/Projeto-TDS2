## Fase B — Páginas de Autenticação (Tasks 2-6)

Todas as tasks desta fase dependem da Task 1 (`AuthField` restilizado). Cada página passa a envolver o formulário num `Card` centralizado (`mx-auto max-w-sm` no wrapper externo, `Card` dentro dele envolvendo o `<form>`), com botão de submit virando `Button` e links/mensagens trocando cores cruas pelos tokens.

### Task 2: Restilizar `LoginPage`

**Files:**
- Modify: `frontend/src/features/auth/pages/LoginPage.tsx`
- Modify: `frontend/src/features/auth/pages/LoginPage.test.tsx` (garantir que os testes existentes continuam passando — ver Step 1)

**Interfaces:**
- Consumes: `AuthField` (Task 1). `useLogin` de `frontend/src/features/auth/queries.ts` (já existente, inalterado). `Button` de `frontend/src/components/ui/`, `Card` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Rodar os testes existentes para confirmar a baseline**

`frontend/src/features/auth/pages/LoginPage.test.tsx` já existe com 2 testes (`getByLabelText('E-mail')`, `getByLabelText('Senha')`, `getByRole('button', { name: /entrar/i })`). Rode: `cd frontend && npx vitest run src/features/auth/pages/LoginPage.test.tsx`
Esperado: PASS (2/2) — esses testes não devem ser alterados, servem de rede de segurança pra restilização (mudança de estilo, não de comportamento/labels).

- [ ] **Step 2: Restilizar `LoginPage.tsx`**

Substitua o conteúdo de `frontend/src/features/auth/pages/LoginPage.tsx`:
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

- [ ] **Step 3: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/auth/pages/LoginPage.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 4: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/pages/LoginPage.tsx
git commit -m "style(auth): restiliza LoginPage com card e tokens da fase 1"
```

---

### Task 3: Restilizar `RegisterPage`

**Files:**
- Modify: `frontend/src/features/auth/pages/RegisterPage.tsx`
- Test: `frontend/src/features/auth/pages/RegisterPage.test.tsx` (novo arquivo — não existia antes)

**Interfaces:**
- Consumes: `AuthField` (Task 1). `useRegister` de `frontend/src/features/auth/queries.ts` (já existente, inalterado). `Card`, `Button` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/auth/pages/RegisterPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from './RegisterPage';
import { authApi } from '../api';

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
  beforeEach(() => vi.clearAllMocks());

  it('envia dados validos de cadastro', async () => {
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
});
```

- [ ] **Step 2: Rodar teste para confirmar que passa contra a implementação atual**

Rode: `cd frontend && npx vitest run src/features/auth/pages/RegisterPage.test.tsx`
Esperado: PASS (1/1) — este teste cobre comportamento já existente (não muda nesta task), serve de rede de segurança pra restilização. Confirme que passa antes de mexer no arquivo.

- [ ] **Step 3: Restilizar `RegisterPage.tsx`**

Substitua o conteúdo de `frontend/src/features/auth/pages/RegisterPage.tsx`:
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

- [ ] **Step 4: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/auth/pages/RegisterPage.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/pages/RegisterPage.tsx frontend/src/features/auth/pages/RegisterPage.test.tsx
git commit -m "style(auth): restiliza RegisterPage com card e tokens da fase 1"
```

---

### Task 4: Restilizar `ForgotPasswordPage`

**Files:**
- Modify: `frontend/src/features/auth/pages/ForgotPasswordPage.tsx`
- Test: `frontend/src/features/auth/pages/ForgotPasswordPage.test.tsx` (novo arquivo — não existia antes)

**Interfaces:**
- Consumes: `AuthField` (Task 1). `useForgotPassword` de `frontend/src/features/auth/queries.ts` (já existente, inalterado). `Card`, `Button` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/auth/pages/ForgotPasswordPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForgotPasswordPage from './ForgotPasswordPage';
import { authApi } from '../api';

vi.mock('../api', () => ({ authApi: { forgotPassword: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ForgotPasswordPage />
    </QueryClientProvider>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o e-mail e mostra mensagem de confirmacao', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'm@e.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() =>
      expect(screen.getByText('Se o e-mail existir, enviamos as instrucoes.')).toBeInTheDocument(),
    );
    expect(authApi.forgotPassword).toHaveBeenCalledWith('m@e.com');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que passa contra a implementação atual**

Rode: `cd frontend && npx vitest run src/features/auth/pages/ForgotPasswordPage.test.tsx`
Esperado: PASS (1/1) — comportamento já existente, teste serve de rede de segurança. Confirme antes de mexer no arquivo.

- [ ] **Step 3: Restilizar `ForgotPasswordPage.tsx`**

Substitua o conteúdo de `frontend/src/features/auth/pages/ForgotPasswordPage.tsx`:
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

- [ ] **Step 4: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/auth/pages/ForgotPasswordPage.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/pages/ForgotPasswordPage.tsx frontend/src/features/auth/pages/ForgotPasswordPage.test.tsx
git commit -m "style(auth): restiliza ForgotPasswordPage com card e tokens da fase 1"
```

---

### Task 5: Restilizar `ResetPasswordPage`

**Files:**
- Modify: `frontend/src/features/auth/pages/ResetPasswordPage.tsx`
- Modify: `frontend/src/features/auth/pages/ResetPasswordPage.test.tsx` (garantir que os testes existentes continuam passando — ver Step 1)

**Interfaces:**
- Consumes: `AuthField` (Task 1). `useResetPassword` de `frontend/src/features/auth/queries.ts` (já existente, inalterado). `Card`, `Button` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Rodar os testes existentes para confirmar a baseline**

`frontend/src/features/auth/pages/ResetPasswordPage.test.tsx` já existe com 2 testes (mensagem "Link de redefinicao invalido ou incompleto." quando sem token; `getByLabelText('Nova senha')`/`getByLabelText('Confirmar senha')` quando há token). Rode: `cd frontend && npx vitest run src/features/auth/pages/ResetPasswordPage.test.tsx`
Esperado: PASS (2/2) — esses testes não devem ser alterados.

- [ ] **Step 2: Restilizar `ResetPasswordPage.tsx`**

Substitua o conteúdo de `frontend/src/features/auth/pages/ResetPasswordPage.tsx`:
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

- [ ] **Step 3: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/auth/pages/ResetPasswordPage.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 4: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/pages/ResetPasswordPage.tsx
git commit -m "style(auth): restiliza ResetPasswordPage com card e tokens da fase 1"
```

---

### Task 6: Restilizar `VerifyEmailPage`

**Files:**
- Modify: `frontend/src/features/auth/pages/VerifyEmailPage.tsx`
- Modify: `frontend/src/features/auth/pages/VerifyEmailPage.test.tsx` (garantir que os testes existentes continuam passando — ver Step 1)

**Interfaces:**
- Consumes: `authApi` de `frontend/src/features/auth/api.ts` (já existente, inalterado). `Card`, `Button` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Rodar os testes existentes para confirmar a baseline**

`frontend/src/features/auth/pages/VerifyEmailPage.test.tsx` já existe com 5 testes cobrindo os textos exatos: "Abra o link enviado ao seu e-mail.", "E-mail confirmado!", "Token invalido ou expirado.", e o botão "Ignorar por enquanto". Rode: `cd frontend && npx vitest run src/features/auth/pages/VerifyEmailPage.test.tsx`
Esperado: PASS (5/5) — esses testes não devem ser alterados, os textos exatos devem ser preservados.

- [ ] **Step 2: Restilizar `VerifyEmailPage.tsx`**

Substitua o conteúdo de `frontend/src/features/auth/pages/VerifyEmailPage.tsx`:
```tsx
import { useEffect, useRef, useState, type JSX } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function VerifyEmailPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [skipping, setSkipping] = useState(false);
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (requestedTokenRef.current === token) {
      return;
    }
    requestedTokenRef.current = token;
    setStatus('pending');
    authApi
      .verifyEmail(token)
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'));
  }, [token]);

  async function handleSkip() {
    setSkipping(true);
    try {
      await authApi.skipEmailVerification();
      navigate('/');
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <Card className="text-center">
        <h1 className="text-xl font-semibold text-ink">Verificacao de e-mail</h1>
        {!token ? <p className="mt-4 text-sm text-ink">Abra o link enviado ao seu e-mail.</p> : null}
        {status === 'pending' ? <p className="mt-4 text-sm text-ink">Confirmando...</p> : null}
        {status === 'done' ? <p className="mt-4 text-sm text-primary">E-mail confirmado!</p> : null}
        {status === 'error' ? <p className="mt-4 text-sm text-accent">Token invalido ou expirado.</p> : null}
        <Link to="/login" className="mt-4 inline-block text-sm text-primary underline">Ir para o login</Link>
        {!token ? (
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={skipping}
            className="mt-4 w-full"
          >
            {skipping ? 'Ignorando...' : 'Ignorar por enquanto'}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/auth/pages/VerifyEmailPage.test.tsx`
Esperado: PASS (5/5).

- [ ] **Step 4: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/pages/VerifyEmailPage.tsx
git commit -m "style(auth): restiliza VerifyEmailPage com card e tokens da fase 1"
```

---
