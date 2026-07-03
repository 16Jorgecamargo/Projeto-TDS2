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
