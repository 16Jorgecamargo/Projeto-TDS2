## Fase B — Notificações (Tasks 3-4)

### Task 3: Restilizar `NotificationsPage`

**Files:**
- Modify: `frontend/src/features/notifications/pages/NotificationsPage.tsx`
- Test: `frontend/src/features/notifications/pages/NotificationsPage.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `useNotifications()`, `useMarkNotificationRead()` de `frontend/src/features/notifications/queries.ts` (já existentes, assinaturas inalteradas). `Card`, `Badge`, `Skeleton`, `EmptyState`, `Button` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Escrever os testes falhos**

Crie `frontend/src/features/notifications/pages/NotificationsPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsPage } from './NotificationsPage';
import { useNotifications, useMarkNotificationRead } from '../queries';

vi.mock('../queries', () => ({ useNotifications: vi.fn(), useMarkNotificationRead: vi.fn() }));

describe('NotificationsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra skeleton de carregamento', () => {
    vi.mocked(useNotifications).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<NotificationsPage />);

    expect(screen.getByLabelText('Carregando notificações')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha notificacoes', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isLoading: false,
    } as never);
    vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<NotificationsPage />);

    expect(screen.getByText('Nenhuma notificação ainda')).toBeInTheDocument();
  });

  it('mostra badge de nao lida e marca como lida ao clicar', async () => {
    const mutate = vi.fn();
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        items: [
          {
            id: 'n1', type: 'contract', title: 'Contrato iniciado', body: null,
            channel: 'in_app', readAt: null, createdAt: '2026-07-01T12:00:00Z',
          },
        ],
        page: 1, limit: 20, total: 1,
      },
      isLoading: false,
    } as never);
    vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<NotificationsPage />);

    expect(screen.getByText('Contrato iniciado')).toBeInTheDocument();
    expect(screen.getByText('Não lida')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Marcar lida' }));

    expect(mutate).toHaveBeenCalledWith('n1');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/notifications/pages/NotificationsPage.test.tsx`
Esperado: FAIL — `aria-label="Carregando notificações"` e o texto "Não lida" ainda não existem na implementação atual.

- [ ] **Step 3: Restilizar `NotificationsPage.tsx`**

Substitua o conteúdo de `frontend/src/features/notifications/pages/NotificationsPage.tsx`:
```tsx
import type { JSX } from 'react';
import { useNotifications, useMarkNotificationRead } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';

export function NotificationsPage(): JSX.Element {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();

  if (notifications.isLoading || !notifications.data) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold text-ink">Notificações</h1>
        <Skeleton className="h-16 w-full" aria-label="Carregando notificações" />
      </div>
    );
  }

  const items = notifications.data.items;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold text-ink">Notificações</h1>
      {items.length === 0 ? (
        <EmptyState title="Nenhuma notificação ainda" />
      ) : (
        <Card className="flex flex-col gap-0 divide-y divide-surface p-0">
          {items.map((notification) => (
            <div key={notification.id} className="flex items-start justify-between gap-4 p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">{notification.title}</p>
                  {!notification.readAt && <Badge tone="urgent">Não lida</Badge>}
                </div>
                {notification.body && <p className="text-sm text-muted">{notification.body}</p>}
                <p className="text-xs text-muted">
                  {new Date(notification.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              {!notification.readAt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => markRead.mutate(notification.id)}
                  disabled={markRead.isPending}
                >
                  Marcar lida
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default NotificationsPage;
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/notifications/pages/NotificationsPage.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/notifications/pages/NotificationsPage.tsx frontend/src/features/notifications/pages/NotificationsPage.test.tsx
git commit -m "style(notifications): restiliza NotificationsPage com tokens da fase 1"
```

---

### Task 4: Restilizar `NotificationBell`

**Files:**
- Modify: `frontend/src/features/notifications/components/NotificationBell.tsx`
- Test: `frontend/src/features/notifications/components/NotificationBell.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `useNotifications()` de `frontend/src/features/notifications/queries.ts` (já existente, assinatura inalterada).
- Produces: nenhuma interface nova — só estilo. Continua sendo usado por `frontend/src/components/layout/Topbar.tsx` sem nenhuma mudança de prop (não recebe props hoje).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/notifications/components/NotificationBell.test.tsx`:
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

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/notifications/components/NotificationBell.test.tsx`
Esperado: FAIL — a implementação atual usa `bg-red-500`, não `bg-accent`.

- [ ] **Step 3: Restilizar `NotificationBell.tsx`**

Substitua o conteúdo de `frontend/src/features/notifications/components/NotificationBell.tsx`:
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

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/notifications/components/NotificationBell.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa (inclusive `Topbar.test.tsx`, que já mocka `useNotifications` do mesmo jeito).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/notifications/components/NotificationBell.tsx frontend/src/features/notifications/components/NotificationBell.test.tsx
git commit -m "style(notifications): restiliza NotificationBell com tokens da fase 1"
```

---
