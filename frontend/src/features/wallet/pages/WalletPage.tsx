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
