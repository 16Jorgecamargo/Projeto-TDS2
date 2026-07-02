# Fase B — Widgets do Dashboard Profissional + Composição + Roteamento

Ver `plan_index.md` para Global Constraints. Todas as tasks desta fase criam arquivos em uma feature nova: `frontend/src/features/professional-dashboard/` (separada de `frontend/src/features/professional/`, que segue reservada para os formulários de gestão da Fase C).

### Task 2: `DashboardQuickActions` (variante profissional)

**Files:**
- Create: `frontend/src/features/professional-dashboard/components/DashboardQuickActions.tsx`
- Test: `frontend/src/features/professional-dashboard/components/DashboardQuickActions.test.tsx`

**Interfaces:**
- Consumes: `Button` de `frontend/src/components/ui/Button.tsx` (`variant`: `'primary' | 'accent' | 'ghost'`), `useNavigate` de `react-router-dom`.
- Produces: `DashboardQuickActions` — componente sem props, renderizado pela `ProfessionalDashboardPage` (Task 8).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional-dashboard/components/DashboardQuickActions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardQuickActions } from './DashboardQuickActions';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

describe('DashboardQuickActions', () => {
  it('navega para /demands ao clicar em Buscar demandas disponíveis', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Buscar demandas disponíveis' }));

    expect(navigateMock).toHaveBeenCalledWith('/demands');
  });

  it('navega para /contracts ao clicar em Ver contratos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Ver contratos' }));

    expect(navigateMock).toHaveBeenCalledWith('/contracts');
  });

  it('navega para /professional/profile ao clicar em Editar perfil', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardQuickActions />);

    await user.click(screen.getByRole('button', { name: 'Editar perfil' }));

    expect(navigateMock).toHaveBeenCalledWith('/professional/profile');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardQuickActions.test.tsx`
Esperado: FAIL com "Cannot find module './DashboardQuickActions'".

- [ ] **Step 3: Implementar**

Crie `frontend/src/features/professional-dashboard/components/DashboardQuickActions.tsx`:

```tsx
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';

export function DashboardQuickActions(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => navigate('/demands')}>Buscar demandas disponíveis</Button>
      <Button variant="ghost" onClick={() => navigate('/contracts')}>
        Ver contratos
      </Button>
      <Button variant="ghost" onClick={() => navigate('/professional/profile')}>
        Editar perfil
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardQuickActions.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional-dashboard/components/DashboardQuickActions.tsx frontend/src/features/professional-dashboard/components/DashboardQuickActions.test.tsx
git commit -m "feat(professional-dashboard): adiciona acoes rapidas do dashboard profissional"
```

---

### Task 3: `DashboardRevenueWidget`

**Files:**
- Create: `frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.tsx`
- Test: `frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.test.tsx`

**Interfaces:**
- Consumes: `useWallet()` (retorna `{ data: Wallet | undefined, isPending: boolean }`, de `frontend/src/features/wallet/queries.ts`) e `useTransactions(page: number)` (retorna `{ data: Paginated<WalletTransaction> | undefined, isPending: boolean }`, mesmo arquivo). `Wallet = { balance: number; pendingBalance: number; currency: string; ... }`. `WalletTransaction = { type: 'credit'|'debit'|'hold'|'release'; amount: number; createdAt: string; ... }` (de `frontend/src/features/wallet/api.ts`). `Card`/`Skeleton`/`EmptyState` de `components/ui/`. `formatCurrency` de `frontend/src/lib/utils.ts`.
- Produces: `DashboardRevenueWidget` — componente sem props, renderizado pela `ProfessionalDashboardPage` (Task 8).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardRevenueWidget } from './DashboardRevenueWidget';
import { useWallet, useTransactions } from '../../wallet/queries';

vi.mock('../../wallet/queries', () => ({ useWallet: vi.fn(), useTransactions: vi.fn() }));

describe('DashboardRevenueWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra saldo disponivel, pendente e receita do mes somando creditos', () => {
    vi.mocked(useWallet).mockReturnValue({
      data: { id: 'w1', userId: 'u1', balance: 500, pendingBalance: 100, currency: 'BRL', createdAt: '', updatedAt: '' },
      isPending: false,
    } as never);
    vi.mocked(useTransactions).mockReturnValue({
      data: {
        items: [
          { id: 't1', walletId: 'w1', type: 'credit', amount: 200, balanceAfter: 500, referenceType: 'payment', referenceId: null, description: null, createdAt: new Date().toISOString() },
          { id: 't2', walletId: 'w1', type: 'debit', amount: 50, balanceAfter: 300, referenceType: 'withdrawal', referenceId: null, description: null, createdAt: new Date().toISOString() },
          { id: 't3', walletId: 'w1', type: 'credit', amount: 100, balanceAfter: 400, referenceType: 'payment', referenceId: null, description: null, createdAt: '2020-01-01T00:00:00Z' },
        ],
        page: 1,
        limit: 20,
        total: 3,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardRevenueWidget />);

    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useWallet).mockReturnValue({ data: undefined, isPending: true } as never);
    vi.mocked(useTransactions).mockReturnValue({ data: undefined, isPending: true } as never);

    renderWithProviders(<DashboardRevenueWidget />);

    expect(screen.getByRole('status', { name: 'Carregando receita' })).toBeInTheDocument();
  });
});
```

Note: o teste usa uma transação de `2020-01-01` (fora do mês corrente) para provar que só a soma de créditos do mês corrente aparece (`R$ 200,00`, não `R$ 300,00`).

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardRevenueWidget.test.tsx`
Esperado: FAIL com "Cannot find module './DashboardRevenueWidget'".

- [ ] **Step 3: Implementar**

Crie `frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.tsx`:

```tsx
import type { JSX } from 'react';
import { useWallet, useTransactions } from '../../wallet/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../lib/utils';

function isCurrentMonth(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

export function DashboardRevenueWidget(): JSX.Element {
  const { data: wallet, isPending: isWalletPending } = useWallet();
  const { data: transactions, isPending: isTransactionsPending } = useTransactions(1);

  const isPending = isWalletPending || isTransactionsPending;

  const monthlyRevenue = (transactions?.items ?? [])
    .filter((transaction) => transaction.type === 'credit' && isCurrentMonth(transaction.createdAt))
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Receita</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando receita" />
      ) : (
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-2xl font-bold text-ink">{formatCurrency(wallet?.balance ?? 0)}</p>
            <p className="text-xs text-muted">Saldo disponível</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{formatCurrency(wallet?.pendingBalance ?? 0)}</p>
            <p className="text-xs text-muted">Saldo pendente</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{formatCurrency(monthlyRevenue)}</p>
            <p className="text-xs text-muted">Receita do mês</p>
          </div>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardRevenueWidget.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.tsx frontend/src/features/professional-dashboard/components/DashboardRevenueWidget.test.tsx
git commit -m "feat(professional-dashboard): adiciona widget de receita e saldo"
```

---

### Task 4: `DashboardAgendaWidget`

**Files:**
- Create: `frontend/src/features/professional-dashboard/components/DashboardAgendaWidget.tsx`
- Test: `frontend/src/features/professional-dashboard/components/DashboardAgendaWidget.test.tsx`

**Interfaces:**
- Consumes: `useContracts()` (retorna `{ data: Contract[] | undefined, isPending: boolean }`, de `frontend/src/features/contracts/queries.ts`). `Contract = { id: string; status: ContractStatus; schedule: Schedule | null; ... }`, `Schedule = { scheduledDate: string; notes: string | null; ... }` (de `frontend/src/features/contracts/api.ts`). `useMyProfile()` (retorna `{ data: ProfessionalProfile | undefined }`) e `useSlots(professionalId: string | undefined)` (retorna `{ data: AvailabilitySlot[] | undefined, isPending: boolean }`), ambos de `frontend/src/features/professional/queries.ts`. `AvailabilitySlot = { id: string; weekday: number; startTime: string; endTime: string }`. `Card`/`Skeleton`/`EmptyState` de `components/ui/`. `formatDate` de `frontend/src/lib/utils.ts`.
- Produces: `DashboardAgendaWidget` — componente sem props, renderizado pela `ProfessionalDashboardPage` (Task 8).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional-dashboard/components/DashboardAgendaWidget.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardAgendaWidget } from './DashboardAgendaWidget';
import { useContracts } from '../../contracts/queries';
import { useMyProfile, useSlots } from '../../professional/queries';

vi.mock('../../contracts/queries', () => ({ useContracts: vi.fn() }));
vi.mock('../../professional/queries', () => ({ useMyProfile: vi.fn(), useSlots: vi.fn() }));

describe('DashboardAgendaWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o proximo compromisso agendado e o total de slots de disponibilidade', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);
    vi.mocked(useContracts).mockReturnValue({
      data: [
        { id: 'c1', status: 'active', schedule: { id: 's1', scheduledDate: '2030-01-10T10:00:00Z', durationMinutes: 60, notes: 'Levar ferramentas', status: 'scheduled' } },
        { id: 'c2', status: 'active', schedule: { id: 's2', scheduledDate: '2030-01-05T10:00:00Z', durationMinutes: 60, notes: null, status: 'scheduled' } },
      ],
      isPending: false,
    } as never);
    vi.mocked(useSlots).mockReturnValue({
      data: [
        { id: 'slot1', weekday: 1, startTime: '08:00', endTime: '18:00' },
        { id: 'slot2', weekday: 2, startTime: '08:00', endTime: '18:00' },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardAgendaWidget />);

    expect(screen.getByText('05/01/2030')).toBeInTheDocument();
    expect(screen.getByText('2 dias com disponibilidade cadastrada')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha compromissos nem disponibilidade', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);
    vi.mocked(useContracts).mockReturnValue({ data: [], isPending: false } as never);
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<DashboardAgendaWidget />);

    expect(screen.getByText('Nenhum compromisso ou disponibilidade cadastrada')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardAgendaWidget.test.tsx`
Esperado: FAIL com "Cannot find module './DashboardAgendaWidget'".

- [ ] **Step 3: Implementar**

Crie `frontend/src/features/professional-dashboard/components/DashboardAgendaWidget.tsx`:

```tsx
import type { JSX } from 'react';
import { useContracts } from '../../contracts/queries';
import { useMyProfile, useSlots } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/utils';

export function DashboardAgendaWidget(): JSX.Element {
  const { data: profile } = useMyProfile();
  const { data: contracts, isPending: isContractsPending } = useContracts();
  const { data: slots, isPending: isSlotsPending } = useSlots(profile?.id);

  const isPending = isContractsPending || isSlotsPending;

  const upcoming = (contracts ?? [])
    .filter((contract) => contract.schedule !== null)
    .sort(
      (a, b) => new Date(a.schedule!.scheduledDate).getTime() - new Date(b.schedule!.scheduledDate).getTime(),
    );
  const next = upcoming[0];
  const slotCount = slots?.length ?? 0;

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Agenda</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando agenda" />
      ) : !next && slotCount === 0 ? (
        <EmptyState title="Nenhum compromisso ou disponibilidade cadastrada" />
      ) : (
        <div className="flex flex-col gap-3">
          {next && next.schedule && (
            <div>
              <p className="text-sm font-medium text-ink">{formatDate(next.schedule.scheduledDate)}</p>
              {next.schedule.notes && <p className="text-sm text-muted">{next.schedule.notes}</p>}
            </div>
          )}
          <p className="text-sm text-muted">
            {slotCount} {slotCount === 1 ? 'dia com disponibilidade cadastrada' : 'dias com disponibilidade cadastrada'}
          </p>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardAgendaWidget.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional-dashboard/components/DashboardAgendaWidget.tsx frontend/src/features/professional-dashboard/components/DashboardAgendaWidget.test.tsx
git commit -m "feat(professional-dashboard): adiciona widget de agenda e disponibilidade"
```

---

### Task 5: `DashboardActiveContractsWidget`

**Files:**
- Create: `frontend/src/features/professional-dashboard/components/DashboardActiveContractsWidget.tsx`
- Test: `frontend/src/features/professional-dashboard/components/DashboardActiveContractsWidget.test.tsx`

**Interfaces:**
- Consumes: `useContracts()` (mesmo hook da Task 4). `Card`/`Skeleton`/`EmptyState` de `components/ui/`. `formatCurrency` de `frontend/src/lib/utils.ts`. `Link` de `react-router-dom`.
- Produces: `DashboardActiveContractsWidget` — componente sem props, renderizado pela `ProfessionalDashboardPage` (Task 8).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional-dashboard/components/DashboardActiveContractsWidget.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardActiveContractsWidget } from './DashboardActiveContractsWidget';
import { useContracts } from '../../contracts/queries';

vi.mock('../../contracts/queries', () => ({ useContracts: vi.fn() }));

describe('DashboardActiveContractsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista contratos ativos com valor total', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [
        { id: 'c1', status: 'active', total: 500, schedule: null },
        { id: 'c2', status: 'completed', total: 300, schedule: null },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<DashboardActiveContractsWidget />);

    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.queryByText('R$ 300,00')).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha contratos ativos', () => {
    vi.mocked(useContracts).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<DashboardActiveContractsWidget />);

    expect(screen.getByText('Nenhum contrato em andamento')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardActiveContractsWidget.test.tsx`
Esperado: FAIL com "Cannot find module './DashboardActiveContractsWidget'".

- [ ] **Step 3: Implementar**

Crie `frontend/src/features/professional-dashboard/components/DashboardActiveContractsWidget.tsx`:

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useContracts } from '../../contracts/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatCurrency } from '../../../lib/utils';

export function DashboardActiveContractsWidget(): JSX.Element {
  const { data, isPending } = useContracts();
  const active = (data ?? []).filter((contract) => contract.status === 'active');

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Serviços em andamento</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando serviços em andamento" />
      ) : active.length === 0 ? (
        <EmptyState title="Nenhum contrato em andamento" />
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((contract) => (
            <li key={contract.id}>
              <Link to={`/contracts/${contract.id}`} className="text-sm font-semibold text-primary">
                {formatCurrency(contract.total)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardActiveContractsWidget.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional-dashboard/components/DashboardActiveContractsWidget.tsx frontend/src/features/professional-dashboard/components/DashboardActiveContractsWidget.test.tsx
git commit -m "feat(professional-dashboard): adiciona widget de contratos em andamento"
```

---

### Task 6: `DashboardReviewsWidget`

**Files:**
- Create: `frontend/src/features/professional-dashboard/components/DashboardReviewsWidget.tsx`
- Test: `frontend/src/features/professional-dashboard/components/DashboardReviewsWidget.test.tsx`

**Interfaces:**
- Consumes: `useMyProfile()` de `frontend/src/features/professional/queries.ts` (para obter `profile.id`). `ReviewList` de `frontend/src/features/reviews/components/ReviewList.tsx` (`ReviewListProps = { professionalId: string }`, já existe, não modificar). `Card` de `components/ui/`.
- Produces: `DashboardReviewsWidget` — componente sem props, renderizado pela `ProfessionalDashboardPage` (Task 8).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional-dashboard/components/DashboardReviewsWidget.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardReviewsWidget } from './DashboardReviewsWidget';
import { useMyProfile } from '../../professional/queries';
import { useProfessionalReviews } from '../../reviews/queries';

vi.mock('../../professional/queries', () => ({ useMyProfile: vi.fn() }));
vi.mock('../../reviews/queries', () => ({ useProfessionalReviews: vi.fn() }));

describe('DashboardReviewsWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza a ReviewList com o id do proprio profissional', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);
    vi.mocked(useProfessionalReviews).mockReturnValue({
      data: {
        items: [{ id: 'r1', contractId: 'c1', authorId: 'u1', targetId: 'prof1', rating: 5, comment: 'Ótimo!', createdAt: '2026-01-01T00:00:00Z' }],
        page: 1,
        limit: 20,
        total: 1,
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardReviewsWidget />);

    expect(useProfessionalReviews).toHaveBeenCalledWith('prof1');
    expect(screen.getByText('Ótimo!')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardReviewsWidget.test.tsx`
Esperado: FAIL com "Cannot find module './DashboardReviewsWidget'".

- [ ] **Step 3: Implementar**

Crie `frontend/src/features/professional-dashboard/components/DashboardReviewsWidget.tsx`:

```tsx
import type { JSX } from 'react';
import { useMyProfile } from '../../professional/queries';
import { ReviewList } from '../../reviews/components/ReviewList';
import { Card } from '../../../components/ui/Card';

export function DashboardReviewsWidget(): JSX.Element {
  const { data: profile } = useMyProfile();

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Avaliações recentes</h2>
      {profile && <ReviewList professionalId={profile.id} />}
    </Card>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardReviewsWidget.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional-dashboard/components/DashboardReviewsWidget.tsx frontend/src/features/professional-dashboard/components/DashboardReviewsWidget.test.tsx
git commit -m "feat(professional-dashboard): adiciona widget de avaliacoes recentes"
```

---

### Task 7: `DashboardProfileSummaryCard`

**Files:**
- Create: `frontend/src/features/professional-dashboard/components/DashboardProfileSummaryCard.tsx`
- Test: `frontend/src/features/professional-dashboard/components/DashboardProfileSummaryCard.test.tsx`

**Interfaces:**
- Consumes: `useMyProfile()` de `frontend/src/features/professional/queries.ts` (`ProfessionalProfile = { headline: string; bio: string | null; ratingAverage: number; ratingCount: number; ... }`, de `frontend/src/features/professional/api.ts`). `Card`/`Skeleton` de `components/ui/`. `Link` de `react-router-dom`.
- Produces: `DashboardProfileSummaryCard` — componente sem props, renderizado pela `ProfessionalDashboardPage` (Task 8).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional-dashboard/components/DashboardProfileSummaryCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DashboardProfileSummaryCard } from './DashboardProfileSummaryCard';
import { useMyProfile } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useMyProfile: vi.fn() }));

describe('DashboardProfileSummaryCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra headline e nota media do proprio perfil', () => {
    vi.mocked(useMyProfile).mockReturnValue({
      data: {
        id: 'prof1',
        userId: 'u1',
        headline: 'Eletricista residencial',
        bio: 'Atendo emergencias',
        yearsExperience: 5,
        hourlyRate: 80,
        serviceRadiusKm: 20,
        ratingAverage: 4.5,
        ratingCount: 12,
        isAvailable: true,
        verifiedAt: null,
        createdAt: '2026-01-01T00:00:00Z',
      },
      isPending: false,
    } as never);

    renderWithProviders(<DashboardProfileSummaryCard />);

    expect(screen.getByText('Eletricista residencial')).toBeInTheDocument();
    expect(screen.getByText('4.5 (12)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute('href', '/professional/profile');
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: undefined, isPending: true } as never);

    renderWithProviders(<DashboardProfileSummaryCard />);

    expect(screen.getByRole('status', { name: 'Carregando perfil' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardProfileSummaryCard.test.tsx`
Esperado: FAIL com "Cannot find module './DashboardProfileSummaryCard'".

- [ ] **Step 3: Implementar**

Crie `frontend/src/features/professional-dashboard/components/DashboardProfileSummaryCard.tsx`:

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useMyProfile } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';

export function DashboardProfileSummaryCard(): JSX.Element {
  const { data: profile, isPending } = useMyProfile();

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Meu perfil</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando perfil" />
      ) : profile ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">{profile.headline}</p>
          <p className="text-sm text-muted">
            {profile.ratingAverage.toFixed(1)} ({profile.ratingCount})
          </p>
        </div>
      ) : null}
      <Link to="/professional/profile" className="mt-3 inline-block text-sm font-semibold text-primary">
        Editar perfil
      </Link>
    </Card>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/components/DashboardProfileSummaryCard.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional-dashboard/components/DashboardProfileSummaryCard.tsx frontend/src/features/professional-dashboard/components/DashboardProfileSummaryCard.test.tsx
git commit -m "feat(professional-dashboard): adiciona card de resumo do perfil"
```

---

### Task 8: Composição `ProfessionalDashboardPage` + correção de roteamento (`HomeRoute`, `router/index.tsx`)

**Files:**
- Create: `frontend/src/features/professional-dashboard/pages/ProfessionalDashboardPage.tsx`
- Delete: `frontend/src/features/professional/pages/ProfessionalDashboardPage.tsx` (substituída pela página nova — a página antiga empilhava os 4 formulários crus, que agora vivem em `ProfessionalProfileEditPage`, criada na Fase C)
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/pages/HomeRoute.tsx`
- Modify: `frontend/src/pages/HomeRoute.test.tsx`
- Test: `frontend/src/features/professional-dashboard/pages/ProfessionalDashboardPage.test.tsx`

**Interfaces:**
- Consumes: `DashboardQuickActions` (Task 2), `DashboardRevenueWidget` (Task 3), `DashboardAgendaWidget` (Task 4), `DashboardActiveContractsWidget` (Task 5), `DashboardReviewsWidget` (Task 6), `DashboardProfileSummaryCard` (Task 7) — todos sem props.
- Produces: `ProfessionalDashboardPage` (export nomeado e `default`), montada em `/professional/dashboard` e em `/` quando `role === 'professional'`.

**Nota importante:** a Fase C (Task 13) cria a rota `/professional/profile` e a `ProfessionalProfileEditPage`. Esta task NÃO cria essa rota — só remove a página antiga e aponta `/professional/dashboard` para a nova página de widgets. Se a Task 13 ainda não rodou quando esta task for revisada, o link "Editar perfil" vai apontar para uma rota que ainda não existe — isso é esperado e correto (a Fase C fecha o roteamento).

- [ ] **Step 1: Escrever o teste falho da página**

Crie `frontend/src/features/professional-dashboard/pages/ProfessionalDashboardPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalDashboardPage } from './ProfessionalDashboardPage';

vi.mock('../components/DashboardQuickActions', () => ({ DashboardQuickActions: () => <div>quick-actions</div> }));
vi.mock('../components/DashboardRevenueWidget', () => ({ DashboardRevenueWidget: () => <div>revenue-widget</div> }));
vi.mock('../components/DashboardAgendaWidget', () => ({ DashboardAgendaWidget: () => <div>agenda-widget</div> }));
vi.mock('../components/DashboardActiveContractsWidget', () => ({
  DashboardActiveContractsWidget: () => <div>active-contracts-widget</div>,
}));
vi.mock('../components/DashboardReviewsWidget', () => ({ DashboardReviewsWidget: () => <div>reviews-widget</div> }));
vi.mock('../components/DashboardProfileSummaryCard', () => ({
  DashboardProfileSummaryCard: () => <div>profile-summary-card</div>,
}));

describe('ProfessionalDashboardPage', () => {
  it('renderiza o titulo e todos os widgets', () => {
    renderWithProviders(<ProfessionalDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Painel', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('quick-actions')).toBeInTheDocument();
    expect(screen.getByText('revenue-widget')).toBeInTheDocument();
    expect(screen.getByText('agenda-widget')).toBeInTheDocument();
    expect(screen.getByText('active-contracts-widget')).toBeInTheDocument();
    expect(screen.getByText('reviews-widget')).toBeInTheDocument();
    expect(screen.getByText('profile-summary-card')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/pages/ProfessionalDashboardPage.test.tsx`
Esperado: FAIL com "Cannot find module './ProfessionalDashboardPage'".

- [ ] **Step 3: Implementar a página**

Crie `frontend/src/features/professional-dashboard/pages/ProfessionalDashboardPage.tsx`:

```tsx
import type { JSX } from 'react';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DashboardRevenueWidget } from '../components/DashboardRevenueWidget';
import { DashboardAgendaWidget } from '../components/DashboardAgendaWidget';
import { DashboardActiveContractsWidget } from '../components/DashboardActiveContractsWidget';
import { DashboardReviewsWidget } from '../components/DashboardReviewsWidget';
import { DashboardProfileSummaryCard } from '../components/DashboardProfileSummaryCard';

export function ProfessionalDashboardPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">Painel</h1>
        <DashboardQuickActions />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardRevenueWidget />
        <DashboardAgendaWidget />
        <DashboardActiveContractsWidget />
        <DashboardProfileSummaryCard />
        <DashboardReviewsWidget />
      </div>
    </div>
  );
}

export default ProfessionalDashboardPage;
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional-dashboard/pages/ProfessionalDashboardPage.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Remover a página antiga e atualizar o roteamento**

Remova o arquivo antigo:

```bash
git rm frontend/src/features/professional/pages/ProfessionalDashboardPage.tsx
```

Em `frontend/src/router/index.tsx`, troque o import:

```ts
import ProfessionalDashboardPage from '../features/professional/pages/ProfessionalDashboardPage';
```

por:

```ts
import ProfessionalDashboardPage from '../features/professional-dashboard/pages/ProfessionalDashboardPage';
```

A rota `{ path: '/professional/dashboard', element: <ProfessionalDashboardPage /> }` já existe dentro do grupo `<ProtectedRoute />` — não precisa mudar a linha da rota, só o import.

- [ ] **Step 6: Corrigir `HomeRoute` para redirecionar profissionais**

Leia `frontend/src/pages/HomeRoute.tsx` (arquivo atual):

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

Substitua por:

```tsx
import type { JSX } from 'react';
import { useAuthStore } from '../stores/auth';
import LandingPage from '../features/landing/pages/LandingPage';
import { ClientDashboardPage } from '../features/dashboard/pages/ClientDashboardPage';
import { ProfessionalDashboardPage } from '../features/professional-dashboard/pages/ProfessionalDashboardPage';

export function HomeRoute(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'client') {
    return <ClientDashboardPage />;
  }

  if (user?.role === 'professional') {
    return <ProfessionalDashboardPage />;
  }

  return <LandingPage />;
}
```

- [ ] **Step 7: Atualizar o teste de `HomeRoute`**

Em `frontend/src/pages/HomeRoute.test.tsx`, adicione o mock da nova página e troque o teste que hoje espera `LandingPage` para profissional:

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
vi.mock('../features/professional-dashboard/pages/ProfessionalDashboardPage', () => ({
  ProfessionalDashboardPage: () => <div>professional-dashboard</div>,
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

  it('renderiza o ProfessionalDashboardPage para usuario com papel professional', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('professional-dashboard')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Rodar a suíte completa do frontend**

Rode: `cd frontend && npx vitest run`
Esperado: todos os testes passam, incluindo `HomeRoute.test.tsx`, `ProfessionalDashboardPage.test.tsx` e os 6 widgets das Tasks 2-7. Nenhum teste deve falhar por causa da remoção do arquivo antigo (confirme rodando um grep: `grep -rn "professional/pages/ProfessionalDashboardPage" frontend/src` não deve retornar nada além do próprio arquivo deletado).

- [ ] **Step 9: Rodar typecheck e lint**

Rode: `cd frontend && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: sem erros.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(professional-dashboard): compoe pagina do painel profissional e corrige redirecionamento do HomeRoute"
```
