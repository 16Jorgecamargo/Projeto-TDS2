interface WalletBalanceCardProps {
  balance: number;
  pendingBalance: number;
  currency: string;
}

export function WalletBalanceCard({ balance, pendingBalance, currency }: WalletBalanceCardProps) {
  const format = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-sm text-gray-500">Saldo disponível</p>
      <p className="text-3xl font-semibold text-gray-900">{format(balance)}</p>
      <p className="mt-2 text-sm text-gray-400">Pendente: {format(pendingBalance)}</p>
    </div>
  );
}
