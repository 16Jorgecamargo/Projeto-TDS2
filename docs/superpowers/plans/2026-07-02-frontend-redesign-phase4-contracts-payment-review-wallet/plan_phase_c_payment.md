# Fase C — Pagamento (Novo)

Ver `plan_index.md` para Global Constraints. Depende só da Fase A (Task 1) e da Task 2 (tipo `Contract` já tem os campos novos). Independente das Fases D e E.

### Task 6: Camada de dados de pagamento (`usePayment`, `usePayContract`)

**Files:**
- Modify: `frontend/src/features/contracts/api.ts`
- Modify: `frontend/src/features/contracts/queries.ts`
- Test: `frontend/src/features/contracts/api.test.ts` (adicionar casos)
- Test: `frontend/src/features/contracts/queries.test.tsx` (adicionar casos)

**Interfaces:**
- Consumes: `http` de `frontend/src/lib/http.ts` (instância `axios`, erros são `AxiosError` com `.response?.status`).
- Produces: `PaymentMethod = 'wallet' | 'credit_card' | 'pix' | 'boleto'`, `Payment` (tipo), `fetchPayment(contractId: string): Promise<Payment | null>` (retorna `null` quando o contrato ainda não foi pago, em vez de propagar o 404), `payContract(contractId: string, method: PaymentMethod): Promise<Payment>`, `usePayment(contractId: string)`, `usePayContract(contractId: string)`. A Task 7 (PaymentDialog) consome esses 2 hooks.

- [ ] **Step 1: Escrever os testes falhos da API**

Em `frontend/src/features/contracts/api.test.ts`, adicione ao final do arquivo (mantendo o teste de `startContract` já existente):
```ts
import { fetchPayment, payContract } from './api';

describe('fetchPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna o pagamento quando existe', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        id: 'pay1', contractId: 'c1', payerId: 'u1', amount: 300,
        status: 'captured', method: 'wallet', paidAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await fetchPayment('c1');

    expect(http.get).toHaveBeenCalledWith('/contracts/c1/payment');
    expect(result?.status).toBe('captured');
  });

  it('retorna null quando o contrato ainda nao foi pago (404)', async () => {
    const AxiosErrorLike = { isAxiosError: true, response: { status: 404 } };
    vi.mocked(http.get).mockRejectedValue(AxiosErrorLike);

    const result = await fetchPayment('c1');

    expect(result).toBeNull();
  });

  it('propaga erros diferentes de 404', async () => {
    const AxiosErrorLike = { isAxiosError: true, response: { status: 500 } };
    vi.mocked(http.get).mockRejectedValue(AxiosErrorLike);

    await expect(fetchPayment('c1')).rejects.toEqual(AxiosErrorLike);
  });
});

describe('payContract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('paga o contrato com o metodo informado', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: {
        id: 'pay1', contractId: 'c1', payerId: 'u1', amount: 300,
        status: 'captured', method: 'pix', paidAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
      },
    } as never);

    const result = await payContract('c1', 'pix');

    expect(http.post).toHaveBeenCalledWith('/contracts/c1/payment', { method: 'pix' });
    expect(result.method).toBe('pix');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/api.test.ts`
Esperado: FAIL — `fetchPayment`/`payContract` ainda não existem em `api.ts`.

- [ ] **Step 3: Adicionar os tipos e funções em `frontend/src/features/contracts/api.ts`**

Adicione o import de `axios` no topo do arquivo (`isAxiosError` é usado no Step abaixo):
```ts
import axios from 'axios';
```

Adicione, logo após a interface `ProgressUpdate` e antes de `fetchContracts`:
```ts
export type PaymentMethod = 'wallet' | 'credit_card' | 'pix' | 'boleto';
export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  contractId: string;
  payerId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  paidAt: string | null;
  createdAt: string;
}
```

Adicione ao final do arquivo, depois de `openDispute`:
```ts
export async function fetchPayment(contractId: string): Promise<Payment | null> {
  try {
    const { data } = await http.get<Payment>(`/contracts/${contractId}/payment`);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function payContract(contractId: string, method: PaymentMethod): Promise<Payment> {
  const { data } = await http.post<Payment>(`/contracts/${contractId}/payment`, { method });
  return data;
}
```

- [ ] **Step 4: Rodar teste da API para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/api.test.ts`
Esperado: PASS (todos os testes do arquivo, incluindo `startContract` da Task 2 e os 4 novos).

- [ ] **Step 5: Escrever os testes falhos dos hooks**

Em `frontend/src/features/contracts/queries.test.tsx`, atualize o mock de `./api` (topo do arquivo) pra incluir as 2 funções novas, e adicione os testes:
```tsx
vi.mock('./api', () => ({
  fetchContracts: vi.fn(),
  fetchContract: vi.fn(),
  fetchProgress: vi.fn(),
  addProgress: vi.fn(),
  startContract: vi.fn(),
  completeContract: vi.fn(),
  openDispute: vi.fn(),
  fetchPayment: vi.fn(),
  payContract: vi.fn(),
}));
```

Adicione ao final do arquivo (mantendo o `describe('useStartContract', ...)` já existente):
```tsx
import { fetchPayment, payContract } from './api';
import { usePayment, usePayContract } from './queries';

describe('usePayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca o pagamento do contrato informado', async () => {
    vi.mocked(fetchPayment).mockResolvedValue(null);

    const { result } = renderHook(() => usePayment('c1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPayment).toHaveBeenCalledWith('c1');
    expect(result.current.data).toBeNull();
  });
});

describe('usePayContract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('paga o contrato com o metodo informado', async () => {
    vi.mocked(payContract).mockResolvedValue({
      id: 'pay1', contractId: 'c1', payerId: 'u1', amount: 300,
      status: 'captured', method: 'wallet', paidAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
    });

    const { result } = renderHook(() => usePayContract('c1'), { wrapper });
    result.current.mutate('wallet');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(payContract).toHaveBeenCalledWith('c1', 'wallet');
  });
});
```

- [ ] **Step 6: Rodar teste dos hooks para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/queries.test.tsx`
Esperado: FAIL — `usePayment`/`usePayContract` ainda não existem em `queries.ts`.

- [ ] **Step 7: Adicionar os hooks em `frontend/src/features/contracts/queries.ts`**

Atualize o import do topo do arquivo pra incluir as 2 funções novas e o tipo `PaymentMethod`:
```ts
import {
  fetchContracts,
  fetchContract,
  fetchProgress,
  addProgress,
  startContract,
  completeContract,
  openDispute,
  fetchPayment,
  payContract,
  type PaymentMethod,
} from './api';
```

Adicione ao objeto `contractKeys` a chave de pagamento:
```ts
export const contractKeys = {
  all: ['contracts'] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
  progress: (id: string) => ['contracts', id, 'progress'] as const,
  payment: (id: string) => ['contracts', id, 'payment'] as const,
};
```

Adicione ao final do arquivo:
```ts
export function usePayment(contractId: string) {
  return useQuery({
    queryKey: contractKeys.payment(contractId),
    queryFn: () => fetchPayment(contractId),
    enabled: !!contractId,
  });
}

export function usePayContract(contractId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (method: PaymentMethod) => payContract(contractId, method),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: contractKeys.payment(contractId) });
      client.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
    },
  });
}
```

- [ ] **Step 8: Rodar teste dos hooks para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/queries.test.tsx`
Esperado: PASS (todos os testes do arquivo).

- [ ] **Step 9: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/features/contracts/api.ts frontend/src/features/contracts/queries.ts frontend/src/features/contracts/api.test.ts frontend/src/features/contracts/queries.test.tsx
git commit -m "feat(contracts): adiciona camada de dados de pagamento"
```

---

### Task 7: `PaymentDialog`

**Files:**
- Create: `frontend/src/features/contracts/components/PaymentDialog.tsx`
- Test: `frontend/src/features/contracts/components/PaymentDialog.test.tsx`

**Interfaces:**
- Consumes: `useWallet()` de `frontend/src/features/wallet/queries.ts` (`Wallet = { id, userId, balance: number, pendingBalance: number, currency: string, createdAt, updatedAt }`, já existe, sem mudança). `usePayContract(contractId)` (Task 6). `Modal`/`Button` de `components/ui/`. `formatCurrency` de `lib/utils.ts`. `PaymentMethod` de `../api`.
- Produces: `PaymentDialog` com props `{ contractId: string; total: number; onClose: () => void }`, consumido pela Fase F na composição final de `ContractDetailPage`.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/contracts/components/PaymentDialog.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { PaymentDialog } from './PaymentDialog';
import { useWallet } from '../../wallet/queries';
import { usePayContract } from '../queries';

vi.mock('../../wallet/queries', () => ({ useWallet: vi.fn() }));
vi.mock('../queries', () => ({ usePayContract: vi.fn() }));

function walletFixture(balance: number) {
  return { id: 'w1', userId: 'u1', balance, pendingBalance: 0, currency: 'BRL', createdAt: '', updatedAt: '' };
}

describe('PaymentDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('confirma pagamento com o metodo selecionado', async () => {
    vi.mocked(useWallet).mockReturnValue({ data: walletFixture(500) } as never);
    const mutate = vi.fn((_method, opts) => opts?.onSuccess?.());
    vi.mocked(usePayContract).mockReturnValue({ mutate, isPending: false, isError: false } as never);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<PaymentDialog contractId="c1" total={300} onClose={onClose} />);

    await user.click(screen.getByLabelText('Pix'));
    await user.click(screen.getByRole('button', { name: 'Confirmar pagamento' }));

    expect(mutate).toHaveBeenCalledWith('pix', expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(onClose).toHaveBeenCalled();
  });

  it('desabilita confirmacao quando o saldo da carteira e insuficiente pro metodo carteira', () => {
    vi.mocked(useWallet).mockReturnValue({ data: walletFixture(100) } as never);
    vi.mocked(usePayContract).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);

    renderWithProviders(<PaymentDialog contractId="c1" total={300} onClose={vi.fn()} />);

    expect(screen.getByText('Saldo da carteira insuficiente para pagar com este método.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar pagamento' })).toBeDisabled();
  });

  it('nao bloqueia metodo externo mesmo com saldo insuficiente na carteira', async () => {
    vi.mocked(useWallet).mockReturnValue({ data: walletFixture(100) } as never);
    vi.mocked(usePayContract).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);
    const user = userEvent.setup();

    renderWithProviders(<PaymentDialog contractId="c1" total={300} onClose={vi.fn()} />);

    await user.click(screen.getByLabelText('Boleto'));

    expect(screen.queryByText('Saldo da carteira insuficiente para pagar com este método.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar pagamento' })).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/contracts/components/PaymentDialog.test.tsx`
Esperado: FAIL com "Cannot find module './PaymentDialog'".

- [ ] **Step 3: Implementar**

Crie `frontend/src/features/contracts/components/PaymentDialog.tsx`:
```tsx
import { useState, type JSX } from 'react';
import { useWallet } from '../../wallet/queries';
import { usePayContract } from '../queries';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../../lib/utils';
import type { PaymentMethod } from '../api';

interface PaymentDialogProps {
  contractId: string;
  total: number;
  onClose: () => void;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  wallet: 'Carteira',
  credit_card: 'Cartão de crédito',
  pix: 'Pix',
  boleto: 'Boleto',
};

const METHODS: PaymentMethod[] = ['wallet', 'credit_card', 'pix', 'boleto'];

export function PaymentDialog({ contractId, total, onClose }: PaymentDialogProps): JSX.Element {
  const [method, setMethod] = useState<PaymentMethod>('wallet');
  const { data: wallet } = useWallet();
  const payContract = usePayContract(contractId);

  const insufficientBalance = method === 'wallet' && wallet !== undefined && wallet.balance < total;

  return (
    <Modal open onClose={onClose} title="Pagar contrato">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Valor a pagar: <span className="font-semibold text-ink">{formatCurrency(total)}</span>
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-muted">Método de pagamento</legend>
          {METHODS.map((option) => (
            <label
              key={option}
              htmlFor={`payment-method-${option}`}
              className="flex items-center gap-2 text-sm text-ink"
            >
              <input
                id={`payment-method-${option}`}
                type="radio"
                name="payment-method"
                value={option}
                checked={method === option}
                onChange={() => setMethod(option)}
              />
              {METHOD_LABELS[option]}
            </label>
          ))}
        </fieldset>
        {insufficientBalance && (
          <p className="text-xs text-accent">Saldo da carteira insuficiente para pagar com este método.</p>
        )}
        {payContract.isError && <p className="text-xs text-accent">Não foi possível processar o pagamento.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={payContract.isPending || insufficientBalance}
            onClick={() => payContract.mutate(method, { onSuccess: onClose })}
          >
            Confirmar pagamento
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/contracts/components/PaymentDialog.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/contracts/components/PaymentDialog.tsx frontend/src/features/contracts/components/PaymentDialog.test.tsx
git commit -m "feat(contracts): adiciona PaymentDialog para pagamento de contrato"
```
