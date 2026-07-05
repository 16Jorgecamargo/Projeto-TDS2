# Fase 1 — RequireGuest + AuthLayout + Router

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar.

**Goal desta fase:** Criar o guard `RequireGuest` (redireciona usuário já autenticado pra `/`) e o layout `AuthLayout` (split-screen), e religar as 5 rotas de auth no router pra saírem do `AppShell` e passarem a usar esses dois.

**Files:**
- Create: `frontend/src/router/RequireGuest.tsx`
- Test: `frontend/src/router/RequireGuest.test.tsx`
- Create: `frontend/src/features/auth/components/AuthLayout.tsx`
- Test: `frontend/src/features/auth/components/AuthLayout.test.tsx`
- Modify: `frontend/src/router/index.tsx`

**Interfaces:**
- Produces: `RequireGuest` — componente de rota sem props (usado como `element` de um nó pai no router, mesmo padrão de `ProtectedRoute`). Lê `useAuthStore((s) => s.user)` e `useAuthStore((s) => s.isBootstrapping)`.
- Produces: `AuthLayout` — `{ title: string; description?: string; children: ReactNode }`, exportado de `frontend/src/features/auth/components/AuthLayout.tsx`. Fases 3–7 importam esse componente e o envolvem em volta do conteúdo de cada página.
- Consumes: `useAuthStore` de `frontend/src/stores/auth.ts` (já existe, não é alterado). `fadeVariants`, `spring` de `frontend/src/lib/motion.ts` (já existem).

---

### Task 1: `RequireGuest`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/router/RequireGuest.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireGuest } from './RequireGuest';
import { useAuthStore } from '../stores/auth';

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<div>login form</div>} />
        </Route>
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireGuest', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useAuthStore.getState().finishBootstrapping();
  });

  it('renderiza a rota filha para usuario anonimo', () => {
    renderAt('/login');
    expect(screen.getByText('login form')).toBeInTheDocument();
  });

  it('redireciona para / quando ja autenticado', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderAt('/login');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('nao renderiza nada durante o bootstrap', () => {
    useAuthStore.setState({ isBootstrapping: true });
    const { container } = renderAt('/login');
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (dentro de `frontend/`): `npm test -- RequireGuest.test.tsx`
Expected: FAIL com `Cannot find module './RequireGuest'` (ou equivalente).

- [ ] **Step 3: Implementar `RequireGuest`**

Criar `frontend/src/router/RequireGuest.tsx`:

```tsx
import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useAuthStore } from '../stores/auth';

export function RequireGuest(): JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return null;
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return (
    <MotionConfig reducedMotion="user">
      <Outlet />
    </MotionConfig>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- RequireGuest.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router/RequireGuest.tsx frontend/src/router/RequireGuest.test.tsx
git commit -m "feat: adiciona guard RequireGuest para rotas publicas de auth"
```

---

### Task 2: `AuthLayout`

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/auth/components/AuthLayout.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  it('renderiza titulo, descricao e conteudo filho', () => {
    render(
      <AuthLayout title="Bem-vindo de volta" description="Entre com sua conta para continuar.">
        <p>form aqui</p>
      </AuthLayout>,
    );
    expect(screen.getAllByText('Bem-vindo de volta').length).toBeGreaterThan(0);
    expect(screen.getByText('Entre com sua conta para continuar.')).toBeInTheDocument();
    expect(screen.getByText('form aqui')).toBeInTheDocument();
  });

  it('renderiza sem descricao quando ela nao e passada', () => {
    render(
      <AuthLayout title="Redefinir senha">
        <p>form aqui</p>
      </AuthLayout>,
    );
    expect(screen.getAllByText('Redefinir senha').length).toBeGreaterThan(0);
    expect(screen.getByText('form aqui')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- AuthLayout.test.tsx`
Expected: FAIL com `Cannot find module './AuthLayout'`.

- [ ] **Step 3: Implementar `AuthLayout`**

Criar `frontend/src/features/auth/components/AuthLayout.tsx`:

```tsx
import type { JSX, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeVariants, spring } from '../../../lib/motion';

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="hidden flex-col justify-center gap-2 bg-primary px-8 py-6 text-bg md:flex lg:w-1/2 lg:gap-4 lg:px-16 lg:py-10">
        <span className="text-h4 font-semibold lg:text-h3">Projeto TDS</span>
        <h1 className="text-h4 font-semibold lg:text-h2">{title}</h1>
        {description ? <p className="hidden text-body-md text-bg/80 lg:block">{description}</p> : null}
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeVariants}
          transition={spring.gentle}
          className="w-full max-w-sm"
        >
          <span className="mb-6 flex justify-center text-h4 font-semibold text-primary md:hidden">
            Projeto TDS
          </span>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- AuthLayout.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/components/AuthLayout.tsx frontend/src/features/auth/components/AuthLayout.test.tsx
git commit -m "feat: adiciona AuthLayout split-screen para telas de autenticacao"
```

---

### Task 3: Religar as 5 rotas de auth no router

**Files:**
- Modify: `frontend/src/router/index.tsx:1-68` (arquivo inteiro, ver conteúdo atual abaixo)

Conteúdo atual relevante de `frontend/src/router/index.tsx` (linhas 1-11 e 28-40):

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { App } from '../App';
import { NotFound } from '../pages/NotFound';
import { Forbidden } from '../pages/Forbidden';
import { ProtectedRoute } from './ProtectedRoute';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
// ...demais imports inalterados

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <HomeRoute /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/forbidden', element: <Forbidden /> },
      { path: '/professionals/:id', element: <PublicProfilePage /> },
      // ...blocos de ProtectedRoute inalterados
      { path: '*', element: <NotFound /> },
    ],
  },
]);
```

- [ ] **Step 1: Escrever/ajustar o teste de rotas (verificação manual, não há arquivo de teste de `router/index.tsx` hoje)**

Não existe `router/index.test.tsx` no projeto — a cobertura das 5 rotas de auth já vem dos testes de página (`LoginPage.test.tsx` etc., que renderizam a página isolada dentro de `MemoryRouter`, sem passar pelo `router/index.tsx`). Esta task não adiciona teste novo; a verificação é o passo 3 abaixo (build/typecheck) mais os testes de página das fases 3-7, que passam a assumir `RequireGuest`/`AuthLayout` já existentes.

- [ ] **Step 2: Editar `frontend/src/router/index.tsx`**

Adicionar o import do guard logo abaixo do import de `ProtectedRoute`:

```tsx
import { ProtectedRoute } from './ProtectedRoute';
import { RequireGuest } from './RequireGuest';
```

Remover as 5 linhas de rota de auth de dentro de `children: [...]` do nó `{ element: <App /> }`:

```tsx
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
```

E adicionar um novo nó irmão de `{ element: <App />, children: [...] }`, dentro do array raiz passado a `createBrowserRouter`, contendo essas mesmas 5 rotas sob `RequireGuest`:

```tsx
  {
    element: <RequireGuest />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
```

O array final passado a `createBrowserRouter` fica com dois elementos de topo: `{ element: <App/>, children: [...] }` (sem as 5 rotas de auth) e `{ element: <RequireGuest/>, children: [...as 5 rotas...] }`. Os imports de `LoginPage`, `RegisterPage`, `VerifyEmailPage`, `ForgotPasswordPage`, `ResetPasswordPage` no topo do arquivo continuam os mesmos (só mudou onde são referenciados dentro do array).

- [ ] **Step 3: Rodar a suíte completa de testes do frontend e o typecheck**

Run: `npm test` (dentro de `frontend/`)
Expected: todos os testes existentes continuam passando (nenhum teste de página depende de `router/index.tsx`, então nenhuma regressão esperada aqui).

Run: `npm run typecheck` (ou `npx tsc --noEmit`, conforme script disponível em `frontend/package.json`)
Expected: sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router/index.tsx
git commit -m "refactor: move rotas de auth para fora do AppShell via RequireGuest"
```
