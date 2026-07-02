import type { WalletTransaction } from '../api';

interface TransactionListProps {
  transactions: WalletTransaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-gray-400">Nenhuma movimentação ainda.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{tx.description ?? tx.type}</p>
            <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
            {tx.type === 'credit' ? '+' : '-'}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
