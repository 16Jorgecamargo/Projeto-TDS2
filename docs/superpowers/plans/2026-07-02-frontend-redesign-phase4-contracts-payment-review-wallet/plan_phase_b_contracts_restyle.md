# Fase B — Camada de Dados de Contratos + Restilização (Lista, Progresso, Disputa)

Ver `plan_index.md` para Global Constraints. Depende só da Task 1 (Fase A) — o backend já retorna `clientName`/`professionalHeadline`/`professionalUserId`.

### Task 2: Atualizar `Contract` type no frontend + adicionar `startContract`

**Files:**
- Modify: `frontend/src/features/contracts/api.ts`
- Modify: `frontend/src/features/contracts/queries.ts`
- Test: `frontend/src/features/contracts/api.test.ts` (novo)
- Test: `frontend/src/features/contracts/queries.test.tsx` (novo)

**Interfaces:**
- Consumes: `http` de `frontend/src/lib/http.ts` (já existe, sem mudança).
- Produces: `Contract` (tipo exportado) ganha `clientName: string`, `professionalHeadline: string`, `professionalUserId: string`. `startContract(id: string): Promise<Contract>` e `useStartContract(id: string)` — usados pela Fase F na composição final da página de detalhe.

- [ ] **Step 1: Escrever o teste falho da API**

Crie `frontend/src/features/contracts/api.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { startContract } from './api';

vi.mock('../../lib/http', () => ({ http: { get: vi.fn(), post: vi.fn() } }));

describe('contracts api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inicia o contrato via POST /contracts/:id/start', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: {
        id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'u1', professionalId: 'p1',
        total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
        startedAt: '2026-07-01T00:00:00Z', completedAt: null, cancelledAt: null, schedule: null,
        clientName: 'Maria Cliente', professionalHeadline: 'Eletricista', professionalUserId: 'pu1',
        createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await startContract('c1');

    expect(http.post).toHaveBeenCalledWith('/contracts/c1/start', {});
    expect(result.startedAt).toBe('2026-07-01T00:00:00Z');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/api.test.ts`
Esperado: FAIL com "startContract não é uma função exportada" ou erro de tipo — `startContract` ainda não existe em `api.ts`.

- [ ] **Step 3: Atualizar `frontend/src/features/contracts/api.ts`**

Substitua o arquivo inteiro por:
```ts
import { http } from '../../lib/http';

export type ContractStatus = 'active' | 'completed' | 'cancelled' | 'disputed';

export type ScheduleStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export interface Schedule {
  id: string;
  scheduledDate: string;
  durationMinutes: number | null;
  notes: string | null;
  status: ScheduleStatus;
}

export interface Contract {
  id: string;
  demandId: string;
  quoteId: string;
  clientId: string;
  professionalId: string;
  total: number;
  status: ContractStatus;
  cancelledBy: string | null;
  cancellationReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  schedule: Schedule | null;
  clientName: string;
  professionalHeadline: string;
  professionalUserId: string;
  createdAt: string;
}

export interface ProgressUpdate {
  id: string;
  contractId: string;
  authorId: string;
  description: string;
  percentage: number | null;
  images: string[];
  createdAt: string;
}

export async function fetchContracts(): Promise<Contract[]> {
  const { data } = await http.get<Contract[]>('/contracts');
  return data;
}

export async function fetchContract(id: string): Promise<Contract> {
  const { data } = await http.get<Contract>(`/contracts/${id}`);
  return data;
}

export async function fetchProgress(id: string): Promise<ProgressUpdate[]> {
  const { data } = await http.get<ProgressUpdate[]>(`/contracts/${id}/progress`);
  return data;
}

export async function addProgress(
  id: string,
  values: { description: string; percentage: number },
): Promise<ProgressUpdate> {
  const { data } = await http.post<ProgressUpdate>(`/contracts/${id}/progress`, { ...values, images: [] });
  return data;
}

export async function startContract(id: string): Promise<Contract> {
  const { data } = await http.post<Contract>(`/contracts/${id}/start`, {});
  return data;
}

export async function completeContract(id: string): Promise<Contract> {
  const { data } = await http.post<Contract>(`/contracts/${id}/complete`, {});
  return data;
}

export async function openDispute(id: string, reason: string): Promise<void> {
  await http.post(`/contracts/${id}/disputes`, { reason });
}
```

- [ ] **Step 4: Rodar teste da API para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/api.test.ts`
Esperado: PASS (1/1).

- [ ] **Step 5: Escrever o teste falho do hook**

Crie `frontend/src/features/contracts/queries.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { startContract } from './api';
import { useStartContract } from './queries';

vi.mock('./api', () => ({
  fetchContracts: vi.fn(),
  fetchContract: vi.fn(),
  fetchProgress: vi.fn(),
  addProgress: vi.fn(),
  startContract: vi.fn(),
  completeContract: vi.fn(),
  openDispute: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useStartContract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama startContract com o id do contrato', async () => {
    vi.mocked(startContract).mockResolvedValue({
      id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'u1', professionalId: 'p1',
      total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
      startedAt: '2026-07-01T00:00:00Z', completedAt: null, cancelledAt: null, schedule: null,
      clientName: 'Maria Cliente', professionalHeadline: 'Eletricista', professionalUserId: 'pu1',
      createdAt: '2026-07-01T00:00:00Z',
    });

    const { result } = renderHook(() => useStartContract('c1'), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(startContract).toHaveBeenCalledWith('c1');
  });
});
```

- [ ] **Step 6: Rodar teste do hook para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/queries.test.tsx`
Esperado: FAIL — `useStartContract` ainda não existe em `queries.ts`.

- [ ] **Step 7: Atualizar `frontend/src/features/contracts/queries.ts`**

Substitua o arquivo inteiro por:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchContracts,
  fetchContract,
  fetchProgress,
  addProgress,
  startContract,
  completeContract,
  openDispute,
} from './api';

export const contractKeys = {
  all: ['contracts'] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
  progress: (id: string) => ['contracts', id, 'progress'] as const,
};

export function useContracts() {
  return useQuery({ queryKey: contractKeys.all, queryFn: fetchContracts });
}

export function useContract(id: string) {
  return useQuery({ queryKey: contractKeys.detail(id), queryFn: () => fetchContract(id), enabled: !!id });
}

export function useContractProgress(id: string) {
  return useQuery({ queryKey: contractKeys.progress(id), queryFn: () => fetchProgress(id), enabled: !!id });
}

export function useAddProgress(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: { description: string; percentage: number }) => addProgress(id, values),
    onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.progress(id) }),
  });
}

export function useStartContract(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => startContract(id),
    onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  });
}

export function useCompleteContract(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => completeContract(id),
    onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  });
}

export function useOpenDispute(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => openDispute(id, reason),
    onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  });
}
```

- [ ] **Step 8: Rodar teste do hook para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/queries.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 9: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa — confirme especialmente que `frontend/src/features/contracts/contracts.test.tsx` (teste existente de `ContractProgress`) continua passando, já que `ProgressUpdate` não mudou.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/features/contracts/api.ts frontend/src/features/contracts/queries.ts frontend/src/features/contracts/api.test.ts frontend/src/features/contracts/queries.test.tsx
git commit -m "feat(contracts): adiciona campos de nome das partes e inicio de contrato"
```

---

### Task 3: Restilizar `ContractListPage`

**Files:**
- Modify: `frontend/src/features/contracts/pages/ContractListPage.tsx`
- Test: `frontend/src/features/contracts/pages/ContractListPage.test.tsx` (novo)

**Interfaces:**
- Consumes: `useContracts()` (Task 2, sem mudança de assinatura), `useAuthStore` de `frontend/src/stores/auth.ts` (`AuthUser = { id: string; role: Role; name?: string; email?: string }`, `Role = 'client' | 'professional' | 'admin'`). `Badge`, `Skeleton`, `EmptyState` de `frontend/src/components/ui/`. `formatCurrency` de `frontend/src/lib/utils.ts`. `XCircleIcon` de `@heroicons/react/24/solid` (mesmo padrão já usado em `DemandCard.tsx` pra distinguir status "cancelado").
- Produces: nenhuma mudança de interface pública — mesma página, montada na mesma rota `/contracts`.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/contracts/pages/ContractListPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import ContractListPage from './ContractListPage';
import { useContracts } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('../queries', () => ({ useContracts: vi.fn() }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function contractFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'u1', professionalId: 'p1',
    total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
    startedAt: null, completedAt: null, cancelledAt: null, schedule: null,
    clientName: 'Maria Cliente', professionalHeadline: 'Eletricista Residencial', professionalUserId: 'pu1',
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContractListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  it('mostra estado vazio quando nao ha contratos', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    vi.mocked(useContracts).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<ContractListPage />);

    expect(screen.getByText('Nenhum contrato ainda')).toBeInTheDocument();
  });

  it('cliente ve o headline do profissional em cada contrato', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    vi.mocked(useContracts).mockReturnValue({ data: [contractFixture()], isPending: false } as never);

    renderWithProviders(<ContractListPage />);

    expect(screen.getByText('Eletricista Residencial')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('profissional ve o nome do cliente em cada contrato', () => {
    useAuthStore.getState().setAuth({ id: 'pu1', role: 'professional' }, 'token');
    vi.mocked(useContracts).mockReturnValue({
      data: [contractFixture({ status: 'completed', startedAt: '2026-07-01T00:00:00Z', completedAt: '2026-07-02T00:00:00Z' })],
      isPending: false,
    } as never);

    renderWithProviders(<ContractListPage />);

    expect(screen.getByText('Maria Cliente')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('navega para o detalhe ao clicar no card', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token');
    vi.mocked(useContracts).mockReturnValue({ data: [contractFixture()], isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractListPage />);
    await user.click(screen.getByText('Eletricista Residencial'));

    expect(navigateMock).toHaveBeenCalledWith('/contracts/c1');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/pages/ContractListPage.test.tsx`
Esperado: FAIL — a página atual não usa `useAuthStore`, não renderiza `Badge`/`EmptyState`, e o texto "Nenhum contrato ainda"/"Ativo"/"Concluído" não existe na versão atual.

- [ ] **Step 3: Implementar**

Substitua `frontend/src/features/contracts/pages/ContractListPage.tsx` inteiro por:
```tsx
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { useContracts } from '../queries';
import { useAuthStore } from '../../../stores/auth';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatCurrency } from '../../../lib/utils';
import type { Contract, ContractStatus } from '../api';

const STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  disputed: 'Em disputa',
};

function ContractListItem({
  contract,
  otherPartyName,
  onOpen,
}: {
  contract: Contract;
  otherPartyName: string;
  onOpen: (id: string) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(contract.id)}
      className="flex w-full flex-col gap-2 rounded-lg bg-surface p-4 text-left hover:shadow-hover"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-ink">{otherPartyName}</span>
        <Badge tone={contract.status === 'disputed' ? 'urgent' : 'neutral'}>
          <span className="flex items-center gap-1">
            {contract.status === 'cancelled' && (
              <XCircleIcon className="h-3.5 w-3.5 text-muted" data-testid="contract-cancelled-icon" />
            )}
            {STATUS_LABELS[contract.status]}
          </span>
        </Badge>
      </div>
      <span className="text-sm text-muted">{formatCurrency(contract.total)}</span>
    </button>
  );
}

export default function ContractListPage(): JSX.Element {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const { data, isPending } = useContracts();

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold text-ink">Contratos</h1>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando contratos" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum contrato ainda" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((contract) => (
            <ContractListItem
              key={contract.id}
              contract={contract}
              otherPartyName={role === 'professional' ? contract.clientName : contract.professionalHeadline}
              onOpen={(id) => navigate(`/contracts/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/pages/ContractListPage.test.tsx`
Esperado: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/contracts/pages/ContractListPage.tsx frontend/src/features/contracts/pages/ContractListPage.test.tsx
git commit -m "style(contracts): restiliza ContractListPage com tokens da fase 1"
```

---

### Task 4: Restilizar `ContractProgress` e `ProgressUpdateForm`

**Files:**
- Modify: `frontend/src/features/contracts/components/ContractProgress.tsx`
- Modify: `frontend/src/features/contracts/components/ProgressUpdateForm.tsx`
- Test: `frontend/src/features/contracts/components/ProgressUpdateForm.test.tsx` (novo)

**Interfaces:**
- Consumes: `EmptyState` de `components/ui/`, `formatDate` de `lib/utils.ts`, `Button` de `components/ui/`. `progressFormSchema`/`ProgressFormValues` de `../schemas` (já existem, sem mudança).
- Produces: nenhuma mudança de interface pública — mesmos componentes, mesmas props (`ContractProgressProps = { updates: ProgressUpdate[] }`, `ProgressUpdateFormProps = { onSubmit: (values: ProgressFormValues) => void; submitting?: boolean }`).

O teste já existente `frontend/src/features/contracts/contracts.test.tsx` cobre `ContractProgress` e **não deve ser modificado** — a restilização preserva os textos que ele verifica (`'Fase 1'`, `'50%'`, `'Fase sem percentual'`, ausência de `'%'` sozinho).

- [ ] **Step 1: Rodar o teste existente de `ContractProgress` ANTES da mudança (baseline)**

Rode: `cd frontend && npx vitest run src/features/contracts/contracts.test.tsx`
Esperado: PASS (2/2) — baseline verde antes de mexer no componente.

- [ ] **Step 2: Restilizar `ContractProgress.tsx`**

Substitua o arquivo inteiro por:
```tsx
import type { JSX } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/utils';
import type { ProgressUpdate } from '../api';

interface ContractProgressProps {
  updates: ProgressUpdate[];
}

export function ContractProgress({ updates }: ContractProgressProps): JSX.Element {
  if (updates.length === 0) {
    return <EmptyState title="Nenhuma atualização de progresso ainda" />;
  }

  return (
    <ol className="flex flex-col gap-2">
      {updates.map((update) => (
        <li key={update.id} className="rounded-lg bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{update.description}</span>
            {update.percentage !== null && <span className="text-sm text-muted">{update.percentage}%</span>}
          </div>
          <span className="text-xs text-muted">{formatDate(update.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 3: Rodar o teste existente de `ContractProgress` DEPOIS da mudança**

Rode: `cd frontend && npx vitest run src/features/contracts/contracts.test.tsx`
Esperado: PASS (2/2) — os mesmos 2 testes continuam passando sem alteração.

- [ ] **Step 4: Escrever o teste falho de `ProgressUpdateForm`**

Crie `frontend/src/features/contracts/components/ProgressUpdateForm.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressUpdateForm } from './ProgressUpdateForm';

describe('ProgressUpdateForm', () => {
  it('envia descricao e percentual ao submeter', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ProgressUpdateForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Descrição do progresso'), 'Fase 1 concluida');
    const percentageInput = screen.getByLabelText('Percentual concluído');
    await user.clear(percentageInput);
    await user.type(percentageInput, '50');
    await user.click(screen.getByRole('button', { name: 'Registrar progresso' }));

    expect(onSubmit).toHaveBeenCalledWith({ description: 'Fase 1 concluida', percentage: 50 });
  });

  it('desabilita o botao quando submitting', () => {
    render(<ProgressUpdateForm onSubmit={vi.fn()} submitting />);
    expect(screen.getByRole('button', { name: 'Registrar progresso' })).toBeDisabled();
  });
});
```

- [ ] **Step 5: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/components/ProgressUpdateForm.test.tsx`
Esperado: FAIL — os campos hoje não têm `id`/`htmlFor` (`getByLabelText` não encontra), e o botão não usa o componente `Button`.

- [ ] **Step 6: Restilizar `ProgressUpdateForm.tsx`**

Substitua o arquivo inteiro por:
```tsx
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { progressFormSchema, type ProgressFormValues } from '../schemas';
import { Button } from '../../../components/ui/Button';

interface ProgressUpdateFormProps {
  onSubmit: (values: ProgressFormValues) => void;
  submitting?: boolean;
}

export function ProgressUpdateForm({ onSubmit, submitting }: ProgressUpdateFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProgressFormValues>({
    resolver: zodResolver(progressFormSchema),
    defaultValues: { description: '', percentage: 0 },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onSubmit(values);
        reset();
      })}
      className="flex flex-col gap-2 rounded-lg bg-surface p-3"
    >
      <label htmlFor="progress-description" className="flex flex-col gap-1">
        <span className="text-sm text-muted">Descrição do progresso</span>
        <textarea
          id="progress-description"
          {...register('description')}
          rows={3}
          className="rounded-sm border border-surface px-3 py-2 text-ink"
        />
      </label>
      {errors.description && <span className="text-xs text-accent">{errors.description.message}</span>}
      <label htmlFor="progress-percentage" className="flex flex-col gap-1">
        <span className="text-sm text-muted">Percentual concluído</span>
        <input
          id="progress-percentage"
          type="number"
          {...register('percentage')}
          className="rounded-sm border border-surface px-3 py-2 text-ink"
        />
      </label>
      {errors.percentage && <span className="text-xs text-accent">{errors.percentage.message}</span>}
      <Button type="submit" disabled={submitting}>
        Registrar progresso
      </Button>
    </form>
  );
}
```

- [ ] **Step 7: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/components/ProgressUpdateForm.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 8: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/contracts/components/ContractProgress.tsx frontend/src/features/contracts/components/ProgressUpdateForm.tsx frontend/src/features/contracts/components/ProgressUpdateForm.test.tsx
git commit -m "style(contracts): restiliza ContractProgress e ProgressUpdateForm com tokens da fase 1"
```

---

### Task 5: Restilizar `DisputeDialog`

**Files:**
- Modify: `frontend/src/features/contracts/components/DisputeDialog.tsx`
- Test: `frontend/src/features/contracts/components/DisputeDialog.test.tsx` (novo)

**Interfaces:**
- Consumes: `Modal` de `frontend/src/components/ui/Modal.tsx` (`ModalProps = { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }`), `Button` de `components/ui/`. `useOpenDispute` de `../queries` (já existe, sem mudança). `disputeFormSchema`/`DisputeFormValues` de `../schemas` (já existem).
- Produces: nenhuma mudança de interface pública — `DisputeDialogProps = { contractId: string; onClose: () => void }`, sempre montado condicionalmente pelo componente pai (igual já acontece hoje em `ContractDetailPage`).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/contracts/components/DisputeDialog.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DisputeDialog } from './DisputeDialog';
import { useOpenDispute } from '../queries';

vi.mock('../queries', () => ({ useOpenDispute: vi.fn() }));

describe('DisputeDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('abre disputa com o motivo informado', async () => {
    const mutate = vi.fn((_reason, opts) => opts?.onSuccess?.());
    vi.mocked(useOpenDispute).mockReturnValue({ mutate, isPending: false } as never);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<DisputeDialog contractId="c1" onClose={onClose} />);

    await user.type(screen.getByLabelText('Motivo'), 'Servico nao foi concluido conforme combinado');
    await user.click(screen.getByRole('button', { name: 'Abrir disputa' }));

    expect(mutate).toHaveBeenCalledWith(
      'Servico nao foi concluido conforme combinado',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('fecha ao clicar em cancelar', async () => {
    vi.mocked(useOpenDispute).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<DisputeDialog contractId="c1" onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/components/DisputeDialog.test.tsx`
Esperado: FAIL — o campo hoje não tem `id`/`htmlFor` com label "Motivo" associável via `getByLabelText`, e o diálogo hoje não usa `Modal`.

- [ ] **Step 3: Implementar**

Substitua `frontend/src/features/contracts/components/DisputeDialog.tsx` inteiro por:
```tsx
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { disputeFormSchema, type DisputeFormValues } from '../schemas';
import { useOpenDispute } from '../queries';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface DisputeDialogProps {
  contractId: string;
  onClose: () => void;
}

export function DisputeDialog({ contractId, onClose }: DisputeDialogProps): JSX.Element {
  const dispute = useOpenDispute(contractId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: { reason: '' },
  });

  return (
    <Modal open onClose={onClose} title="Abrir disputa">
      <form
        onSubmit={handleSubmit((values) => dispute.mutate(values.reason, { onSuccess: onClose }))}
        className="flex flex-col gap-3"
      >
        <label htmlFor="dispute-reason" className="flex flex-col gap-1">
          <span className="text-sm text-muted">Motivo</span>
          <textarea
            id="dispute-reason"
            {...register('reason')}
            rows={4}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        {errors.reason && <span className="text-xs text-accent">{errors.reason.message}</span>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent" disabled={dispute.isPending}>
            Abrir disputa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/components/DisputeDialog.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/contracts/components/DisputeDialog.tsx frontend/src/features/contracts/components/DisputeDialog.test.tsx
git commit -m "style(contracts): restiliza DisputeDialog usando Modal da fase 1"
```
