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
