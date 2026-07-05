# Fase 7 — Redesign da VerifyEmailPage

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende da Fase 1 já mesclada.

**Goal desta fase:** Reescrever `VerifyEmailPage` usando `AuthLayout`, unificar os 4 estados (`idle`/`pending`/`done`/`error`) em `EmptyState` trocados via `AnimatePresence`, e corrigir a inconsistência de largura: o botão "Ir para o login" passa a ser `w-full` como o "Ignorar por enquanto".

**Files:**
- Modify: `frontend/src/features/auth/pages/VerifyEmailPage.tsx`
- Modify: `frontend/src/features/auth/pages/VerifyEmailPage.test.tsx`

**Interfaces:**
- Consumes: `AuthLayout` (Fase 1), `EmptyState` (variant `empty`/`error`, já existe), `Button asChild` (já existe), `fadeVariants` de `frontend/src/lib/motion.ts` (já existe).

---

### Task 1: Redesign da `VerifyEmailPage`

**Conteúdo atual de `frontend/src/features/auth/pages/VerifyEmailPage.tsx`:**

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

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/VerifyEmailPage.test.tsx` por:

```tsx
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmailPage from './VerifyEmailPage';
import { authApi } from '../api';

vi.mock('../api', () => ({ authApi: { verifyEmail: vi.fn(), skipEmailVerification: vi.fn() } }));

function renderPage(initialEntry: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[initialEntry]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe mensagem informativa quando nao ha token', () => {
    renderPage('/verify-email');
    expect(
      screen.getByText('Abra o link enviado ao seu e-mail para confirmar sua conta.'),
    ).toBeInTheDocument();
  });

  it('permanece confirmado mesmo com dupla chamada do efeito em StrictMode', async () => {
    vi.mocked(authApi.verifyEmail)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('token ja usado'));
    renderPage('/verify-email?token=abc123');
    await waitFor(() => expect(screen.getByText('E-mail confirmado!')).toBeInTheDocument());
    expect(screen.queryByText('Token inválido ou expirado.')).not.toBeInTheDocument();
  });

  it('exibe erro quando a verificacao realmente falha', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue(new Error('invalido'));
    renderPage('/verify-email?token=bad-token');
    await waitFor(() => expect(screen.getByText('Token inválido ou expirado.')).toBeInTheDocument());
  });

  it('mostra botao para ignorar verificacao quando nao ha token, e chama o skip ao clicar', async () => {
    vi.mocked(authApi.skipEmailVerification).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage('/verify-email');

    const skipButton = screen.getByRole('button', { name: 'Ignorar por enquanto' });
    await user.click(skipButton);

    expect(authApi.skipEmailVerification).toHaveBeenCalled();
  });

  it('nao mostra botao de ignorar quando ha token na URL', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue(undefined);
    renderPage('/verify-email?token=abc123');
    await waitFor(() => expect(screen.getByText('E-mail confirmado!')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Ignorar por enquanto' })).not.toBeInTheDocument();
  });

  it('o link para ir ao login e sempre renderizado como botao full-width', () => {
    renderPage('/verify-email');
    const loginLink = screen.getByRole('link', { name: /ir para o login/i });
    expect(loginLink.className).toContain('w-full');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- VerifyEmailPage.test.tsx`
Expected: FAIL — textos mudaram (acentos/descrição) e o link "Ir para o login" ainda não é `w-full` na implementação atual.

- [ ] **Step 3: Implementar o redesign**

Substituir todo o conteúdo de `frontend/src/features/auth/pages/VerifyEmailPage.tsx` por:

```tsx
import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import { authApi } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { EmptyState, type EmptyStateVariant } from '../../../components/ui/EmptyState';
import { fadeVariants } from '../../../lib/motion';

type Status = 'idle' | 'pending' | 'done' | 'error';

interface StatusContent {
  icon: ReactNode;
  title: string;
  description?: string;
  variant: EmptyStateVariant;
}

const STATUS_CONTENT: Record<Status, StatusContent> = {
  idle: {
    icon: <Mail size={32} />,
    title: 'Verifique seu e-mail',
    description: 'Abra o link enviado ao seu e-mail para confirmar sua conta.',
    variant: 'empty',
  },
  pending: {
    icon: <Loader2 size={32} className="animate-spin" />,
    title: 'Confirmando...',
    variant: 'empty',
  },
  done: {
    icon: <CheckCircle2 size={32} />,
    title: 'E-mail confirmado!',
    variant: 'empty',
  },
  error: {
    icon: <XCircle size={32} />,
    title: 'Token inválido ou expirado.',
    variant: 'error',
  },
};

export default function VerifyEmailPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('idle');
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

  const content = STATUS_CONTENT[status];

  return (
    <AuthLayout title="Verifique seu e-mail">
      <AnimatePresence mode="wait">
        <motion.div key={status} initial="hidden" animate="visible" exit="hidden" variants={fadeVariants}>
          <EmptyState variant={content.variant} icon={content.icon} title={content.title} description={content.description} />
        </motion.div>
      </AnimatePresence>
      <Button asChild variant="ghost" className="mt-4 w-full">
        <Link to="/login">Ir para o login</Link>
      </Button>
      {!token ? (
        <Button type="button" variant="ghost" onClick={handleSkip} disabled={skipping} className="mt-4 w-full">
          {skipping ? 'Ignorando...' : 'Ignorar por enquanto'}
        </Button>
      ) : null}
    </AuthLayout>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- VerifyEmailPage.test.tsx`
Expected: PASS (6 testes).

- [ ] **Step 5: Rodar a suíte completa do frontend e o typecheck (última fase do plano)**

Run: `npm test` (em `frontend/`)
Expected: todos os testes passam, incluindo os das 7 fases anteriores.

Run: `npm run typecheck`
Expected: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/pages/VerifyEmailPage.tsx frontend/src/features/auth/pages/VerifyEmailPage.test.tsx
git commit -m "feat: reconstroi VerifyEmailPage com EmptyState unificado por estado"
```
