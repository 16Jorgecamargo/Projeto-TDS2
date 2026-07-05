# Fase 3 — Topbar: logo clicável, CTAs, âncora e fundo dinâmico

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar. Depende das Fases 1 e 2 já mescladas.

**Goal desta fase:** Reescrever `Topbar` para: logo clicável (`Link to="/"`), estado anônimo (link "Como funciona" só em `/`, `Link "Entrar"`, `Button "Anunciar meus serviços"`), estado logado (mantém `NotificationBell`+`ProfileMenu`), e fundo transparente-até-rolar só na Landing pra visitante anônimo.

**Files:**
- Modify: `frontend/src/components/layout/Topbar.tsx`
- Modify: `frontend/src/components/layout/Topbar.test.tsx`

**Interfaces:**
- Consumes: `useAuthStore` (`frontend/src/stores/auth.ts`, já existe), `useLocation` (`react-router-dom`), `NotificationBell` (Fase 1, já com guard de auth), `ProfileMenu` (`frontend/src/components/layout/ProfileMenu.tsx`, já existe, já com guard de auth), `Button` (`frontend/src/components/ui/Button.tsx`, já existe, `asChild`), âncora `#como-funciona` (Fase 2).

---

### Task 1: Reescrever `Topbar`

**Conteúdo atual de `frontend/src/components/layout/Topbar.tsx`:**

```tsx
import type { JSX } from 'react';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { ProfileMenu } from './ProfileMenu';

export function Topbar(): JSX.Element {
  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center gap-4 border-b border-surface bg-bg px-4">
      <span className="flex-1 text-lg font-bold text-ink">Services Marketplace</span>
      <NotificationBell />
      <ProfileMenu />
    </header>
  );
}
```

**Conteúdo atual de `frontend/src/components/layout/Topbar.test.tsx`:**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Topbar } from './Topbar';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('Topbar', () => {
  it('renderiza o título', () => {
    renderWithProviders(<Topbar />);
    expect(screen.getByText('Services Marketplace')).toBeInTheDocument();
  });
});
```

**Nota sobre testabilidade do fundo dinâmico**: a transição de fundo transparente→sólido ao rolar depende de eventos reais de scroll/layout, que o `jsdom` (ambiente de teste) simula de forma limitada e instável para bibliotecas de motion. Os testes automatizados desta task cobrem a lógica estrutural condicional (o que renderiza, quais classes cada estado tem *antes* de rolar); a transição em si já foi verificada manualmente via Playwright no navegador real durante o redesign da Landing (mesmo padrão de verificação usado nas fases anteriores deste projeto) e deve ser reverificada manualmente após esta implementação — ver Step 6.

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/components/layout/Topbar.test.tsx` por:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Topbar } from './Topbar';
import { useAuthStore } from '../../stores/auth';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('Topbar', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('renderiza o título e o logo como link para /', () => {
    renderWithProviders(<Topbar />);
    const logo = screen.getByRole('link', { name: 'Services Marketplace' });
    expect(logo).toHaveAttribute('href', '/');
  });

  it('visitante anonimo na Landing ve Como funciona, Entrar e Anunciar meus servicos', () => {
    renderWithProviders(<Topbar />, { route: '/' });
    expect(screen.getByRole('link', { name: 'Como funciona' })).toHaveAttribute('href', '#como-funciona');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Anunciar meus serviços' })).toHaveAttribute('href', '/register');
  });

  it('visitante anonimo fora da Landing nao ve o link Como funciona', () => {
    renderWithProviders(<Topbar />, { route: '/search' });
    expect(screen.queryByRole('link', { name: 'Como funciona' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anunciar meus serviços' })).toBeInTheDocument();
  });

  it('visitante anonimo na Landing comeca com fundo transparente', () => {
    renderWithProviders(<Topbar />, { route: '/' });
    const header = screen.getByRole('banner');
    expect(header.className).toContain('bg-transparent');
    expect(header.className).not.toContain('border-b');
  });

  it('fundo e sempre solido fora da Landing mesmo anonimo', () => {
    renderWithProviders(<Topbar />, { route: '/search' });
    const header = screen.getByRole('banner');
    expect(header.className).toContain('bg-bg');
    expect(header.className).toContain('border-b');
  });

  it('usuario autenticado nao ve Entrar/Anunciar e ve o sino de notificacoes', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderWithProviders(<Topbar />, { route: '/' });
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Anunciar meus serviços' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notificações' })).toBeInTheDocument();
  });

  it('fundo e sempre solido para usuario autenticado mesmo na Landing', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderWithProviders(<Topbar />, { route: '/' });
    const header = screen.getByRole('banner');
    expect(header.className).toContain('bg-bg');
    expect(header.className).toContain('border-b');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- Topbar.test.tsx`
Expected: FAIL — implementação atual não tem logo-como-link, não tem estado anônimo, sempre renderiza `NotificationBell`/`ProfileMenu`, sempre com `bg-bg border-b`.

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `frontend/src/components/layout/Topbar.tsx` por:

```tsx
import { useState, type JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { ProfileMenu } from './ProfileMenu';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/auth';
import { cn } from '../../lib/utils';

const SCROLL_THRESHOLD = 8;

export function Topbar(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > SCROLL_THRESHOLD);
  });

  const isTransparent = !user && isLanding && !scrolled;

  return (
    <header
      className={cn(
        'sticky top-0 z-sticky flex h-16 items-center gap-4 px-4 transition-colors',
        isTransparent ? 'bg-transparent' : 'border-b border-border bg-bg',
      )}
    >
      <Link to="/" className="flex-1 text-lg font-bold text-ink">
        Services Marketplace
      </Link>
      {!user && isLanding ? (
        <a href="#como-funciona" className="text-sm font-semibold text-ink hover:text-primary">
          Como funciona
        </a>
      ) : null}
      {user ? (
        <>
          <NotificationBell />
          <ProfileMenu />
        </>
      ) : (
        <>
          <Link to="/login" className="text-sm font-semibold text-ink hover:text-primary">
            Entrar
          </Link>
          <Button asChild variant="accent" size="sm">
            <Link to="/register">Anunciar meus serviços</Link>
          </Button>
        </>
      )}
    </header>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- Topbar.test.tsx`
Expected: PASS (7 testes).

- [ ] **Step 5: Rodar a suíte completa e o typecheck**

Run: `npm test` (em `frontend/`)
Expected: todos os testes passam, incluindo os das 2 fases anteriores deste plano e o restante do app (nenhuma regressão fora dos arquivos tocados).

Run: `npm run typecheck`
Expected: sem erros de tipo.

- [ ] **Step 6: Verificação manual no navegador (scroll real)**

Como o comportamento de scroll não é coberto por teste automatizado (ver nota acima), confirmar manualmente com o dev server rodando (`npm run dev` em `frontend/`, backend também precisa estar no ar):
1. Abrir `/` deslogado — Topbar deve estar transparente no topo.
2. Rolar a página — Topbar deve ganhar fundo sólido (`bg-bg`) e borda inferior após ~8px de scroll.
3. Rolar de volta ao topo — Topbar deve voltar a ficar transparente.
4. Clicar em "Como funciona" — deve rolar suavemente até a seção `#como-funciona`.
5. Abrir `/search` deslogado — Topbar deve estar sempre sólido, sem o link "Como funciona".
6. Logar e revisitar `/` — Topbar deve mostrar sino+avatar, sempre sólido.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/layout/Topbar.tsx frontend/src/components/layout/Topbar.test.tsx
git commit -m "feat: Topbar ganha logo clicavel, CTAs de visitante e fundo dinamico na landing"
```
