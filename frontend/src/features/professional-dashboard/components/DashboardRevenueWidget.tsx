import { useState, type JSX } from 'react';
import { useWallet, useTransactions, useWithdrawals } from '../../wallet/queries';
import { WithdrawDialog } from '../../wallet/components/WithdrawDialog';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../lib/utils';

function isCurrentMonth(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

export function DashboardRevenueWidget(): JSX.Element {
  const [isWithdrawOpen, setWithdrawOpen] = useState(false);
  const { data: wallet, isPending: isWalletPending } = useWallet();
  const { data: transactions, isPending: isTransactionsPending } = useTransactions(1);
  const { data: withdrawals, isPending: isWithdrawalsPending } = useWithdrawals();

  const isPending = isWalletPending || isTransactionsPending || isWithdrawalsPending;

  const monthlyRevenue = (transactions?.items ?? [])
    .filter((transaction) => transaction.type === 'credit' && isCurrentMonth(transaction.createdAt))
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const withdrawnRevenue = (withdrawals ?? [])
    .filter((withdrawal) => withdrawal.status !== 'failed')
    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Receita</h2>
        <Button size="sm" onClick={() => setWithdrawOpen(true)}>
          Sacar
        </Button>
      </div>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando receita" />
      ) : (
        <div className="rounded-lg bg-surface p-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 3xl:grid-cols-4">
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
            <div>
              <p className="text-2xl font-bold text-ink">{formatCurrency(withdrawnRevenue)}</p>
              <p className="text-xs text-muted">Receita sacada</p>
            </div>
          </div>
        </div>
      )}
      {isWithdrawOpen && <WithdrawDialog onClose={() => setWithdrawOpen(false)} />}
    </Card>
  );
}
