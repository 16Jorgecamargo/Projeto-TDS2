# Fase F — Composição Final de `ContractDetailPage` + Verificação Visual

Ver `plan_index.md` para Global Constraints. Depende de todas as fases anteriores (A-E) estarem completas — esta fase reúne `ContractProgress`/`ProgressUpdateForm` (Fase B), `PaymentDialog` (Fase C), `ReviewForm` (Fase D) e o botão de Chat numa única página.

### Task 12: Compor `ContractDetailPage` com progresso, pagamento, avaliação, chat e disputa

**Files:**
- Modify: `frontend/src/features/contracts/pages/ContractDetailPage.tsx`
- Test: `frontend/src/features/contracts/pages/ContractDetailPage.test.tsx` (novo)

**Interfaces:**
- Consumes: `useContract`, `useContractProgress`, `useAddProgress`, `useStartContract`, `useCompleteContract`, `usePayment` (todos de `../queries`, já existem das Fases B/C). `useCreateRoom` de `../../chat/queries` (`{ participantId: string; contractId?: string | null } => Promise<{ id: string; ... }>`, já existe). `useAuthStore` (`AuthUser = { id: string; role: Role }`). `ContractProgress`/`ProgressUpdateForm`/`DisputeDialog` (Fase B), `PaymentDialog` (Fase C), `ReviewForm` (Fase D). `Badge`/`Button`/`Skeleton` de `components/ui/`. `formatCurrency`/`formatDate` de `lib/utils.ts`. `XCircleIcon` de `@heroicons/react/24/solid`.
- Produces: nenhuma mudança de interface pública — mesma página, montada na mesma rota `/contracts/:id` (já cadastrada em `router/index.tsx`, sem mudança de roteamento).

**Regras de exibição (todas condicionadas ao papel do usuário logado e ao estado do contrato):**
- "Iniciar contrato": só o profissional dono do contrato (`user.id === contract.professionalUserId && user.role === 'professional'`), quando `status === 'active' && startedAt === null`.
- "Concluir contrato" + `ProgressUpdateForm`: mesma condição de dono profissional, quando `status === 'active' && startedAt !== null`.
- "Pagar" (abre `PaymentDialog`): só cliente (`user.role === 'client'`), quando o contrato não está `cancelled`/`disputed` e não há pagamento `captured` ainda (`usePayment` retornando `null` ou status diferente de `captured`).
- `ReviewForm`: quando `status === 'completed'`, pra qualquer uma das partes — some da tela assim que `onDone` é chamado (sucesso ou 409, ambos tratados dentro do próprio `ReviewForm` da Fase D).
- "Chat": sempre visível; `participantId` é `contract.professionalUserId` quando quem vê é o cliente, ou `contract.clientId` quando quem vê é o profissional.
- "Abrir disputa": sempre visível (comportamento já existente, sem mudança).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/contracts/pages/ContractDetailPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import ContractDetailPage from './ContractDetailPage';
import {
  useContract,
  useContractProgress,
  useAddProgress,
  useStartContract,
  useCompleteContract,
  usePayment,
} from '../queries';
import { useCreateRoom } from '../../chat/queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'c1' }), useNavigate: () => navigateMock };
});
vi.mock('../queries', () => ({
  useContract: vi.fn(),
  useContractProgress: vi.fn(),
  useAddProgress: vi.fn(),
  useStartContract: vi.fn(),
  useCompleteContract: vi.fn(),
  usePayment: vi.fn(),
}));
vi.mock('../../chat/queries', () => ({ useCreateRoom: vi.fn() }));
vi.mock('../components/ContractProgress', () => ({ ContractProgress: () => <div>contract-progress</div> }));
vi.mock('../components/ProgressUpdateForm', () => ({ ProgressUpdateForm: () => <div>progress-update-form</div> }));
vi.mock('../components/DisputeDialog', () => ({ DisputeDialog: () => <div>dispute-dialog</div> }));
vi.mock('../components/PaymentDialog', () => ({
  PaymentDialog: ({ total }: { total: number }) => <div>payment-dialog-{total}</div>,
}));
vi.mock('../../reviews/components/ReviewForm', () => ({
  ReviewForm: ({ onDone }: { onDone: () => void }) => (
    <button type="button" onClick={onDone}>
      review-form-done
    </button>
  ),
}));

const navigateMock = vi.fn();

function contractFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'c1', demandId: 'd1', quoteId: 'q1', clientId: 'client-user-1', professionalId: 'profile-1',
    total: 300, status: 'active', cancelledBy: null, cancellationReason: null,
    startedAt: null, completedAt: null, cancelledAt: null, schedule: null,
    clientName: 'Maria Cliente', professionalHeadline: 'Eletricista Residencial', professionalUserId: 'pro-user-1',
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContractDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    vi.mocked(useContractProgress).mockReturnValue({ data: [] } as never);
    vi.mocked(useAddProgress).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useStartContract).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCompleteContract).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(usePayment).mockReturnValue({ data: null } as never);
    vi.mocked(useCreateRoom).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('profissional dono do contrato ativo e nao iniciado ve botao de iniciar', () => {
    useAuthStore.getState().setAuth({ id: 'pro-user-1', role: 'professional' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.getByRole('button', { name: 'Iniciar contrato' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir contrato' })).not.toBeInTheDocument();
  });

  it('clica em iniciar contrato chama a mutation', async () => {
    useAuthStore.getState().setAuth({ id: 'pro-user-1', role: 'professional' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);
    const mutate = vi.fn();
    vi.mocked(useStartContract).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractDetailPage />);
    await user.click(screen.getByRole('button', { name: 'Iniciar contrato' }));

    expect(mutate).toHaveBeenCalled();
  });

  it('profissional dono do contrato ativo e ja iniciado ve formulario de progresso e botao de concluir', () => {
    useAuthStore.getState().setAuth({ id: 'pro-user-1', role: 'professional' }, 'token');
    vi.mocked(useContract).mockReturnValue({
      data: contractFixture({ startedAt: '2026-07-01T00:00:00Z' }),
      isPending: false,
    } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.getByRole('button', { name: 'Concluir contrato' })).toBeInTheDocument();
    expect(screen.getByText('progress-update-form')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar contrato' })).not.toBeInTheDocument();
  });

  it('cliente ve botao de pagar quando ainda nao ha pagamento capturado', () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.getByRole('button', { name: 'Pagar' })).toBeInTheDocument();
  });

  it('cliente nao ve botao de pagar quando ja existe pagamento capturado', () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);
    vi.mocked(usePayment).mockReturnValue({
      data: {
        id: 'pay1', contractId: 'c1', payerId: 'client-user-1', amount: 300,
        status: 'captured', method: 'wallet', paidAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    renderWithProviders(<ContractDetailPage />);

    expect(screen.queryByRole('button', { name: 'Pagar' })).not.toBeInTheDocument();
  });

  it('abre o dialogo de pagamento com o valor do contrato', async () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractDetailPage />);
    await user.click(screen.getByRole('button', { name: 'Pagar' }));

    expect(screen.getByText('payment-dialog-300')).toBeInTheDocument();
  });

  it('mostra formulario de avaliacao quando o contrato esta concluido, e some apos avaliar', async () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({
      data: contractFixture({
        status: 'completed',
        startedAt: '2026-07-01T00:00:00Z',
        completedAt: '2026-07-02T00:00:00Z',
      }),
      isPending: false,
    } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractDetailPage />);

    expect(screen.getByText('review-form-done')).toBeInTheDocument();
    await user.click(screen.getByText('review-form-done'));
    expect(screen.queryByText('review-form-done')).not.toBeInTheDocument();
  });

  it('cliente conversa com o profissional do contrato via chat', async () => {
    useAuthStore.getState().setAuth({ id: 'client-user-1', role: 'client' }, 'token');
    vi.mocked(useContract).mockReturnValue({ data: contractFixture(), isPending: false } as never);
    const mutate = vi.fn();
    vi.mocked(useCreateRoom).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<ContractDetailPage />);
    await user.click(screen.getByRole('button', { name: 'Chat' }));

    expect(mutate).toHaveBeenCalledWith(
      { participantId: 'pro-user-1', contractId: 'c1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/pages/ContractDetailPage.test.tsx`
Esperado: FAIL — a página atual não conhece `useStartContract`/`usePayment`, não renderiza `PaymentDialog`/`ReviewForm`, e não faz a checagem de dono profissional via `professionalUserId`.

- [ ] **Step 3: Implementar**

Substitua `frontend/src/features/contracts/pages/ContractDetailPage.tsx` inteiro por:
```tsx
import { useState, type JSX } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';
import {
  useContract,
  useContractProgress,
  useAddProgress,
  useStartContract,
  useCompleteContract,
  usePayment,
} from '../queries';
import { useCreateRoom } from '../../chat/queries';
import { useAuthStore } from '../../../stores/auth';
import { ContractProgress } from '../components/ContractProgress';
import { ProgressUpdateForm } from '../components/ProgressUpdateForm';
import { DisputeDialog } from '../components/DisputeDialog';
import { PaymentDialog } from '../components/PaymentDialog';
import { ReviewForm } from '../../reviews/components/ReviewForm';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency, formatDate } from '../../../lib/utils';
import type { ContractStatus } from '../api';

const STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  disputed: 'Em disputa',
};

export default function ContractDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [disputing, setDisputing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const { data: contract, isPending } = useContract(id);
  const { data: updates } = useContractProgress(id);
  const { data: payment } = usePayment(id);
  const addProgress = useAddProgress(id);
  const startContract = useStartContract(id);
  const completeContract = useCompleteContract(id);
  const createRoom = useCreateRoom();

  if (isPending || !contract) {
    return (
      <div className="p-6">
        <Skeleton className="h-24 w-full" aria-label="Carregando contrato" />
      </div>
    );
  }

  const isProfessional = user?.role === 'professional';
  const isClient = user?.role === 'client';
  const isOwnProfessionalContract = isProfessional && user?.id === contract.professionalUserId;

  const canStart = isOwnProfessionalContract && contract.status === 'active' && contract.startedAt === null;
  const canRegisterProgress =
    isOwnProfessionalContract && contract.status === 'active' && contract.startedAt !== null;
  const canPay =
    isClient &&
    contract.status !== 'cancelled' &&
    contract.status !== 'disputed' &&
    (!payment || payment.status !== 'captured');
  const canReview = !reviewDone && contract.status === 'completed' && (isClient || isProfessional);
  const otherPartyName = isProfessional ? contract.clientName : contract.professionalHeadline;

  function handleChat() {
    const participantId = isClient ? contract.professionalUserId : contract.clientId;
    createRoom.mutate(
      { participantId, contractId: contract.id },
      { onSuccess: (room) => navigate(`/chat/${room.id}`) },
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink">{otherPartyName}</h1>
          <p className="text-sm text-muted">{formatCurrency(contract.total)}</p>
        </div>
        <Badge tone={contract.status === 'disputed' ? 'urgent' : 'neutral'}>
          <span className="flex items-center gap-1">
            {contract.status === 'cancelled' && <XCircleIcon className="h-3.5 w-3.5 text-muted" />}
            {STATUS_LABELS[contract.status]}
          </span>
        </Badge>
      </header>

      {contract.schedule && (
        <div className="rounded-lg bg-surface p-3">
          <p className="text-sm font-medium text-ink">{formatDate(contract.schedule.scheduledDate)}</p>
          {contract.schedule.notes && <p className="text-sm text-muted">{contract.schedule.notes}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canStart && (
          <Button onClick={() => startContract.mutate()} disabled={startContract.isPending}>
            Iniciar contrato
          </Button>
        )}
        {canRegisterProgress && (
          <Button onClick={() => completeContract.mutate()} disabled={completeContract.isPending}>
            Concluir contrato
          </Button>
        )}
        {canPay && <Button onClick={() => setPaying(true)}>Pagar</Button>}
        <Button variant="ghost" onClick={handleChat} disabled={createRoom.isPending}>
          Chat
        </Button>
        <Button variant="ghost" onClick={() => setDisputing(true)}>
          Abrir disputa
        </Button>
      </div>

      {canRegisterProgress && (
        <ProgressUpdateForm submitting={addProgress.isPending} onSubmit={(values) => addProgress.mutate(values)} />
      )}

      <h2 className="text-lg font-semibold text-ink">Acompanhamento</h2>
      <ContractProgress updates={updates ?? []} />

      {canReview && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">Avaliar</h2>
          <ReviewForm contractId={contract.id} onDone={() => setReviewDone(true)} />
        </div>
      )}

      {disputing && <DisputeDialog contractId={id} onClose={() => setDisputing(false)} />}
      {paying && <PaymentDialog contractId={id} total={contract.total} onClose={() => setPaying(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/pages/ContractDetailPage.test.tsx`
Esperado: PASS (8/8).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa — confirme que nenhum teste de `ContractListPage`, `DisputeDialog`, `PaymentDialog`, `ReviewForm` ou `WalletPage` das fases anteriores quebrou.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/contracts/pages/ContractDetailPage.tsx frontend/src/features/contracts/pages/ContractDetailPage.test.tsx
git commit -m "feat(contracts): compoe pagina de detalhe com inicio, pagamento, avaliacao e chat"
```

---

### Task 13: Verificação visual via Playwright MCP (feita pelo controller, não delegada a subagent)

Igual ao que foi feito ao final das Fases 2 e 3: o controller (não um subagent) dirige a sessão interativa do Playwright MCP, tirando screenshots reais das telas implementadas nas Tasks 1-12, corrigindo ao vivo qualquer bug real encontrado — não é uma spec de e2e delegada.

**Pré-requisitos antes de começar:**
- Todas as Tasks 1-12 completas e commitadas.
- Backend rodando (porta 3000).
- Frontend dev server rodando (`cd frontend && npm run dev`, porta 5173).
- Pelo menos um usuário `client` e um `professional` com contrato ativo entre eles — se não existir, criar via fluxo real (registrar → publicar demanda → enviar orçamento → aceitar orçamento), reaproveitando os fluxos já verificados nas Fases 2/3.

**Roteiro de verificação (desktop, então repetir os pontos-chave em 375px):**

1. `/contracts` (lista): confirmar cards restilizados, nome da outra parte correto por papel, badges de status.
2. `/contracts/:id` como profissional dono do contrato: clicar "Iniciar contrato", confirmar que o botão some e o formulário de progresso aparece; registrar um progresso; confirmar que aparece na timeline; clicar "Concluir contrato".
3. `/contracts/:id` como cliente do mesmo contrato (login separado ou trocar sessão): confirmar que "Pagar" aparece; abrir o diálogo, escolher um método, confirmar pagamento; confirmar que o botão "Pagar" some depois (payment capturado).
4. Com o contrato `completed`: confirmar que o formulário de avaliação aparece pra ambas as partes; enviar uma avaliação como cliente; confirmar que some da tela.
5. Clicar em "Chat" a partir do contrato, confirmar que abre/cria a sala e navega pra `/chat/:roomId`.
6. Clicar em "Abrir disputa", confirmar que o modal abre e fecha corretamente.
7. `/wallet`: confirmar saldo, gráfico de barras dos últimos 6 meses (mesmo que vazio/zerado), lista de movimentações, diálogo de saque.
8. Testar pelo menos um breakpoint mobile (375px) nas telas acima — mesma prática já validada nas Fases 2 e 3, que encontraram bugs reais só visíveis em mobile (overflow horizontal no `AppShell`, corrigido na Fase 3).

**Se qualquer bug real for encontrado** (não apenas um Minor cosmético já esperado): corrigir ao vivo, rodar a suíte de testes afetada, e commitar a correção com uma mensagem clara (ex.: `fix(contracts): <descrição do bug encontrado na verificação visual>`), no mesmo padrão usado nas Fases 2 e 3.

**Ao final:**
- [ ] Rodar a suíte completa do frontend uma última vez: `cd frontend && npx vitest run`
- [ ] Rodar typecheck e lint: `cd frontend && npx tsc --noEmit && npx eslint src --max-warnings 0`
- [ ] Rodar os testes de integração do backend afetados: `cd backend && npx vitest run src/modules/contract src/modules/payment src/modules/review`
- [ ] Atualizar `.superpowers/sdd/progress-phase4.md` marcando a Fase 4 como completa, incluindo o commit HEAD final.
