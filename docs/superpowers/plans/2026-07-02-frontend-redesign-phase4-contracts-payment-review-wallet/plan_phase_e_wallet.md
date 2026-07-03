# Fase E — Restilização da Carteira + Gráfico de Receita em CSS

Ver `plan_index.md` para Global Constraints. Totalmente independente das Fases B, C e D — não toca em nada de Contratos ou Avaliação.

### Task 10: Restilizar `WalletBalanceCard`, `TransactionList`, `WithdrawDialog` e `WalletPage`

**Files:**
- Modify: `frontend/src/features/wallet/api.ts`
- Modify: `frontend/src/features/wallet/queries.ts`
- Modify: `frontend/src/features/wallet/components/WalletBalanceCard.tsx`
- Modify: `frontend/src/features/wallet/components/TransactionList.tsx`
- Modify: `frontend/src/features/wallet/components/WithdrawDialog.tsx`
- Modify: `frontend/src/features/wallet/pages/WalletPage.tsx`
- Test: `frontend/src/features/wallet/wallet.test.tsx` (não deve precisar de mudança — rode como regressão)
- Test: `frontend/src/features/wallet/components/WalletBalanceCard.test.tsx` (novo)
- Test: `frontend/src/features/wallet/components/TransactionList.test.tsx` (novo)

**Interfaces:**
- Consumes: `Card`, `Button`, `Modal`, `Skeleton`, `EmptyState` de `components/ui/`. `formatCurrency`/`formatDate` de `lib/utils.ts`.
- Produces: `WalletBalanceCardProps` muda de `{ balance, pendingBalance, currency }` para `{ balance: number; pendingBalance: number }` (o campo `currency` é removido — o app inteiro já usa `formatCurrency`, fixo em BRL, então o parâmetro nunca variava de verdade). `fetchTransactions(page: number, limit?: number)` e `useTransactions(page: number, limit?: number)` ganham o parâmetro `limit` (default `20`, preservando o comportamento atual de quem já chama `useTransactions(1)`); `walletKeys.transactions` passa a incluir `limit` na key, pra não colidir com a chamada de `limit: 100` que a Task 11 vai adicionar (mesma disciplina de cache já usada desde a Fase 2 com `favoriteKeys`).

- [ ] **Step 1: Rodar o teste existente de `WalletPage` ANTES da mudança (baseline)**

Rode: `cd frontend && npx vitest run src/features/wallet/wallet.test.tsx`
Esperado: PASS (1/1) — baseline verde.

- [ ] **Step 2: Adicionar o parâmetro `limit` em `frontend/src/features/wallet/api.ts`**

Troque a função `fetchTransactions` (mantendo o resto do arquivo intacto):
```ts
export async function fetchTransactions(page: number, limit = 20): Promise<Paginated<WalletTransaction>> {
  const { data } = await http.get<Paginated<WalletTransaction>>('/wallet/transactions', {
    params: { page, limit },
  });
  return data;
}
```

- [ ] **Step 3: Adicionar o parâmetro `limit` em `frontend/src/features/wallet/queries.ts`**

Troque `walletKeys` e `useTransactions` (mantendo o resto do arquivo intacto):
```ts
export const walletKeys = {
  wallet: ['wallet'] as const,
  transactions: (page: number, limit: number) => ['wallet', 'transactions', page, limit] as const,
  withdrawals: ['wallet', 'withdrawals'] as const,
};

export function useTransactions(page: number, limit = 20) {
  return useQuery({
    queryKey: walletKeys.transactions(page, limit),
    queryFn: () => fetchTransactions(page, limit),
  });
}
```

- [ ] **Step 4: Rodar o teste existente de `WalletPage` DEPOIS da mudança de `limit`**

Rode: `cd frontend && npx vitest run src/features/wallet/wallet.test.tsx`
Esperado: PASS (1/1) — o mock de `useTransactions` no teste não depende dos argumentos recebidos, então continua passando.

- [ ] **Step 5: Escrever o teste falho de `WalletBalanceCard`**

Crie `frontend/src/features/wallet/components/WalletBalanceCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletBalanceCard } from './WalletBalanceCard';

describe('WalletBalanceCard', () => {
  it('mostra saldo disponivel e pendente formatados em reais', () => {
    render(<WalletBalanceCard balance={270} pendingBalance={30} />);

    expect(screen.getByText('R$ 270,00')).toBeInTheDocument();
    expect(screen.getByText('Pendente: R$ 30,00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/wallet/components/WalletBalanceCard.test.tsx`
Esperado: FAIL — o componente atual exige a prop `currency` (TypeScript) e usa `Intl.NumberFormat` local em vez de `formatCurrency`, então o texto exato não bate.

- [ ] **Step 7: Restilizar `WalletBalanceCard.tsx`**

Substitua o arquivo inteiro por:
```tsx
import type { JSX } from 'react';
import { Card } from '../../../components/ui/Card';
import { formatCurrency } from '../../../lib/utils';

interface WalletBalanceCardProps {
  balance: number;
  pendingBalance: number;
}

export function WalletBalanceCard({ balance, pendingBalance }: WalletBalanceCardProps): JSX.Element {
  return (
    <Card>
      <p className="text-sm text-muted">Saldo disponível</p>
      <p className="text-3xl font-bold text-ink">{formatCurrency(balance)}</p>
      <p className="mt-2 text-sm text-muted">Pendente: {formatCurrency(pendingBalance)}</p>
    </Card>
  );
}
```

- [ ] **Step 8: Rodar teste de `WalletBalanceCard` para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/wallet/components/WalletBalanceCard.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 9: Escrever o teste falho de `TransactionList`**

Crie `frontend/src/features/wallet/components/TransactionList.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionList } from './TransactionList';

describe('TransactionList', () => {
  it('mostra estado vazio quando nao ha transacoes', () => {
    render(<TransactionList transactions={[]} />);
    expect(screen.getByText('Nenhuma movimentação ainda')).toBeInTheDocument();
  });

  it('lista transacoes com sinal e cor conforme o tipo', () => {
    render(
      <TransactionList
        transactions={[
          {
            id: 't1', walletId: 'w1', type: 'credit', amount: 270, balanceAfter: 270,
            referenceType: 'payment', referenceId: null, description: 'Recebimento de contrato',
            createdAt: '2026-07-01T12:00:00Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Recebimento de contrato')).toBeInTheDocument();
    expect(screen.getByText('+R$ 270,00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/wallet/components/TransactionList.test.tsx`
Esperado: FAIL — o componente atual não usa `EmptyState` (texto "Nenhuma movimentação ainda" já existe hoje mas sem o markup do token) e formata valor com `Intl.NumberFormat` local em vez de `formatCurrency`.

- [ ] **Step 11: Restilizar `TransactionList.tsx`**

Substitua o arquivo inteiro por:
```tsx
import type { JSX } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../../../lib/utils';
import type { WalletTransaction } from '../api';

interface TransactionListProps {
  transactions: WalletTransaction[];
}

const TYPE_LABELS: Record<WalletTransaction['type'], string> = {
  credit: 'Crédito',
  debit: 'Débito',
  hold: 'Retenção',
  release: 'Liberação',
};

export function TransactionList({ transactions }: TransactionListProps): JSX.Element {
  if (transactions.length === 0) {
    return <EmptyState title="Nenhuma movimentação ainda" />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between rounded-lg bg-surface p-3">
          <div>
            <p className="text-sm font-medium text-ink">{tx.description ?? TYPE_LABELS[tx.type]}</p>
            <p className="text-xs text-muted">{formatDate(tx.createdAt)}</p>
          </div>
          <span className={tx.type === 'credit' ? 'text-accent' : 'text-ink'}>
            {tx.type === 'credit' ? '+' : '-'}
            {formatCurrency(tx.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 12: Rodar teste de `TransactionList` para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/wallet/components/TransactionList.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 13: Restilizar `WithdrawDialog.tsx`**

Substitua o arquivo inteiro por:
```tsx
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withdrawFormSchema, type WithdrawFormInput } from '../schemas';
import { useRequestWithdrawal } from '../queries';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface WithdrawDialogProps {
  onClose: () => void;
}

export function WithdrawDialog({ onClose }: WithdrawDialogProps): JSX.Element {
  const { register, handleSubmit, formState } = useForm<WithdrawFormInput>({
    resolver: zodResolver(withdrawFormSchema),
    defaultValues: { amount: 0, paymentMethod: 'pix', destination: '' },
  });
  const mutation = useRequestWithdrawal();

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, { onSuccess: onClose });
  });

  return (
    <Modal open onClose={onClose} title="Solicitar saque">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="withdraw-amount" className="flex flex-col gap-1">
          <span className="text-sm text-muted">Valor</span>
          <input
            id="withdraw-amount"
            type="number"
            step="0.01"
            {...register('amount')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        {formState.errors.amount && (
          <span className="text-xs text-accent">{formState.errors.amount.message}</span>
        )}
        <label htmlFor="withdraw-method" className="flex flex-col gap-1">
          <span className="text-sm text-muted">Método</span>
          <select
            id="withdraw-method"
            {...register('paymentMethod')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          >
            <option value="pix">PIX</option>
            <option value="bank_transfer">Transferência bancária</option>
          </select>
        </label>
        <label htmlFor="withdraw-destination" className="flex flex-col gap-1">
          <span className="text-sm text-muted">Destino</span>
          <input
            id="withdraw-destination"
            {...register('destination')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        {formState.errors.destination && (
          <span className="text-xs text-accent">{formState.errors.destination.message}</span>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            Confirmar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 14: Restilizar `WalletPage.tsx`**

Substitua o arquivo inteiro por:
```tsx
import { useState, type JSX } from 'react';
import { useWallet, useTransactions } from '../queries';
import { WalletBalanceCard } from '../components/WalletBalanceCard';
import { TransactionList } from '../components/TransactionList';
import { WithdrawDialog } from '../components/WithdrawDialog';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function WalletPage(): JSX.Element {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const wallet = useWallet();
  const transactions = useTransactions(1);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Carteira</h1>
        <Button onClick={() => setShowWithdraw(true)}>Sacar</Button>
      </div>
      {wallet.isPending || !wallet.data ? (
        <Skeleton className="h-24 w-full" aria-label="Carregando carteira" />
      ) : (
        <WalletBalanceCard balance={wallet.data.balance} pendingBalance={wallet.data.pendingBalance} />
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Movimentações</h2>
        {transactions.isPending ? (
          <Skeleton className="h-24 w-full" aria-label="Carregando movimentações" />
        ) : (
          <TransactionList transactions={transactions.data?.items ?? []} />
        )}
      </section>
      {showWithdraw && <WithdrawDialog onClose={() => setShowWithdraw(false)} />}
    </div>
  );
}
```

- [ ] **Step 15: Rodar o teste existente de `WalletPage` (regressão final)**

Rode: `cd frontend && npx vitest run src/features/wallet/wallet.test.tsx`
Esperado: PASS (1/1) — o mock de dados usa `balance: 270`, que `formatCurrency` renderiza como `"R$ 270,00"`, e o teste original usa `screen.getAllByText(/270/)` (regex, ainda bate). Se falhar, leia a mensagem de erro exata antes de decidir o que ajustar — não mude a asserção do teste sem entender a causa raiz.

- [ ] **Step 16: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 17: Commit**

```bash
git add frontend/src/features/wallet/api.ts frontend/src/features/wallet/queries.ts frontend/src/features/wallet/components/WalletBalanceCard.tsx frontend/src/features/wallet/components/TransactionList.tsx frontend/src/features/wallet/components/WithdrawDialog.tsx frontend/src/features/wallet/pages/WalletPage.tsx frontend/src/features/wallet/components/WalletBalanceCard.test.tsx frontend/src/features/wallet/components/TransactionList.test.tsx
git commit -m "style(wallet): restiliza carteira com tokens da fase 1 e adiciona limit as transacoes"
```

---

### Task 11: `WalletRevenueChart` (gráfico de barras em CSS puro)

**Files:**
- Create: `frontend/src/features/wallet/components/WalletRevenueChart.tsx`
- Modify: `frontend/src/features/wallet/pages/WalletPage.tsx`
- Test: `frontend/src/features/wallet/components/WalletRevenueChart.test.tsx`

**Interfaces:**
- Consumes: `useTransactions(page, limit)` (Task 10, já aceita `limit`). `Card`/`Skeleton` de `components/ui/`. `formatCurrency` de `lib/utils.ts`.
- Produces: `WalletRevenueChart` sem props, renderizado dentro de `WalletPage` logo abaixo de `WalletBalanceCard`.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/wallet/components/WalletRevenueChart.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletRevenueChart } from './WalletRevenueChart';
import { useTransactions } from '../queries';

vi.mock('../queries', () => ({ useTransactions: vi.fn() }));

describe('WalletRevenueChart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca transacoes com limite de 100 para montar o grafico', () => {
    vi.mocked(useTransactions).mockReturnValue({
      data: { items: [], page: 1, limit: 100, total: 0 },
      isPending: false,
    } as never);

    render(<WalletRevenueChart />);

    expect(useTransactions).toHaveBeenCalledWith(1, 100);
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useTransactions).mockReturnValue({ data: undefined, isPending: true } as never);

    render(<WalletRevenueChart />);

    expect(screen.getByRole('status', { name: 'Carregando gráfico de receita' })).toBeInTheDocument();
  });

  it('soma creditos do mes corrente na barra, ignorando debitos', () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15)).toISOString();
    vi.mocked(useTransactions).mockReturnValue({
      data: {
        items: [
          {
            id: 't1', walletId: 'w1', type: 'credit', amount: 200, balanceAfter: 200,
            referenceType: 'payment', referenceId: null, description: null, createdAt: thisMonth,
          },
          {
            id: 't2', walletId: 'w1', type: 'debit', amount: 50, balanceAfter: 150,
            referenceType: 'withdrawal', referenceId: null, description: null, createdAt: thisMonth,
          },
        ],
        page: 1, limit: 100, total: 2,
      },
      isPending: false,
    } as never);

    render(<WalletRevenueChart />);

    expect(screen.getByTitle('R$ 200,00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/wallet/components/WalletRevenueChart.test.tsx`
Esperado: FAIL com "Cannot find module './WalletRevenueChart'".

- [ ] **Step 3: Implementar**

Crie `frontend/src/features/wallet/components/WalletRevenueChart.tsx`:
```tsx
import type { JSX } from 'react';
import { useTransactions } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../lib/utils';

const MONTH_COUNT = 6;
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function buildLastMonths(count: number): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: monthKey(date), label: monthFormatter.format(date) });
  }
  return months;
}

export function WalletRevenueChart(): JSX.Element {
  const { data, isPending } = useTransactions(1, 100);

  const months = buildLastMonths(MONTH_COUNT);
  const totals = new Map<string, number>(months.map((month) => [month.key, 0]));

  for (const tx of data?.items ?? []) {
    if (tx.type !== 'credit') continue;
    const key = monthKey(new Date(tx.createdAt));
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + tx.amount);
    }
  }

  const maxValue = Math.max(1, ...Array.from(totals.values()));

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Receita nos últimos 6 meses</h2>
      {isPending ? (
        <Skeleton className="h-40 w-full" aria-label="Carregando gráfico de receita" />
      ) : (
        <div className="flex items-end gap-3">
          {months.map((month) => {
            const value = totals.get(month.key) ?? 0;
            const heightPercent = (value / maxValue) * 100;
            return (
              <div key={month.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t-sm bg-primary"
                    style={{ height: `${heightPercent}%` }}
                    title={formatCurrency(value)}
                  />
                </div>
                <span className="text-xs capitalize text-muted">{month.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/wallet/components/WalletRevenueChart.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Compor `WalletRevenueChart` dentro de `WalletPage`**

Em `frontend/src/features/wallet/pages/WalletPage.tsx`, adicione o import:
```ts
import { WalletRevenueChart } from '../components/WalletRevenueChart';
```

E adicione `<WalletRevenueChart />` logo depois do bloco de `WalletBalanceCard`/`Skeleton` de saldo, antes da seção `Movimentações`:
```tsx
      {wallet.isPending || !wallet.data ? (
        <Skeleton className="h-24 w-full" aria-label="Carregando carteira" />
      ) : (
        <WalletBalanceCard balance={wallet.data.balance} pendingBalance={wallet.data.pendingBalance} />
      )}
      <WalletRevenueChart />
      <section className="flex flex-col gap-3">
```

- [ ] **Step 6: Rodar o teste existente de `WalletPage` (regressão)**

Rode: `cd frontend && npx vitest run src/features/wallet/wallet.test.tsx`
Esperado: PASS — o mock de `useTransactions` no teste de `WalletPage` não distingue por argumentos, então `WalletRevenueChart` (que também chama `useTransactions`, mas com `(1, 100)`) recebe o mesmo mock de retorno. Se o teste quebrar por causa disso, adicione ao mock existente `useTransactions: vi.fn(() => ({...}))` os dados de `items: []` (suficiente pra não quebrar o gráfico) sem alterar as asserções do teste original.

- [ ] **Step 7: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/wallet/components/WalletRevenueChart.tsx frontend/src/features/wallet/components/WalletRevenueChart.test.tsx frontend/src/features/wallet/pages/WalletPage.tsx
git commit -m "feat(wallet): adiciona grafico de receita dos ultimos 6 meses em css puro"
```
