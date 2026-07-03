## Fase C — Admin (Tasks 5-7)

### Task 5: Restilizar `ReportsTable` com `Modal` de confirmação e nota

**Files:**
- Modify: `frontend/src/features/admin/components/ReportsTable.tsx`
- Test: `frontend/src/features/admin/components/ReportsTable.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `useReports()`, `useResolveReport()` de `frontend/src/features/admin/queries.ts` (já existentes — `useResolveReport().mutate({ id, resolution, note })`, `note` já é `string | undefined` no tipo, sem mudança de assinatura). `ReportResolution` de `frontend/src/features/admin/schemas.ts` (`'reviewed' | 'dismissed' | 'actioned'`). `Badge`, `Button`, `Modal` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova exportada — só estilo interno e um `Modal` de confirmação local ao componente.

- [ ] **Step 1: Escrever os testes falhos**

Crie `frontend/src/features/admin/components/ReportsTable.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsTable } from './ReportsTable';
import { useReports, useResolveReport } from '../queries';

vi.mock('../queries', () => ({ useReports: vi.fn(), useResolveReport: vi.fn() }));

function reportsFixture() {
  return {
    data: {
      items: [{ id: 'r1', status: 'pending' as const }],
      page: 1, limit: 20, total: 1,
    },
    isLoading: false,
  };
}

describe('ReportsTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra badge urgente para denuncia pendente', () => {
    vi.mocked(useReports).mockReturnValue(reportsFixture() as never);
    vi.mocked(useResolveReport).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<ReportsTable />);

    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('abre modal de confirmacao e cancela sem disparar mutation', async () => {
    const mutate = vi.fn();
    vi.mocked(useReports).mockReturnValue(reportsFixture() as never);
    vi.mocked(useResolveReport).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<ReportsTable />);
    await user.click(screen.getByRole('button', { name: 'Aplicar ação' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirma resolucao com nota preenchida', async () => {
    const mutate = vi.fn();
    vi.mocked(useReports).mockReturnValue(reportsFixture() as never);
    vi.mocked(useResolveReport).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<ReportsTable />);
    await user.click(screen.getByRole('button', { name: 'Aplicar ação' }));
    await user.type(screen.getByLabelText('Nota (opcional)'), 'Conteudo verificado');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mutate).toHaveBeenCalledWith({ id: 'r1', resolution: 'actioned', note: 'Conteudo verificado' });
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/admin/components/ReportsTable.test.tsx`
Esperado: FAIL — a implementação atual mostra `report.status` cru (ex: `"pending"`), não o rótulo `"Pendente"`, e dispara `resolve.mutate` direto no clique sem `Modal`/nota.

- [ ] **Step 3: Restilizar `ReportsTable.tsx`**

Substitua o conteúdo de `frontend/src/features/admin/components/ReportsTable.tsx`:
```tsx
import { useState, type JSX } from 'react';
import { useReports, useResolveReport } from '../queries';
import type { ReportResolution, ReportStatus } from '../schemas';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendente',
  reviewed: 'Revisada',
  dismissed: 'Descartada',
  actioned: 'Ação aplicada',
};

const PENDING_STATUSES: ReportStatus[] = ['pending'];

interface PendingAction {
  id: string;
  resolution: ReportResolution;
  label: string;
}

export function ReportsTable(): JSX.Element {
  const reports = useReports();
  const resolve = useResolveReport();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');

  if (reports.isLoading || !reports.data) {
    return <p className="text-sm text-muted">Carregando denúncias...</p>;
  }

  if (reports.data.items.length === 0) {
    return <p className="text-sm text-muted">Nenhuma denúncia pendente.</p>;
  }

  function openAction(id: string, resolution: ReportResolution, label: string) {
    setNote('');
    setPendingAction({ id, resolution, label });
  }

  function closeAction() {
    setPendingAction(null);
  }

  function confirmAction() {
    if (!pendingAction) return;
    resolve.mutate({ id: pendingAction.id, resolution: pendingAction.resolution, note: note || undefined });
    setPendingAction(null);
  }

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="py-2">Denúncia</th>
            <th className="py-2">Status</th>
            <th className="py-2">Ação</th>
          </tr>
        </thead>
        <tbody>
          {reports.data.items.map((report) => (
            <tr key={report.id} className="border-t border-surface">
              <td className="py-2 text-ink">{report.id}</td>
              <td className="py-2">
                <Badge tone={PENDING_STATUSES.includes(report.status) ? 'urgent' : 'neutral'}>
                  {STATUS_LABELS[report.status]}
                </Badge>
              </td>
              <td className="space-x-3 py-2">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(report.id, 'actioned', 'Aplicar ação')}
                >
                  Aplicar ação
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(report.id, 'dismissed', 'Descartar')}
                >
                  Descartar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingAction && (
        <Modal open onClose={closeAction} title={pendingAction.label}>
          <div className="flex flex-col gap-3">
            <label htmlFor="report-note" className="flex flex-col gap-1">
              <span className="text-sm text-muted">Nota (opcional)</span>
              <textarea
                id="report-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="rounded-sm border border-surface px-3 py-2 text-ink"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeAction}>
                Cancelar
              </Button>
              <Button type="button" variant="accent" disabled={resolve.isPending} onClick={confirmAction}>
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default ReportsTable;
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/admin/components/ReportsTable.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/admin/components/ReportsTable.tsx frontend/src/features/admin/components/ReportsTable.test.tsx
git commit -m "style(admin): restiliza ReportsTable com modal de confirmacao e nota"
```

---

### Task 6: Restilizar `DisputesTable` com `Modal` de confirmação e nota

**Files:**
- Modify: `frontend/src/features/admin/components/DisputesTable.tsx`
- Test: `frontend/src/features/admin/components/DisputesTable.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `useDisputes()`, `useResolveDispute()` de `frontend/src/features/admin/queries.ts` (já existentes — `useResolveDispute().mutate({ id, outcome, note })`, `note` é `string` obrigatório no tipo). `DisputeOutcome`, `DisputeStatus` de `frontend/src/features/admin/schemas.ts`. `Badge`, `Button`, `Modal` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova exportada — só estilo interno e um `Modal` de confirmação local ao componente.

- [ ] **Step 1: Escrever os testes falhos**

Crie `frontend/src/features/admin/components/DisputesTable.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputesTable } from './DisputesTable';
import { useDisputes, useResolveDispute } from '../queries';

vi.mock('../queries', () => ({ useDisputes: vi.fn(), useResolveDispute: vi.fn() }));

function disputesFixture() {
  return {
    data: {
      items: [{ id: 'd1', status: 'open' as const, outcome: null }],
      page: 1, limit: 20, total: 1,
    },
    isLoading: false,
  };
}

describe('DisputesTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra badge urgente para disputa aberta', () => {
    vi.mocked(useDisputes).mockReturnValue(disputesFixture() as never);
    vi.mocked(useResolveDispute).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<DisputesTable />);

    expect(screen.getByText('Aberta')).toBeInTheDocument();
  });

  it('abre modal com nota obrigatoria e nao confirma sem preencher', async () => {
    const mutate = vi.fn();
    vi.mocked(useDisputes).mockReturnValue(disputesFixture() as never);
    vi.mocked(useResolveDispute).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<DisputesTable />);
    await user.click(screen.getByRole('button', { name: 'Reembolsar cliente' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('confirma resolucao apos preencher a nota', async () => {
    const mutate = vi.fn();
    vi.mocked(useDisputes).mockReturnValue(disputesFixture() as never);
    vi.mocked(useResolveDispute).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<DisputesTable />);
    await user.click(screen.getByRole('button', { name: 'Liberar profissional' }));
    await user.type(screen.getByLabelText('Nota'), 'Evidencias confirmam entrega');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mutate).toHaveBeenCalledWith({
      id: 'd1',
      outcome: 'release_professional',
      note: 'Evidencias confirmam entrega',
    });
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/admin/components/DisputesTable.test.tsx`
Esperado: FAIL — a implementação atual mostra `dispute.status` cru e dispara `resolve.mutate` direto no clique com nota fixa no código, sem `Modal`.

- [ ] **Step 3: Restilizar `DisputesTable.tsx`**

Substitua o conteúdo de `frontend/src/features/admin/components/DisputesTable.tsx`:
```tsx
import { useState, type JSX } from 'react';
import { useDisputes, useResolveDispute } from '../queries';
import type { DisputeOutcome, DisputeStatus } from '../schemas';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Aberta',
  under_review: 'Em revisão',
  resolved: 'Resolvida',
  rejected: 'Rejeitada',
};

const PENDING_STATUSES: DisputeStatus[] = ['open', 'under_review'];

interface PendingAction {
  id: string;
  outcome: DisputeOutcome;
  label: string;
}

export function DisputesTable(): JSX.Element {
  const disputes = useDisputes();
  const resolve = useResolveDispute();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');

  if (disputes.isLoading || !disputes.data) {
    return <p className="text-sm text-muted">Carregando disputas...</p>;
  }

  if (disputes.data.items.length === 0) {
    return <p className="text-sm text-muted">Nenhuma disputa em aberto.</p>;
  }

  function openAction(id: string, outcome: DisputeOutcome, label: string) {
    setNote('');
    setPendingAction({ id, outcome, label });
  }

  function closeAction() {
    setPendingAction(null);
  }

  function confirmAction() {
    if (!pendingAction || !note.trim()) return;
    resolve.mutate({ id: pendingAction.id, outcome: pendingAction.outcome, note });
    setPendingAction(null);
  }

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="py-2">Disputa</th>
            <th className="py-2">Status</th>
            <th className="py-2">Ação</th>
          </tr>
        </thead>
        <tbody>
          {disputes.data.items.map((dispute) => (
            <tr key={dispute.id} className="border-t border-surface">
              <td className="py-2 text-ink">{dispute.id}</td>
              <td className="py-2">
                <Badge tone={PENDING_STATUSES.includes(dispute.status) ? 'urgent' : 'neutral'}>
                  {STATUS_LABELS[dispute.status]}
                </Badge>
              </td>
              <td className="space-x-3 py-2">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(dispute.id, 'refund_client', 'Reembolsar cliente')}
                >
                  Reembolsar cliente
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(dispute.id, 'release_professional', 'Liberar profissional')}
                >
                  Liberar profissional
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => openAction(dispute.id, 'split', 'Dividir')}
                >
                  Dividir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingAction && (
        <Modal open onClose={closeAction} title={pendingAction.label}>
          <div className="flex flex-col gap-3">
            <label htmlFor="dispute-note" className="flex flex-col gap-1">
              <span className="text-sm text-muted">Nota</span>
              <textarea
                id="dispute-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="rounded-sm border border-surface px-3 py-2 text-ink"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeAction}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={resolve.isPending || !note.trim()}
                onClick={confirmAction}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default DisputesTable;
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/admin/components/DisputesTable.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/admin/components/DisputesTable.tsx frontend/src/features/admin/components/DisputesTable.test.tsx
git commit -m "style(admin): restiliza DisputesTable com modal de confirmacao e nota obrigatoria"
```

---

### Task 7: Restilizar `AdminDashboardPage`

**Files:**
- Modify: `frontend/src/features/admin/pages/AdminDashboardPage.tsx`
- Test: `frontend/src/features/admin/pages/AdminDashboardPage.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `ReportsTable` (Task 5), `DisputesTable` (Task 6) — nenhuma prop, mesmo uso de hoje. `Card` de `components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/admin/pages/AdminDashboardPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminDashboardPage } from './AdminDashboardPage';

vi.mock('../components/ReportsTable', () => ({ ReportsTable: () => <div>reports-table</div> }));
vi.mock('../components/DisputesTable', () => ({ DisputesTable: () => <div>disputes-table</div> }));

describe('AdminDashboardPage', () => {
  it('mostra titulo, secao de denuncias e secao de disputas dentro de cards', () => {
    render(<AdminDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Moderação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Denúncias' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Disputas' })).toBeInTheDocument();
    expect(screen.getByText('reports-table')).toBeInTheDocument();
    expect(screen.getByText('disputes-table')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar a baseline**

Rode: `cd frontend && npx vitest run src/features/admin/pages/AdminDashboardPage.test.tsx`
Esperado: PASS (1/1) já com a implementação atual — esta task só muda classes/estrutura visual (`rounded-2xl bg-white shadow` vira `Card`), não os textos nem os componentes filhos. O teste serve de rede de segurança.

- [ ] **Step 3: Restilizar `AdminDashboardPage.tsx`**

Substitua o conteúdo de `frontend/src/features/admin/pages/AdminDashboardPage.tsx`:
```tsx
import type { JSX } from 'react';
import { ReportsTable } from '../components/ReportsTable';
import { DisputesTable } from '../components/DisputesTable';
import { Card } from '../../../components/ui/Card';

export function AdminDashboardPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold text-ink">Moderação</h1>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Denúncias</h2>
        <ReportsTable />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">Disputas</h2>
        <DisputesTable />
      </Card>
    </div>
  );
}

export default AdminDashboardPage;
```

- [ ] **Step 4: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/admin/pages/AdminDashboardPage.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/admin/pages/AdminDashboardPage.tsx frontend/src/features/admin/pages/AdminDashboardPage.test.tsx
git commit -m "style(admin): restiliza AdminDashboardPage com cards da fase 1"
```

---
