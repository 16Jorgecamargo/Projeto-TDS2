## Fase D — Páginas de Erro (Tasks 11-12)

Estas 2 tasks são independentes entre si e independentes das Fases A/B/C.

### Task 11: Criar página real para `/forbidden` (403)

**Files:**
- Create: `frontend/src/pages/Forbidden.tsx`
- Create: `frontend/src/pages/Forbidden.test.tsx`
- Modify: `frontend/src/router/index.tsx:38`

**Interfaces:**
- Consumes: `EmptyState` de `frontend/src/components/ui/EmptyState.tsx` (`{ title: string; description?: string; action?: ReactNode; className?: string }`, já existente).
- Produces: `Forbidden` componente sem props, montado na rota `/forbidden` (substitui o `<div />` vazio atual).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/pages/Forbidden.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Forbidden } from './Forbidden';

describe('Forbidden', () => {
  it('mostra mensagem de acesso restrito e link para voltar', () => {
    render(
      <MemoryRouter>
        <Forbidden />
      </MemoryRouter>,
    );

    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/pages/Forbidden.test.tsx`
Esperado: FAIL — `frontend/src/pages/Forbidden.tsx` ainda não existe.

- [ ] **Step 3: Criar `Forbidden.tsx`**

Crie `frontend/src/pages/Forbidden.tsx`:
```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';

export function Forbidden(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        title="Acesso restrito"
        description="Você não tem permissão para acessar esta página."
        action={
          <Link to="/" className="text-sm text-primary underline">
            Voltar para o início
          </Link>
        }
      />
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/pages/Forbidden.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Ligar a rota `/forbidden` à nova página**

Em `frontend/src/router/index.tsx`, adicione o import (perto dos outros imports de páginas, por exemplo depois da linha do `NotFound`):
```tsx
import { Forbidden } from '../pages/Forbidden';
```

E troque a linha `{ path: '/forbidden', element: <div /> },` por:
```tsx
      { path: '/forbidden', element: <Forbidden /> },
```

- [ ] **Step 6: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Forbidden.tsx frontend/src/pages/Forbidden.test.tsx frontend/src/router/index.tsx
git commit -m "feat(pages): adiciona pagina real de acesso restrito (403) com EmptyState"
```

---

### Task 12: Restilizar `NotFound` (404)

**Files:**
- Modify: `frontend/src/pages/NotFound.tsx`
- Test: `frontend/src/pages/NotFound.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `EmptyState` de `frontend/src/components/ui/EmptyState.tsx` (mesmo uso da Task 11, garantindo consistência visual entre as duas páginas de erro).
- Produces: `NotFound` mantém a mesma assinatura (componente sem props) — já usado em `frontend/src/router/index.tsx:64` (`{ path: '*', element: <NotFound /> }`), nenhuma mudança de interface.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/pages/NotFound.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFound } from './NotFound';

describe('NotFound', () => {
  it('mostra mensagem de pagina nao encontrada e link para voltar', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/pages/NotFound.test.tsx`
Esperado: FAIL — a implementação atual não tem link de volta nem usa `EmptyState`.

- [ ] **Step 3: Restilizar `NotFound.tsx`**

Substitua o conteúdo de `frontend/src/pages/NotFound.tsx`:
```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        title="Página não encontrada"
        description="A página que você procura não existe ou foi movida."
        action={
          <Link to="/" className="text-sm text-primary underline">
            Voltar para o início
          </Link>
        }
      />
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/pages/NotFound.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/NotFound.tsx frontend/src/pages/NotFound.test.tsx
git commit -m "style(pages): restiliza NotFound (404) com EmptyState, mesmo padrao do 403"
```

---
