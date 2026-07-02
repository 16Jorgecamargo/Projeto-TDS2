# Fase 2 — Phase B: Dashboard Cliente (Tasks 3-5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends only on Fase 1 primitives (already merged) — does not depend on Phase A. Work from `frontend/` unless noted.

---

### Task 3: `DashboardQuickActions` widget

**Files:**
- Create: `frontend/src/features/dashboard/components/DashboardQuickActions.tsx`
- Test: `frontend/src/features/dashboard/components/DashboardQuickActions.test.tsx`

**Interfaces:**
- Consumes: `Button` from `frontend/src/components/ui/Button.tsx`; `useNavigate` from `react-router-dom`.
- Produces: `DashboardQuickActions` component (no props). Consumed by `ClientDashboardPage` (Task 5).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

import { DashboardQuickActions } from './DashboardQuickActions';

describe('DashboardQuickActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('navega para /demands/new ao clicar em Publicar demanda', async () => {
    const user = userEvent.setup();
    render(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Publicar demanda' }));

    expect(navigateMock).toHaveBeenCalledWith('/demands/new');
  });

  it('navega para /search ao clicar em Buscar profissional', async () => {
    const user = userEvent.setup();
    render(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Buscar profissional' }));

    expect(navigateMock).toHaveBeenCalledWith('/search');
  });

  it('navega para /contracts ao clicar em Ver contratos', async () => {
    const user = userEvent.setup();
    render(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Ver contratos' }));

    expect(navigateMock).toHaveBeenCalledWith('/contracts');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/components/DashboardQuickActions.test.tsx`
Expected: FAIL — `Cannot find module './DashboardQuickActions'`

- [ ] **Step 3: Write the implementation**

```tsx
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';

export function DashboardQuickActions(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => navigate('/demands/new')}>Publicar demanda</Button>
      <Button variant="ghost" onClick={() => navigate('/search')}>
        Buscar profissional
      </Button>
      <Button variant="ghost" onClick={() => navigate('/contracts')}>
        Ver contratos
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/components/DashboardQuickActions.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/components/DashboardQuickActions.tsx frontend/src/features/dashboard/components/DashboardQuickActions.test.tsx
git commit -m "feat(dashboard): adiciona DashboardQuickActions"
```

---

### Task 4: `DashboardDemandsWidget` + `DashboardContractsWidget` + `DashboardScheduleWidget`

**Files:**
- Create: `frontend/src/features/dashboard/components/DashboardDemandsWidget.tsx`
- Create: `frontend/src/features/dashboard/components/DashboardContractsWidget.tsx`
- Create: `frontend/src/features/dashboard/components/DashboardScheduleWidget.tsx`
- Test: `frontend/src/features/dashboard/components/DashboardDemandsWidget.test.tsx`
- Test: `frontend/src/features/dashboard/components/DashboardContractsWidget.test.tsx`
- Test: `frontend/src/features/dashboard/components/DashboardScheduleWidget.test.tsx`

**Interfaces:**
- Consumes: `useDemands` from `frontend/src/features/demands/queries.ts`; `Card`, `Skeleton`, `EmptyState` from `frontend/src/components/ui/`; `formatDate` from `frontend/src/lib/utils.ts`.
- **Before writing `DashboardContractsWidget`/`DashboardScheduleWidget`**: read `frontend/src/features/contracts/queries.ts` and `frontend/src/features/contracts/api.ts` first to confirm the exact exported hook name and return shape (expected, by the codebase's established TanStack Query convention seen in every other feature module: `useContracts()` returning `{ data: Contract[] | undefined, isPending: boolean }`, and a `Contract` type with a `schedule: Schedule | null` field where `Schedule` has `scheduledDate`, `durationMinutes`, `notes`, `status`). If the actual file differs from this expectation, use the real signature/type names instead of what's written below, and note the discrepancy in your report.
- Produces: `DashboardDemandsWidget`, `DashboardContractsWidget`, `DashboardScheduleWidget` — all no-prop components. Consumed by `ClientDashboardPage` (Task 5).

- [ ] **Step 1: Write the failing test for `DashboardDemandsWidget`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardDemandsWidget } from './DashboardDemandsWidget';
import { useDemands } from '../../demands/queries';

vi.mock('../../demands/queries', () => ({ useDemands: vi.fn() }));

describe('DashboardDemandsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista demandas abertas ou em andamento', () => {
    vi.mocked(useDemands).mockReturnValue({
      data: {
        items: [
          { id: 'd1', title: 'Pintar sala', status: 'open' },
          { id: 'd2', title: 'Trocar torneira', status: 'in_progress' },
          { id: 'd3', title: 'Concluída', status: 'closed' },
        ],
        page: 1,
        limit: 20,
        total: 3,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardDemandsWidget />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
    expect(screen.getByText('Trocar torneira')).toBeInTheDocument();
    expect(screen.queryByText('Concluída')).not.toBeInTheDocument();
  });

  it('mostra estado vazio com CTA quando nao ha demandas abertas', () => {
    vi.mocked(useDemands).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardDemandsWidget />);

    expect(screen.getByText('Nenhuma demanda aberta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Publicar demanda' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/components/DashboardDemandsWidget.test.tsx`
Expected: FAIL — `Cannot find module './DashboardDemandsWidget'`

- [ ] **Step 3: Write `DashboardDemandsWidget.tsx`**

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useDemands } from '../../demands/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

const OPEN_STATUSES = new Set(['open', 'in_progress']);

export function DashboardDemandsWidget(): JSX.Element {
  const { data, isPending } = useDemands(true);
  const items = (data?.items ?? []).filter((demand) => OPEN_STATUSES.has(demand.status)).slice(0, 3);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Demandas abertas</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando demandas" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma demanda aberta"
          action={
            <Link to="/demands/new" className="text-sm font-semibold text-primary">
              Publicar demanda
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((demand) => (
            <li key={demand.id}>
              <Link to={`/demands/${demand.id}`} className="text-sm font-medium text-ink hover:text-primary">
                {demand.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/demands" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver todas
      </Link>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/components/DashboardDemandsWidget.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for `DashboardContractsWidget`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardContractsWidget } from './DashboardContractsWidget';
import { useContracts } from '../../contracts/queries';

vi.mock('../../contracts/queries', () => ({ useContracts: vi.fn() }));

describe('DashboardContractsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra contagem de contratos ativos e concluidos', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [
        { id: 'c1', status: 'active', schedule: null },
        { id: 'c2', status: 'active', schedule: null },
        { id: 'c3', status: 'completed', schedule: null },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardContractsWidget />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Concluídos')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha contratos', () => {
    vi.mocked(useContracts).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<DashboardContractsWidget />);

    expect(screen.getByText('Nenhum contrato ainda')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/components/DashboardContractsWidget.test.tsx`
Expected: FAIL — `Cannot find module './DashboardContractsWidget'`

- [ ] **Step 7: Write `DashboardContractsWidget.tsx`**

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useContracts } from '../../contracts/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export function DashboardContractsWidget(): JSX.Element {
  const { data, isPending } = useContracts();
  const active = (data ?? []).filter((contract) => contract.status === 'active');
  const completed = (data ?? []).filter((contract) => contract.status === 'completed');

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Contratos</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando contratos" />
      ) : active.length === 0 && completed.length === 0 ? (
        <EmptyState title="Nenhum contrato ainda" />
      ) : (
        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-bold text-ink">{active.length}</p>
            <p className="text-xs text-muted">Ativos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{completed.length}</p>
            <p className="text-xs text-muted">Concluídos</p>
          </div>
        </div>
      )}
      <Link to="/contracts" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver contratos
      </Link>
    </Card>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/components/DashboardContractsWidget.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Write the failing test for `DashboardScheduleWidget`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardScheduleWidget } from './DashboardScheduleWidget';
import { useContracts } from '../../contracts/queries';

vi.mock('../../contracts/queries', () => ({ useContracts: vi.fn() }));

describe('DashboardScheduleWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o agendamento mais proximo entre os contratos', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [
        {
          id: 'c1',
          status: 'active',
          schedule: { id: 's1', scheduledDate: '2026-08-01T09:00:00.000Z', durationMinutes: 60, notes: 'Levar ferramentas', status: 'scheduled' },
        },
        {
          id: 'c2',
          status: 'active',
          schedule: { id: 's2', scheduledDate: '2026-07-10T09:00:00.000Z', durationMinutes: 30, notes: null, status: 'scheduled' },
        },
        { id: 'c3', status: 'active', schedule: null },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardScheduleWidget />);

    expect(screen.getByText('Próximo agendamento')).toBeInTheDocument();
  });

  it('nao renderiza nada quando nenhum contrato tem agendamento', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [{ id: 'c1', status: 'active', schedule: null }],
      isPending: false,
    } as never);

    const { container } = renderWithProviders(<DashboardScheduleWidget />);

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/components/DashboardScheduleWidget.test.tsx`
Expected: FAIL — `Cannot find module './DashboardScheduleWidget'`

- [ ] **Step 11: Write `DashboardScheduleWidget.tsx`**

```tsx
import type { JSX } from 'react';
import { useContracts } from '../../contracts/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate } from '../../../lib/utils';

export function DashboardScheduleWidget(): JSX.Element | null {
  const { data, isPending } = useContracts();

  if (isPending) {
    return (
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Próximo agendamento</h2>
        <Skeleton className="h-16 w-full" aria-label="Carregando agendamento" />
      </Card>
    );
  }

  const scheduled = (data ?? [])
    .filter((contract) => contract.schedule !== null)
    .sort(
      (a, b) => new Date(a.schedule!.scheduledDate).getTime() - new Date(b.schedule!.scheduledDate).getTime(),
    );

  const next = scheduled[0];
  if (!next || !next.schedule) return null;

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Próximo agendamento</h2>
      <p className="text-sm font-medium text-ink">{formatDate(next.schedule.scheduledDate)}</p>
      {next.schedule.notes && <p className="text-sm text-muted">{next.schedule.notes}</p>}
    </Card>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/components/DashboardScheduleWidget.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 13: Commit**

```bash
git add frontend/src/features/dashboard/components/DashboardDemandsWidget.tsx frontend/src/features/dashboard/components/DashboardDemandsWidget.test.tsx frontend/src/features/dashboard/components/DashboardContractsWidget.tsx frontend/src/features/dashboard/components/DashboardContractsWidget.test.tsx frontend/src/features/dashboard/components/DashboardScheduleWidget.tsx frontend/src/features/dashboard/components/DashboardScheduleWidget.test.tsx
git commit -m "feat(dashboard): adiciona widgets de demandas, contratos e agendamento"
```

---

### Task 5: `DashboardFavoritesWidget` + `DashboardNotificationsWidget` + `ClientDashboardPage` + roteamento

**Files:**
- Create: `frontend/src/features/dashboard/components/DashboardFavoritesWidget.tsx`
- Create: `frontend/src/features/dashboard/components/DashboardNotificationsWidget.tsx`
- Create: `frontend/src/features/dashboard/pages/ClientDashboardPage.tsx`
- Create: `frontend/src/pages/HomeRoute.tsx`
- Modify: `frontend/src/router/index.tsx`
- Test: `frontend/src/features/dashboard/components/DashboardFavoritesWidget.test.tsx`
- Test: `frontend/src/features/dashboard/components/DashboardNotificationsWidget.test.tsx`
- Test: `frontend/src/features/dashboard/pages/ClientDashboardPage.test.tsx`
- Test: `frontend/src/pages/HomeRoute.test.tsx`

**Interfaces:**
- Consumes: `useFavorites` from `frontend/src/features/favorites/queries.ts` (Phase A, Task 1); `usePublicProfile` from `frontend/src/features/professional/queries.ts`; `useNotifications` from `frontend/src/features/notifications/queries.ts`; `useAuthStore` from `frontend/src/stores/auth.ts`; `Card`, `Avatar`, `Skeleton`, `EmptyState` from `frontend/src/components/ui/`; `DashboardQuickActions`, `DashboardDemandsWidget`, `DashboardContractsWidget`, `DashboardScheduleWidget` (Tasks 3-4).
- Produces: `DashboardFavoritesWidget`, `DashboardNotificationsWidget`, `ClientDashboardPage`, `HomeRoute`. `HomeRoute` replaces `LandingPage` as the element at the existing `/` route — authenticated `client` users see `ClientDashboardPage`, everyone else (no user, `professional`, `admin`) sees the unchanged `LandingPage`.

**Note on `PublicProfile` shape**: this task uses `data.headline` as the display label and as `Avatar`'s `name` prop (`PublicProfile` — see `frontend/src/features/professional/api.ts` — has no `name` field of its own, only `headline`; do not assume an `avatarUrl` field exists on this type without checking it in the actual file first — if absent, `Avatar` renders initials from `headline`, which is the accepted behavior here).

- [ ] **Step 1: Write the failing test for `DashboardFavoritesWidget`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardFavoritesWidget } from './DashboardFavoritesWidget';
import { useFavorites } from '../../favorites/queries';
import { usePublicProfile } from '../../professional/queries';

vi.mock('../../favorites/queries', () => ({ useFavorites: vi.fn() }));
vi.mock('../../professional/queries', () => ({ usePublicProfile: vi.fn() }));

describe('DashboardFavoritesWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista profissionais favoritados', () => {
    vi.mocked(useFavorites).mockReturnValue({
      data: { items: [{ id: 'f1', professionalId: 'p1', createdAt: '' }], page: 1, limit: 20, total: 1 },
      isPending: false,
    } as never);
    vi.mocked(usePublicProfile).mockReturnValue({
      data: { headline: 'Eletricista João', ratingAverage: 4.5, ratingCount: 10 },
    } as never);

    renderWithProviders(<DashboardFavoritesWidget />);

    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha favoritos', () => {
    vi.mocked(useFavorites).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardFavoritesWidget />);

    expect(screen.getByText('Nenhum favorito ainda')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/components/DashboardFavoritesWidget.test.tsx`
Expected: FAIL — `Cannot find module './DashboardFavoritesWidget'`

- [ ] **Step 3: Write `DashboardFavoritesWidget.tsx`**

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../../favorites/queries';
import { usePublicProfile } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

function FavoriteProfessionalPreview({ professionalId }: { professionalId: string }): JSX.Element | null {
  const { data } = usePublicProfile(professionalId);
  if (!data) return null;
  return (
    <Link to={`/professionals/${professionalId}`} className="flex items-center gap-2">
      <Avatar name={data.headline} size="sm" />
      <span className="text-sm font-medium text-ink">{data.headline}</span>
    </Link>
  );
}

export function DashboardFavoritesWidget(): JSX.Element {
  const { data, isPending } = useFavorites(1);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Profissionais favoritos</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando favoritos" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhum favorito ainda"
          description="Favorite profissionais para encontrá-los rápido aqui."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.items.map((favorite) => (
            <li key={favorite.id}>
              <FavoriteProfessionalPreview professionalId={favorite.professionalId} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/components/DashboardFavoritesWidget.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for `DashboardNotificationsWidget`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardNotificationsWidget } from './DashboardNotificationsWidget';
import { useNotifications } from '../../notifications/queries';

vi.mock('../../notifications/queries', () => ({ useNotifications: vi.fn() }));

describe('DashboardNotificationsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista as notificacoes mais recentes', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        items: [{ id: 'n1', type: 'x', title: 'Novo orçamento recebido', body: null, channel: 'in_app', readAt: null, createdAt: '' }],
        page: 1,
        limit: 20,
        total: 1,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardNotificationsWidget />);

    expect(screen.getByText('Novo orçamento recebido')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha notificacoes', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardNotificationsWidget />);

    expect(screen.getByText('Nenhuma notificação ainda')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/components/DashboardNotificationsWidget.test.tsx`
Expected: FAIL — `Cannot find module './DashboardNotificationsWidget'`

- [ ] **Step 7: Write `DashboardNotificationsWidget.tsx`**

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../notifications/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export function DashboardNotificationsWidget(): JSX.Element {
  const { data, isPending } = useNotifications(1);
  const items = (data?.items ?? []).slice(0, 5);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Notificações recentes</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando notificações" />
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma notificação ainda" />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((notification) => (
            <li key={notification.id} className="text-sm text-ink">
              {notification.title}
            </li>
          ))}
        </ul>
      )}
      <Link to="/notifications" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver todas
      </Link>
    </Card>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/components/DashboardNotificationsWidget.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Write the failing test for `ClientDashboardPage`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ClientDashboardPage } from './ClientDashboardPage';

vi.mock('../components/DashboardQuickActions', () => ({ DashboardQuickActions: () => <div>quick-actions</div> }));
vi.mock('../components/DashboardDemandsWidget', () => ({ DashboardDemandsWidget: () => <div>demands-widget</div> }));
vi.mock('../components/DashboardContractsWidget', () => ({ DashboardContractsWidget: () => <div>contracts-widget</div> }));
vi.mock('../components/DashboardScheduleWidget', () => ({ DashboardScheduleWidget: () => <div>schedule-widget</div> }));
vi.mock('../components/DashboardFavoritesWidget', () => ({ DashboardFavoritesWidget: () => <div>favorites-widget</div> }));
vi.mock('../components/DashboardNotificationsWidget', () => ({
  DashboardNotificationsWidget: () => <div>notifications-widget</div>,
}));

describe('ClientDashboardPage', () => {
  it('renderiza o titulo e todos os widgets', () => {
    renderWithProviders(<ClientDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument();
    expect(screen.getByText('quick-actions')).toBeInTheDocument();
    expect(screen.getByText('demands-widget')).toBeInTheDocument();
    expect(screen.getByText('contracts-widget')).toBeInTheDocument();
    expect(screen.getByText('schedule-widget')).toBeInTheDocument();
    expect(screen.getByText('favorites-widget')).toBeInTheDocument();
    expect(screen.getByText('notifications-widget')).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/pages/ClientDashboardPage.test.tsx`
Expected: FAIL — `Cannot find module './ClientDashboardPage'`

- [ ] **Step 11: Write `ClientDashboardPage.tsx`**

```tsx
import type { JSX } from 'react';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DashboardDemandsWidget } from '../components/DashboardDemandsWidget';
import { DashboardContractsWidget } from '../components/DashboardContractsWidget';
import { DashboardScheduleWidget } from '../components/DashboardScheduleWidget';
import { DashboardFavoritesWidget } from '../components/DashboardFavoritesWidget';
import { DashboardNotificationsWidget } from '../components/DashboardNotificationsWidget';

export function ClientDashboardPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">Painel</h1>
        <DashboardQuickActions />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardDemandsWidget />
        <DashboardContractsWidget />
        <DashboardScheduleWidget />
        <DashboardFavoritesWidget />
        <DashboardNotificationsWidget />
      </div>
    </div>
  );
}

export default ClientDashboardPage;
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/pages/ClientDashboardPage.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 13: Write the failing test for `HomeRoute`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { HomeRoute } from './HomeRoute';
import { useAuthStore } from '../stores/auth';

vi.mock('../features/landing/pages/LandingPage', () => ({ default: () => <div>landing-page</div> }));
vi.mock('../features/dashboard/pages/ClientDashboardPage', () => ({
  ClientDashboardPage: () => <div>client-dashboard</div>,
}));

describe('HomeRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('renderiza a LandingPage quando nao ha usuario logado', () => {
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('landing-page')).toBeInTheDocument();
  });

  it('renderiza o ClientDashboardPage para usuario com papel client', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('client-dashboard')).toBeInTheDocument();
  });

  it('renderiza a LandingPage para usuario com papel professional', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('landing-page')).toBeInTheDocument();
  });
});
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npx vitest run src/pages/HomeRoute.test.tsx`
Expected: FAIL — `Cannot find module './HomeRoute'`

- [ ] **Step 15: Write `HomeRoute.tsx`**

```tsx
import type { JSX } from 'react';
import { useAuthStore } from '../stores/auth';
import LandingPage from '../features/landing/pages/LandingPage';
import { ClientDashboardPage } from '../features/dashboard/pages/ClientDashboardPage';

export function HomeRoute(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'client') {
    return <ClientDashboardPage />;
  }

  return <LandingPage />;
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npx vitest run src/pages/HomeRoute.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 17: Wire `HomeRoute` into the router**

In `frontend/src/router/index.tsx`, replace the import:

```ts
import LandingPage from '../features/landing/pages/LandingPage';
```

with:

```ts
import { HomeRoute } from '../pages/HomeRoute';
```

And replace the route entry:

```ts
{ path: '/', element: <LandingPage /> },
```

with:

```ts
{ path: '/', element: <HomeRoute /> },
```

- [ ] **Step 18: Run the full frontend test suite to confirm the routing swap didn't break anything**

Run: `npm run test`
Expected: PASS (all suites, including the existing `App.test.tsx` and any test that renders `/` via the router)

- [ ] **Step 19: Commit**

```bash
git add frontend/src/features/dashboard/components/DashboardFavoritesWidget.tsx frontend/src/features/dashboard/components/DashboardFavoritesWidget.test.tsx frontend/src/features/dashboard/components/DashboardNotificationsWidget.tsx frontend/src/features/dashboard/components/DashboardNotificationsWidget.test.tsx frontend/src/features/dashboard/pages/ClientDashboardPage.tsx frontend/src/features/dashboard/pages/ClientDashboardPage.test.tsx frontend/src/pages/HomeRoute.tsx frontend/src/pages/HomeRoute.test.tsx frontend/src/router/index.tsx
git commit -m "feat(dashboard): adiciona ClientDashboardPage e troca Landing por Dashboard para clientes autenticados"
```

---

Next: [plan_phase_c_search.md](plan_phase_c_search.md)
