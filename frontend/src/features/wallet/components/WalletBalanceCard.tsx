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
