import { useState } from 'react';
import { useWallet, useTransactions } from '../queries';
import { WalletBalanceCard } from '../components/WalletBalanceCard';
import { TransactionList } from '../components/TransactionList';
import { WithdrawDialog } from '../components/WithdrawDialog';

export default function WalletPage() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const wallet = useWallet();
  const transactions = useTransactions(1);

  if (wallet.isLoading || !wallet.data) {
    return <p className="p-6 text-gray-500">Carregando carteira...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Carteira</h1>
        <button onClick={() => setShowWithdraw(true)} className="rounded bg-blue-600 px-4 py-2 text-white">
          Sacar
        </button>
      </div>
      <WalletBalanceCard
        balance={wallet.data.balance}
        pendingBalance={wallet.data.pendingBalance}
        currency={wallet.data.currency}
      />
      <section>
        <h2 className="mb-2 text-lg font-medium">Movimentações</h2>
        <TransactionList transactions={transactions.data?.items ?? []} />
      </section>
      {showWithdraw && <WithdrawDialog onClose={() => setShowWithdraw(false)} />}
    </div>
  );
}
