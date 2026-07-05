# Fase 1 — NotificationBell: guard de autenticação

> Parte de [plan_index.md](plan_index.md). Ver Global Constraints lá antes de começar.

**Goal desta fase:** `useNotifications` ganha opção `enabled`; `NotificationBell` retorna `null` (sem disparar request) quando não há usuário autenticado — mesmo padrão já usado por `ProfileMenu`/`Sidebar`/`MobileNav`.

**Files:**
- Modify: `frontend/src/features/notifications/queries.ts`
- Modify: `frontend/src/features/notifications/components/NotificationBell.tsx`
- Modify: `frontend/src/features/notifications/components/NotificationBell.test.tsx`

**Interfaces:**
- Produces: `useNotifications(page = 1, options?: { enabled?: boolean })` — assinatura estendida, retrocompatível (segundo argumento opcional).
- Produces: `NotificationBell(): JSX.Element | null` — retorna `null` quando `useAuthStore().user` é `null`.
- Consumes: `useAuthStore` de `frontend/src/stores/auth.ts` (já existe, não é alterado).

---

### Task 1: `useNotifications` aceita `enabled`

**Conteúdo atual de `frontend/src/features/notifications/queries.ts`:**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead } from './api';

export const notificationKeys = {
  list: (page: number) => ['notifications', page] as const,
};

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: () => fetchNotifications(page),
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/features/notifications/queries.test.tsx` (arquivo novo — não existe hoje; extensão `.tsx` porque o wrapper de teste usa JSX):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useNotifications } from './queries';
import { fetchNotifications } from './api';

vi.mock('./api', () => ({ fetchNotifications: vi.fn(), markNotificationRead: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useNotifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nao chama fetchNotifications quando enabled e false', () => {
    vi.mocked(fetchNotifications).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    renderHook(() => useNotifications(1, { enabled: false }), { wrapper });

    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  it('chama fetchNotifications quando enabled e true (padrao)', () => {
    vi.mocked(fetchNotifications).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    renderHook(() => useNotifications(1, { enabled: true }), { wrapper });

    expect(fetchNotifications).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- src/features/notifications/queries.test.tsx`
Expected: FAIL — `useNotifications` atual não aceita segundo argumento, `enabled: false` é ignorado e `fetchNotifications` é chamado de qualquer forma.

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `frontend/src/features/notifications/queries.ts` por:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead } from './api';

export const notificationKeys = {
  list: (page: number) => ['notifications', page] as const,
};

export function useNotifications(page = 1, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: () => fetchNotifications(page),
    enabled: options?.enabled ?? true,
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- src/features/notifications/queries.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/notifications/queries.ts frontend/src/features/notifications/queries.test.tsx
git commit -m "feat: adiciona opcao enabled a useNotifications"
```

---

### Task 2: `NotificationBell` esconde-se para visitante anônimo

**Conteúdo atual de `frontend/src/features/notifications/components/NotificationBell.tsx`:**

```tsx
import type { JSX } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useNotifications } from '../queries';

export function NotificationBell(): JSX.Element {
  const notifications = useNotifications();
  const unread = notifications.data?.items.filter((notification) => !notification.readAt).length ?? 0;

  return (
    <Link to="/notifications" className="relative inline-flex items-center text-ink" aria-label="Notificações">
      <BellIcon className="h-6 w-6" />
      {unread > 0 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-bg">
          {unread}
        </span>
      )}
    </Link>
  );
}

export default NotificationBell;
```

**Conteúdo atual de `frontend/src/features/notifications/components/NotificationBell.test.tsx`:**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { useNotifications } from '../queries';

vi.mock('../queries', () => ({ useNotifications: vi.fn() }));

describe('NotificationBell', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nao mostra contador quando nao ha notificacoes nao lidas', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [{ id: 'n1', readAt: '2026-07-01T00:00:00Z' }] },
    } as never);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('mostra contador de nao lidas com token de cor accent', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [{ id: 'n1', readAt: null }, { id: 'n2', readAt: null }] },
    } as never);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    const counter = screen.getByText('2');
    expect(counter).toBeInTheDocument();
    expect(counter.className).toContain('bg-accent');
  });
});
```

- [ ] **Step 1: Atualizar o teste primeiro**

Substituir todo o conteúdo de `frontend/src/features/notifications/components/NotificationBell.test.tsx` por:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { useNotifications } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('../queries', () => ({ useNotifications: vi.fn() }));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  it('nao renderiza nada quando o usuario nao esta autenticado', () => {
    vi.mocked(useNotifications).mockReturnValue({ data: undefined } as never);

    const { container } = render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('chama useNotifications com enabled false quando anonimo', () => {
    vi.mocked(useNotifications).mockReturnValue({ data: undefined } as never);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    expect(useNotifications).toHaveBeenCalledWith(1, { enabled: false });
  });

  it('nao mostra contador quando nao ha notificacoes nao lidas', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [{ id: 'n1', readAt: '2026-07-01T00:00:00Z' }] },
    } as never);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('mostra contador de nao lidas com token de cor accent quando autenticado', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [{ id: 'n1', readAt: null }, { id: 'n2', readAt: null }] },
    } as never);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    const counter = screen.getByText('2');
    expect(counter).toBeInTheDocument();
    expect(counter.className).toContain('bg-accent');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (em `frontend/`): `npm test -- NotificationBell.test.tsx`
Expected: FAIL — a implementação atual não checa `useAuthStore`, sempre renderiza, e chama `useNotifications()` sem argumentos (não `(1, { enabled: false })`).

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `frontend/src/features/notifications/components/NotificationBell.tsx` por:

```tsx
import type { JSX } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useNotifications } from '../queries';
import { useAuthStore } from '../../../stores/auth';

export function NotificationBell(): JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const notifications = useNotifications(1, { enabled: Boolean(user) });
  const unread = notifications.data?.items.filter((notification) => !notification.readAt).length ?? 0;

  if (!user) {
    return null;
  }

  return (
    <Link to="/notifications" className="relative inline-flex items-center text-ink" aria-label="Notificações">
      <BellIcon className="h-6 w-6" />
      {unread > 0 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-bg">
          {unread}
        </span>
      )}
    </Link>
  );
}

export default NotificationBell;
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- NotificationBell.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Rodar a suíte de `Topbar` pra checar regressão (usa `NotificationBell` por dentro)**

Run: `npm test -- Topbar.test.tsx`
Expected: PASS — o teste atual de `Topbar.test.tsx` mocka `useNotifications` mas não `useAuthStore`; como o `Topbar` ainda não foi reescrito nesta fase (isso é Fase 3), ele hoje renderiza `NotificationBell`/`ProfileMenu` incondicionalmente. Sem usuário autenticado (estado padrão do Zustand em teste), `NotificationBell` agora retorna `null` e `ProfileMenu` já retornava `null` — o teste existente só verifica o título "Services Marketplace", então continua passando.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/notifications/components/NotificationBell.tsx frontend/src/features/notifications/components/NotificationBell.test.tsx
git commit -m "fix: NotificationBell nao renderiza nem busca dados para visitante anonimo"
```
